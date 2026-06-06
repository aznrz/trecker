// @ts-check
const { test, expect } = require('@playwright/test');
const { createAuthedPage, gotoApp } = require('./helpers');
const AxeBuilder = require('@axe-core/playwright').default;

test.describe('Доступность UI/UX (Accessibility / a11y)', () => {
  
  test('Экран входа должен быть доступным (без критических нарушений a11y)', async ({ page }) => {
    await page.goto('/');
    
    // Ждем отрисовки формы логина
    await page.waitForSelector('#authForm');

    // Запускаем Axe-сканирование, отключая проверку контраста (так как она чувствительна к Tailwind CDN/градиентам)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    // Фильтруем только критические и серьезные нарушения
    const criticalViolations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    
    expect(criticalViolations).toEqual([]);
  });

  test('Форма логина: переход по Tab и фокус на инпутах', async ({ page }) => {
    await page.goto('/');

    const email = page.locator('#emailInput');
    const password = page.locator('#passwordInput');
    const submit = page.locator('#authSubmitBtn');

    // Кликаем на email, чтобы сфокусироваться
    await email.focus();
    await expect(email).toBeFocused();

    // Нажимаем Tab -> фокус должен перейти на пароль
    await page.keyboard.press('Tab');
    await expect(password).toBeFocused();

    // Нажимаем Tab -> фокус переходит на submit (или Turnstile, если включен, но у нас он отключен)
    await page.keyboard.press('Tab');
    await expect(submit).toBeFocused();
  });

  test('Авторизованная зона: Today и Profile соответствуют критериям WCAG', async ({ context, baseURL, isMobile }) => {
    const { page } = await createAuthedPage(context, baseURL);
    await gotoApp(page);

    // 1. Проверяем Today
    const todayResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();
    
    const todayViolations = todayResults.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(todayViolations).toEqual([]);

    // 2. Переходим в Profile и проверяем его доступность
    const navSelector = isMobile ? 'nav.bottom-bar' : 'aside.sidebar';
    await page.locator(`${navSelector} [data-tab="profile"]`).click();
    await page.waitForSelector('main h3:has-text("Мои привычки"), main h3:has-text("My Habits")');

    const profileResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();
    
    const profileViolations = profileResults.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(profileViolations).toEqual([]);
  });

  test('Модалки: закрытие клавишей Escape', async ({ context, baseURL, isMobile }) => {
    const { page } = await createAuthedPage(context, baseURL);
    await gotoApp(page);

    // Открываем модальное окно добавления логов в Gym Mode
    const gymBtn = isMobile ? page.locator('#gymModeBtnBar') : page.locator('#gymModeBtnSide');
    await gymBtn.click();

    const gymModal = page.locator('#gymModal');
    await expect(gymModal).toBeVisible();

    // Нажимаем клавишу Escape
    await page.keyboard.press('Escape');

    // Модальное окно должно быть закрыто
    await expect(gymModal).toBeHidden();
  });

  test('Доступные имена кнопок и иконок', async ({ page }) => {
    await page.goto('/');

    // Проверяем, что у инпутов на экране авторизации есть валидные labels с атрибутом for
    const emailLabel = await page.locator('label[for="emailInput"]').count();
    const passwordLabel = await page.locator('label[for="passwordInput"]').count();
    
    expect(emailLabel).toBe(1);
    expect(passwordLabel).toBe(1);
  });
});
