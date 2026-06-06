// @ts-check
const { test, expect } = require('@playwright/test');
const { createAuthedPage, gotoApp } = require('./helpers');

test.describe('E2E Gym Mode (Тренировки)', () => {
  let page;
  let email;

  test.beforeEach(async ({ context, baseURL }) => {
    const authed = await createAuthedPage(context, baseURL);
    page = authed.page;
    email = authed.email;
    await gotoApp(page);
  });

  test('Полный цикл тренировки: открытие Gym Mode, выбор упражнения, добавление подходов, завершение тренировки и проверка статистики', async ({ isMobile }) => {
    // 1. Открываем модальное окно тренировки
    const gymBtn = isMobile ? page.locator('#gymModeBtnBar') : page.locator('#gymModeBtnSide');
    await gymBtn.click();
    await expect(page.locator('#gymModal')).toBeVisible();

    // 2. Выбираем упражнение (например, Bench Press / Жим лежа)
    const select = page.locator('#gymExerciseSelect');
    await expect(select).toBeVisible();
    
    // Выберем первое доступное упражнение из списка
    await select.selectOption({ index: 0 }); 

    // Проверяем, что подставились дефолтные значения (если они есть)
    // Заполняем свои значения для надежности
    await page.locator('#gymWeightInput').fill('60');
    await page.locator('#gymRepsInput').fill('10');
    await page.locator('#gymSetsInput').fill('2'); // добавим 2 подхода сразу

    // 3. Добавляем подходы
    await page.locator('#gymAddSetBtn').click();

    // Проверяем, что в списке подходов появилось 2 записи
    const setList = page.locator('#gymSetList');
    await expect(setList.locator('.gym-set-row')).toHaveCount(2);
    await expect(setList).toContainText('60');
    await expect(setList).toContainText('10');

    // 4. Завершаем тренировку
    await page.locator('#gymFinishBtn').click();
    
    // Модальное окно должно закрыться
    await expect(page.locator('#gymModal')).toBeHidden();

    // Проверяем тост-уведомление о сохранении тренировки
    const toast = page.locator('#toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/(сохранена|saved)/i);
    await expect(toast).toBeHidden({ timeout: 5000 });

    // 5. Проверяем отображение тренировки во вкладке Статистика (Gym)
    const navSelector = isMobile ? 'nav.bottom-bar' : 'aside.sidebar';
    await page.locator(`${navSelector} [data-tab="stats"]`).click();

    // Переключаем режим статистики на "Зал / Gym"
    const gymStatsBtn = page.locator('main .seg button:has-text("Зал"), main .seg button:has-text("Gym")');
    await expect(gymStatsBtn).toBeVisible();
    await gymStatsBtn.click();

    // Проверяем, что отображается непустой дашборд
    await expect(page.locator('main')).toContainText(/(Общий тоннаж|Total Tonnage|Календарь тренировок|Workout Calendar)/i);
  });
});
