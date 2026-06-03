// @ts-check
const { test, expect } = require('@playwright/test');
const { createAuthedPage, gotoApp } = require('./helpers');

test.describe('Здоровье страницы и базовые настройки UI/UX', () => {
  let consoleErrors = [];
  let failedRequests = [];

  test.beforeEach(({ page }) => {
    consoleErrors = [];
    failedRequests = [];

    // Слушаем ошибки в консоли
    page.on('pageerror', (exception) => {
      consoleErrors.push(exception.stack || exception.message);
    });

    page.on('console', (message) => {
      if (message.type() === 'error') {
        const text = message.text();
        // Игнорируем ожидаемую ошибку неавторизованного запроса к /api/me при запуске гостя
        if (!text.includes('chrome-extension') && 
            !text.includes('Authentication required') && 
            !text.includes('401 (Unauthorized)') && 
            !text.includes('status of 401')) {
          consoleErrors.push(text);
        }
      }
    });

    // Слушаем сбойные сетевые запросы к нашему приложению
    page.on('response', (response) => {
      const status = response.status();
      const url = response.url();
      const isApiOrStatic = url.includes('127.0.0.1') || url.includes('localhost') || url.includes('sport.ms-cert.workers.dev');
      
      // Игнорируем статус 401 (Unauthorized) на /api/me — это нормальное поведение при проверке сессии гостя
      if (isApiOrStatic && status >= 400 && status !== 401) {
        failedRequests.push(`${url} [Status: ${status}]`);
      }
    });
  });

  test('Должен загружаться без критических ошибок в консоли и сети', async ({ page }) => {
    await page.goto('/');
    // Даем немного времени на выполнение JS
    await page.waitForTimeout(1000);

    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });

  test('Проверка мета-тегов и заголовка страницы', async ({ page }) => {
    await page.goto('/');

    // Проверяем заголовок
    await expect(page).toHaveTitle(/Habit Tracker/);

    // Проверяем lang
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBeTruthy();

    // Проверяем viewport
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');

    // Проверяем manifest
    const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifest).toBe('/manifest.json');

    // Проверяем icon
    const icon = await page.locator('link[rel="icon"]').getAttribute('href');
    expect(icon).toBe('/icon.svg');
  });

  test('Переключение темы оформления (светлая/темная)', async ({ context, baseURL, isMobile }) => {
    // Авторизуемся, чтобы получить доступ к кнопкам управления темой
    const authed = await createAuthedPage(context, baseURL);
    const page = authed.page;
    await gotoApp(page);

    // Проверяем начальное состояние
    const htmlClassBefore = await page.locator('html').getAttribute('class') || '';
    const initialDark = htmlClassBefore.includes('dark');

    if (!isMobile) {
      // На десктопе используем кнопку в сайдбаре
      const themeToggle = page.locator('#themeToggleSide');
      await expect(themeToggle).toBeVisible();
      await themeToggle.click();

      // Проверяем, что класс изменился
      const htmlClassAfter = await page.locator('html').getAttribute('class') || '';
      expect(htmlClassAfter.includes('dark')).toBe(!initialDark);

      // Проверяем сохранение в localStorage
      const savedTheme = await page.evaluate(() => localStorage.getItem('antigravity-theme'));
      expect(savedTheme).toBe(!initialDark ? 'dark' : 'light');

      // Кликаем еще раз для возврата к исходной теме
      await themeToggle.click();
      const htmlClassFinal = await page.locator('html').getAttribute('class') || '';
      expect(htmlClassFinal.includes('dark')).toBe(initialDark);
    } else {
      // На мобилках переключатель находится во вкладке профиля
      await page.locator('nav.bottom-bar [data-tab="profile"]').click();
      const themeToggle = page.locator('main button.theme-switch');
      await expect(themeToggle).toBeVisible();
      await themeToggle.click();

      const htmlClassAfter = await page.locator('html').getAttribute('class') || '';
      expect(htmlClassAfter.includes('dark')).toBe(!initialDark);

      await themeToggle.click();
    }
  });

  test('Локализация EN/RU: переключение языков', async ({ context, baseURL, isMobile }) => {
    // Авторизуемся для доступа к переключению языков в Profile
    const authed = await createAuthedPage(context, baseURL);
    const page = authed.page;
    await gotoApp(page);

    const navSelector = isMobile ? 'nav.bottom-bar' : 'aside.sidebar';
    await page.locator(`${navSelector} [data-tab="profile"]`).click();

    // Находим кнопки RUS и ENG в Профиле
    const rusBtn = page.locator('main button:has-text("RUS")');
    const engBtn = page.locator('main button:has-text("ENG")');
    await expect(rusBtn).toBeVisible();
    await expect(engBtn).toBeVisible();

    // Переключаем на русский
    await rusBtn.click();
    
    // Проверим, что тексты стали на русском (например, заголовок настроек)
    await expect(page.locator('#view h2')).toContainText(/(Профиль|Настройки)/i);
    
    const savedLangRu = await page.evaluate(() => localStorage.getItem('antigravity-lang'));
    expect(savedLangRu).toBe('ru');

    // Переключаем на английский
    await engBtn.click();
    await expect(page.locator('#view h2')).toContainText(/(Profile|Settings)/i);

    const savedLangEn = await page.evaluate(() => localStorage.getItem('antigravity-lang'));
    expect(savedLangEn).toBe('en');
  });
});
