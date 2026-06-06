// @ts-check
const { test, expect } = require('@playwright/test');
const { createAuthedPage, gotoApp } = require('./helpers');

test.describe('E2E привычек (Habits)', () => {
  let page;
  let email;

  test.beforeEach(async ({ context, baseURL }) => {
    const authed = await createAuthedPage(context, baseURL);
    page = authed.page;
    email = authed.email;
    await gotoApp(page);
  });

  test('Полный цикл: создание, логирование, детальный просмотр, редактирование лога и удаление привычки', async ({ isMobile }) => {
    // 1. Создаем привычку
    // Переходим в Profile
    const navSelector = isMobile ? 'nav.bottom-bar' : 'aside.sidebar';
    await page.locator(`${navSelector} [data-tab="profile"]`).click();

    // Кликаем "Добавить" привычку
    await page.locator('main button:has-text("Добавить"), main button:has-text("Add")').click();
    await expect(page.locator('#activityModal')).toBeVisible();

    const habitName = `E2E Run`;
    await page.locator('#actNameInput').fill(habitName);
    
    // Выбираем тип "Числовой" (уже по умолчанию)
    await page.locator('#actGoalInput').fill('5');
    await page.locator('#actUnitInput').selectOption({ index: 4 });
    
    // Задаем быстрые кнопки
    await page.locator('#actQa1Input').fill('1');
    await page.locator('#actQa2Input').fill('2');
    await page.locator('#actQa3Input').fill('5');

    // Сохраняем привычку
    await page.locator('#saveActivityBtn').click();
    await expect(page.locator('#activityModal')).toBeHidden();

    // 2. Логируем значение на Today
    await page.locator(`${navSelector} [data-tab="today"]`).click();
    
    // Ждем появления карточки
    const habitCard = page.locator(`.card-grid >> text=${habitName}`).locator('xpath=./ancestor::div[contains(@class, "glass-panel")]');
    await expect(habitCard).toBeVisible();

    // Кликаем кнопку "+1" на карточке
    const plusOneBtn = habitCard.locator('button:has-text("+1")');
    await expect(plusOneBtn).toBeVisible();
    await plusOneBtn.click();

    // Ждем тост-уведомление
    const toast = page.locator('#toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/(Добавлено|Added)/i);
    await expect(toast).toBeHidden({ timeout: 5000 });

    // Проверяем изменение прогресса (значение стало 1 / 5)
    await expect(habitCard).toContainText('1 / 5');

    // 3. Переход в детальный просмотр привычки
    // Кликаем по самой карточке, чтобы провалиться в подробности
    await habitCard.click({ position: { x: 10, y: 10 } });
    
    // Должна отобразиться детальная страница с графиком
    await expect(page.locator('#view h2')).toContainText(habitName);
    await expect(page.locator('#view').locator('text=/Best|Лучшее/')).toBeVisible();

    // 4. Добавление лога через FAB в детальном просмотре
    // Нажимаем FAB
    await page.locator('button[title="Add Log"], button[title="Добавить запись"]').click();
    await expect(page.locator('#logModal')).toBeVisible();

    // Заполняем лог
    await page.locator('#logAmountInput').fill('2');
    await page.locator('#logForm button[type="submit"]').click();
    await expect(page.locator('#logModal')).toBeHidden();

    // Проверяем появление записи в списке
    const logItem = page.locator('.log-section >> text=2');
    await expect(logItem.first()).toBeVisible();

    // 5. Редактирование созданного лога
    // Подхватываем диалоговое окно prompt для редактирования
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('3'); // меняем количество на 3
    });

    // Нажимаем на кнопку редактирования в первой строке лога
    const editBtn = page.locator('.log-card').first().locator('button[title="Edit entry"], button[title="Редактировать запись"]');
    await editBtn.click();

    // Проверяем, что значение изменилось
    await expect(page.locator('.log-card__title >> text=3').first()).toBeVisible();

    // 6. Удаление лога
    // Подхватываем confirm-диалог
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });

    const deleteBtn = page.locator('.log-card').first().locator('button[title="Delete entry"], button[title="Удалить запись"]');
    await deleteBtn.click();

    // Лог "3" должен исчезнуть
    await expect(page.locator('.log-card__title >> text=3')).toBeHidden();

    // 7. Удаление самой привычки в Profile
    // Возвращаемся из детального просмотра
    await page.locator('button:has-text("arrow_back")').click();
    await expect(page.locator('#view h2')).toContainText(/(Привет|Hi|Герой|Hero)/i);

    // Идем в профиль
    await page.locator(`${navSelector} [data-tab="profile"]`).click();

    // Ищем кнопку редактирования привычки
    const editHabitCard = page.locator(`.card-grid >> text=${habitName}`).locator('xpath=./ancestor::div[contains(@class, "glass-panel")]');
    await editHabitCard.locator('button:has-text("Редактировать"), button:has-text("Edit")').click();
    await expect(page.locator('#activityModal')).toBeVisible();

    // Нажимаем "Удалить"
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });
    await page.locator('#deleteActivityBtn').click();
    await expect(page.locator('#activityModal')).toBeHidden();

    // Проверяем, что привычки больше нет в списке
    await expect(page.locator(`.card-grid >> text=${habitName}`)).toBeHidden();
  });
});
