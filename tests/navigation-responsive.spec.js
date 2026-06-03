// @ts-check
const { test, expect } = require('@playwright/test');
const { createAuthedPage, gotoApp } = require('./helpers');

test.describe('Навигация и Адаптивность UI/UX', () => {
  let page;
  let email;

  test.beforeEach(async ({ context, baseURL }) => {
    // Используем хелпер для создания авторизованного контекста
    const authed = await createAuthedPage(context, baseURL);
    page = authed.page;
    email = authed.email;
    await gotoApp(page);
  });

  test('Адаптивность: отображение сайдбара на десктопе и таб-бара на мобильном', async ({ isMobile }) => {
    const sidebar = page.locator('aside.sidebar');
    const bottomBar = page.locator('nav.bottom-bar');

    if (!isMobile) {
      // На десктопе: сайдбар видим, нижний таб-бар скрыт
      await expect(sidebar).toBeVisible();
      await expect(bottomBar).toBeHidden();
    } else {
      // На мобильном: сайдбар скрыт, нижний таб-бар видим
      await expect(sidebar).toBeHidden();
      await expect(bottomBar).toBeVisible();
    }
  });

  test('SPA Навигация: переключение вкладок', async ({ isMobile }) => {
    // В зависимости от платформы используем кнопки из сайдбара или нижнего таб-бара
    const navSelector = isMobile ? 'nav.bottom-bar' : 'aside.sidebar';
    
    // Переход на вкладку Календарь
    const calendarBtn = page.locator(`${navSelector} [data-tab="calendar"]`);
    await calendarBtn.click();
    await expect(calendarBtn).toHaveClass(/active/);
    await expect(page.locator('#view h2').first()).toContainText(/(Календарь|Calendar)/i);

    // Переход на вкладку Статистика
    const statsBtn = page.locator(`${navSelector} [data-tab="stats"]`);
    await statsBtn.click();
    await expect(statsBtn).toHaveClass(/active/);
    await expect(page.locator('#view h2').first()).toContainText(/(Статистика|Stats)/i);

    // Переход на вкладку Профиль
    const profileBtn = page.locator(`${navSelector} [data-tab="profile"]`);
    await profileBtn.click();
    await expect(profileBtn).toHaveClass(/active/);
    await expect(page.locator('#view h2').first()).toContainText(/(Профиль|Profile)/i);

    // Переход обратно на Сегодня
    const todayBtn = page.locator(`${navSelector} [data-tab="today"]`);
    await todayBtn.click();
    await expect(todayBtn).toHaveClass(/active/);
    await expect(page.locator('#view h2').first()).toContainText(/(Привет|Hi|Герой|Hero)/i);
  });

  test('Модальные окна: открытие, центрирование и закрытие (Cancel, оверлей)', async ({ isMobile }) => {
    // Открываем модальное окно Gym Mode
    const gymBtn = isMobile ? page.locator('#gymModeBtnBar') : page.locator('#gymModeBtnSide');
    await gymBtn.click();

    const gymModal = page.locator('#gymModal');
    await expect(gymModal).toBeVisible();

    // Закрытие по кнопке "закрыть"
    const closeGymBtn = page.locator('#closeGymBtn');
    await closeGymBtn.click();
    await expect(gymModal).toBeHidden();

    // Снова открываем и закрываем кликом по оверлею
    await gymBtn.click();
    await expect(gymModal).toBeVisible();
    
    // Кликаем по самому оверлею (фону)
    await gymModal.click({ position: { x: 5, y: 5 } });
    await expect(gymModal).toBeHidden();

    // Проверяем модалку добавления привычки
    // Переходим в профиль для доступа к кнопке добавления
    const navSelector = isMobile ? 'nav.bottom-bar' : 'aside.sidebar';
    await page.locator(`${navSelector} [data-tab="profile"]`).click();

    // Кликаем "Добавить"
    await page.locator('main button:has-text("Добавить"), main button:has-text("Add")').click();
    const activityModal = page.locator('#activityModal');
    await expect(activityModal).toBeVisible();

    // Закрываем через кнопку CANCEL
    await page.locator('#cancelModalBtn').click();
    await expect(activityModal).toBeHidden();
  });

  test('Отсутствие горизонтального скролла на странице', async () => {
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });
});
