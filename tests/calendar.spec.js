// @ts-check
// E2E аналитического календаря: навигация по месяцам, heatmap-плотность,
// идеальные дни, детали дня, фильтр по привычке, инсайт по дням недели, годовой heatmap.
const { test, expect } = require('@playwright/test');
const { createAuthedPage, gotoApp } = require('./helpers');

function isoOf(y, m, d) {
  const dt = new Date(y, m, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

test.describe('E2E аналитического календаря (Calendar)', () => {
  test('Полный цикл: навигация, heatmap, идеальный день, детали, фильтр, инсайт, год', async ({ context, baseURL, isMobile }) => {
    const pageErrors = [];
    const authed = await createAuthedPage(context, baseURL);
    const page = authed.page;
    page.on('pageerror', (e) => pageErrors.push(e.stack || e.message));

    // --- Сидинг через API (cookie сессии общий с контекстом страницы) ---
    const req = page.request;
    // Регистрация авто-сеет дефолтные привычки — удаляем их, чтобы контролировать «идеальный день».
    const seeded = (await (await req.get('/api/activities')).json()).activities || [];
    for (const a of seeded) await req.delete(`/api/activities/${a.id}`);

    const mk = async (name, goal, color) => {
      const r = await req.post('/api/activities', {
        data: { name, type: 'numeric', unit: 'reps', daily_goal: goal, color },
      });
      expect(r.ok()).toBeTruthy();
    };
    await mk('Pushups', 5, '#0059b5');
    await mk('Squats', 3, '#006e1c');
    const acts = (await (await req.get('/api/activities')).json()).activities;
    const A = acts.find((a) => a.name === 'Pushups');
    const B = acts.find((a) => a.name === 'Squats');

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const today = now.getDate();
    const log = async (activity_id, amount, d) => {
      const r = await req.post('/api/logs', { data: { activity_id, amount, day: isoOf(y, m, d) } });
      expect(r.ok()).toBeTruthy();
    };
    // Идеальный день (today): обе привычки на цель.
    await log(A.id, 5, today);
    await log(B.id, 3, today);
    // Частичные дни в этом же месяце (если существуют).
    if (today - 1 >= 1) await log(A.id, 5, today - 1); // выполнена только A → ratio 0.5
    if (today - 2 >= 1) await log(B.id, 1, today - 2); // B ниже цели → «в процессе»

    // --- UI ---
    await gotoApp(page);
    const navSelector = isMobile ? 'nav.bottom-bar' : 'aside.sidebar';
    await page.locator(`${navSelector} [data-tab="calendar"]`).click();

    // CAL-01 — сетка и кнопки навигации присутствуют.
    await expect(page.locator('.cal-grid')).toBeVisible();
    await expect(page.locator('[data-nav="-1"]')).toBeVisible();
    await expect(page.locator('[data-nav="1"]')).toBeVisible();

    // CAL-02 — идеальный день отрисован (закрыты все привычки).
    await expect(page.locator('.cal-cell--perfect').first()).toBeVisible();

    // CAL-03 — чипы фильтров: «Все» + 2 привычки.
    await expect(page.locator('.cal-chip')).toHaveCount(3);

    // CAL-04 — heatmap-фон: минимум одна ячейка с инлайновой заливкой.
    expect(await page.locator('.cal-cell[style*="background"]').count()).toBeGreaterThan(0);

    // CAL-05 — клик по идеальному дню → панель с бейджем и строками привычек.
    await page.locator('.cal-cell--perfect').first().click();
    await expect(page.locator('.cal-day-detail .cal-perfect-badge')).toBeVisible();
    await expect(page.locator('.cal-day-detail .cal-detail-row')).toHaveCount(2);

    // CAL-06 — фильтр по привычке активируется.
    await page.locator('.cal-chip', { hasText: 'Pushups' }).click();
    await expect(page.locator('.cal-chip--active', { hasText: 'Pushups' })).toBeVisible();

    // CAL-07 — навигация на прошлый месяц показывает «Сегодня», возврат скрывает её.
    await page.locator('[data-nav="-1"]').click();
    await expect(page.locator('.cal-today-btn')).toBeVisible();
    await page.locator('.cal-today-btn').click();
    await expect(page.locator('.cal-today-btn')).toHaveCount(0);

    // CAL-08 — инсайт по дням недели: 7 столбцов.
    await expect(page.locator('.cal-weekday-bars')).toBeVisible();
    await expect(page.locator('.cal-wd')).toHaveCount(7);

    // CAL-09 — годовой heatmap (ленивый) рисует ≥360 ячеек.
    await page.locator('.cal-year-toggle').click();
    await expect(page.locator('.cal-year')).toBeVisible();
    expect(await page.locator('.cal-year__cell').count()).toBeGreaterThan(360);

    // CAL-10 — за весь сценарий не было ошибок страницы.
    expect(pageErrors).toEqual([]);
  });
});
