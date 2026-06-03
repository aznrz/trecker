// @ts-check
const { request } = require('@playwright/test');

/**
 * Регистрирует нового уникального пользователя через REST API воркера.
 * @param {import('@playwright/test').APIRequestContext} requestContext
 * @returns {Promise<{email: string, password: string, sid: string | null}>}
 */
async function registerViaApi(requestContext) {
  const timestamp = Date.now() + Math.random().toString(36).substring(2, 7);
  const email = `e2e+${timestamp}@test.local`;
  const password = `pwd_${timestamp}`;

  const response = await requestContext.post('/api/register', {
    data: { email, password },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Не удалось зарегистрироваться через API: ${response.status()} - ${text}`);
  }

  // Получаем cookie sid из заголовков ответа
  const headers = response.headers();
  const setCookie = headers['set-cookie'] || '';
  const match = setCookie.match(/sid=([^;]+)/);
  const sid = match ? match[1] : null;

  return { email, password, sid };
}

/**
 * Создает авторизованную страницу, регистрируя пользователя через API
 * и прокидывая сессионную куку в контекст браузера.
 * @param {import('@playwright/test').BrowserContext} context
 * @param {string | undefined} baseURL
 * @returns {Promise<{page: import('@playwright/test').Page, email: string}>}
 */
async function createAuthedPage(context, baseURL) {
  const apiRequestContext = context.request;
  const { email, sid } = await registerViaApi(apiRequestContext);

  if (sid) {
    const hostname = new URL(baseURL || 'http://127.0.0.1:8787').hostname;
    await context.addCookies([
      {
        name: 'sid',
        value: sid,
        domain: hostname === '127.0.0.1' ? '127.0.0.1' : hostname,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
  }

  const page = await context.newPage();
  return { page, email };
}

/**
 * Переходит на главную страницу и ждет инициализации приложения.
 * @param {import('@playwright/test').Page} page
 */
async function gotoApp(page) {
  await page.goto('/');
  // Ждем, пока скроется экран авторизации и появится #app
  await page.waitForSelector('#app:not(.hidden)', { state: 'visible', timeout: 8000 });
}

module.exports = {
  registerViaApi,
  createAuthedPage,
  gotoApp,
};
