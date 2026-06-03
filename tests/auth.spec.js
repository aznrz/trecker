// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Аутентификация (Вход, Регистрация, Выход)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Незалогиненный пользователь видит экран авторизации и не видит приложение', async ({ page }) => {
    // Экран авторизации должен быть виден
    await expect(page.locator('#auth')).toBeVisible();
    // Приложение должно быть скрыто
    await expect(page.locator('#app')).toBeHidden();
  });

  test('Переключение вкладок Вход и Регистрация', async ({ page }) => {
    const loginTab = page.locator('[data-action="login-tab"]');
    const registerTab = page.locator('[data-action="register-tab"]');
    const submitBtn = page.locator('#authSubmitBtn');

    // По умолчанию выбран Вход
    await expect(loginTab).toHaveClass(/bg-primary/);
    await expect(submitBtn).toHaveText(/SIGN IN|ВОЙТИ/i);

    // Переключаемся на Регистрацию
    await registerTab.click();
    await expect(registerTab).toHaveClass(/bg-primary/);
    await expect(loginTab).not.toHaveClass(/bg-primary/);
    await expect(submitBtn).toHaveText(/SIGN UP|РЕГИСТРАЦИЯ/i);

    // Возвращаемся на Вход
    await loginTab.click();
    await expect(loginTab).toHaveClass(/bg-primary/);
    await expect(submitBtn).toHaveText(/SIGN IN|ВОЙТИ/i);
  });

  test('Неуспешный вход с неверным паролем', async ({ page }) => {
    await page.locator('#emailInput').fill('nonexistent@test.local');
    await page.locator('#passwordInput').fill('wrongpassword');
    await page.locator('#authSubmitBtn').click();

    // Должна появиться ошибка
    const errorMsg = page.locator('#authError');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).not.toBeEmpty();
  });

  test('Валидация полей: короткий пароль', async ({ page }) => {
    // Переключаемся на вкладку Регистрации
    await page.locator('[data-action="register-tab"]').click();

    const passwordInput = page.locator('#passwordInput');
    await page.locator('#emailInput').fill('e2e-short-pwd@test.local');
    await passwordInput.fill('123'); // короткий пароль
    await page.locator('#authSubmitBtn').click();

    // Проверяем нативную валидацию браузера
    const isTooShort = await passwordInput.evaluate(el => el.validity.tooShort);
    expect(isTooShort).toBe(true);
  });

  test('Успешная регистрация нового пользователя и выход из системы', async ({ page, isMobile }) => {
    // Переключаемся на Регистрацию
    await page.locator('[data-action="register-tab"]').click();

    const timestamp = Date.now() + Math.random().toString(36).substring(2, 7);
    const email = `e2e+${timestamp}@test.local`;
    const password = 'password123';

    await page.locator('#emailInput').fill(email);
    await page.locator('#passwordInput').fill(password);
    await page.locator('#authSubmitBtn').click();

    // Должен произойти переход в приложение
    await expect(page.locator('#app')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#auth')).toBeHidden();

    // Проверяем отображение email в профиле / сайдбаре
    const emailLocator = page.locator('#userEmail');
    await expect(emailLocator).toContainText(email);

    // Выходим из системы (соглашаемся на диалог confirm)
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });

    if (!isMobile) {
      // На десктопе кнопка выхода в сайдбаре
      const logoutBtn = page.locator('#logoutBtn');
      await expect(logoutBtn).toBeVisible();
      await logoutBtn.click();
    } else {
      // На мобилках: переходим в Profile таб
      await page.locator('nav.bottom-bar [data-tab="profile"]').click();
      // Ищем кнопку Выйти/Sign out в контенте
      const logoutBtn = page.locator('main button:has-text("logout"), main button:has-text("Выйти"), main button:has-text("Sign out")');
      await expect(logoutBtn).toBeVisible();
      await logoutBtn.click();
    }

    // Проверяем, что вернулись на форму авторизации
    await expect(page.locator('#auth')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#app')).toBeHidden();
  });
});
