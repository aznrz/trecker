/**
 * Habit Tracker — трекер привычек (SPA, light/dark темы через CSS-переменные)
 * Архитектура: State → API → Render. Бэкенд и эндпоинты без изменений.
 */

// ==========================================
// 1. STATE
// ==========================================
const state = {
  user: null,
  activities: [],
  activeTab: 'today',
  selectedActivityId: null,
  statsDays: 30,
  statsPeriod: 7,
  selectedColor: '#0059b5',
};

// Палитра, читаемая на светлом фоне
const COLOR_PRESETS = [
  '#0059b5', // Blue (primary)
  '#006e1c', // Green
  '#8c21c0', // Purple
  '#ba1a1a', // Red
  '#c2410c', // Orange
  '#0e7490', // Cyan
  '#be185d', // Pink
  '#4338ca', // Indigo
];

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// HTML-экранирование пользовательских данных (защита от XSS в innerHTML-шаблонах)
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getEmoji(name = '') {
  const lower = name.toLowerCase();
  if (lower.includes('подтягиван') || lower.includes('pull-up') || lower.includes('спорт')) return '💪';
  if (lower.includes('отжиман') || lower.includes('push-up') || lower.includes('бег')) return '🏃';
  if (lower.includes('чтени') || lower.includes('read') || lower.includes('книг')) return '📖';
  if (lower.includes('математ') || lower.includes('math') || lower.includes('расчет')) return '🧮';
  if (lower.includes('pl-300') || lower.includes('study') || lower.includes('изуч') || lower.includes('учеб')) return '📚';
  return '✨';
}

// ==========================================
// 2. API CLIENT
// ==========================================
async function fetchJson(url, options = {}) {
  options.credentials = 'same-origin';
  options.headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  try {
    const res = await fetch(url, options);
    if (res.status === 401) {
      const hadUser = !!state.user;
      state.user = null;
      renderAuth();
      if (hadUser) showToast('Сессия истекла, войдите снова', 'error');
      throw new Error('Требуется авторизация');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Ошибка сервера: ${res.status}`);
    return data;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

const api = {
  getMe: () => fetchJson('/api/me'),
  login: (email, password) => fetchJson('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password) => fetchJson('/api/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => fetchJson('/api/logout', { method: 'POST' }),
  getActivities: () => fetchJson('/api/activities'),
  createActivity: (name, unit, color, dailyGoal) =>
    fetchJson('/api/activities', { method: 'POST', body: JSON.stringify({ name, unit, color, daily_goal: dailyGoal }) }),
  updateActivity: (id, name, unit, color, dailyGoal) =>
    fetchJson(`/api/activities/${id}`, { method: 'PATCH', body: JSON.stringify({ name, unit, color, daily_goal: dailyGoal }) }),
  deleteActivity: (id) => fetchJson(`/api/activities/${id}`, { method: 'DELETE' }),
  addLog: (activityId, amount, day) =>
    fetchJson('/api/logs', { method: 'POST', body: JSON.stringify({ activity_id: activityId, amount, day }) }),
  getStats: (day, days) => fetchJson(`/api/stats?today=${day}&days=${days}`),
};

// ==========================================
// 3. TOAST
// ==========================================
let toastTimer = null;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = '';
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined text-xl';
  icon.textContent = type === 'success' ? 'check_circle' : 'warning';
  icon.style.color = type === 'error' ? 'rgb(var(--error))' : 'rgb(var(--secondary))';
  toast.appendChild(icon);
  toast.appendChild(document.createTextNode(' ' + message));
  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ==========================================
// 4. ССЫЛКИ НА DOM
// ==========================================
const authScreen = document.getElementById('auth');
const appScreen = document.getElementById('app');
const viewContainer = document.getElementById('view');
const userEmailSpan = document.getElementById('userEmail');
const userNameSpan = document.getElementById('userName');

let authMode = 'login';

// ==========================================
// 5. ХЕЛПЕРЫ РЕНДЕРА
// ==========================================
function pageHeader(title, subtitle, rightNode) {
  const header = document.createElement('header');
  header.className = 'mb-md sm:mb-xl flex flex-wrap gap-4 justify-between items-end';
  const left = document.createElement('div');
  left.innerHTML = `
    <h2 class="text-headline-lg sm:text-headline-xl font-headline-xl text-on-surface">${title}</h2>
    ${subtitle ? `<p class="text-body-md sm:text-body-lg font-body-lg text-on-surface-variant mt-1">${subtitle}</p>` : ''}
  `;
  header.appendChild(left);
  if (rightNode) header.appendChild(rightNode);
  return header;
}

function scoreCard(label, value) {
  const card = document.createElement('div');
  card.className = 'glass-panel px-6 py-4 rounded-2xl shadow-sm text-right';
  card.innerHTML = `
    <p class="text-label-sm font-label-sm text-outline uppercase tracking-wider">${label}</p>
    <p class="text-headline-md font-headline-md text-primary">${value}</p>
  `;
  return card;
}

function backHeader(title) {
  const wrap = document.createElement('div');
  wrap.className = 'mb-md flex items-center gap-3';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'w-10 h-10 rounded-xl glass-panel flex items-center justify-center text-on-surface hover:bg-surface-container-high/60 active:scale-95 transition shrink-0';
  back.innerHTML = '<span class="material-symbols-outlined">arrow_back</span>';
  back.addEventListener('click', () => { state.selectedActivityId = null; renderCurrentTab(); });
  const h = document.createElement('h2');
  h.className = 'text-headline-lg font-headline-lg text-on-surface truncate';
  h.textContent = title;
  wrap.appendChild(back);
  wrap.appendChild(h);
  return wrap;
}

function renderAuth() {
  authScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
  const authTabs = document.getElementById('authTabs');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authError = document.getElementById('authError');
  authError.textContent = '';
  authTabs.querySelectorAll('button').forEach((btn) => {
    const action = btn.getAttribute('data-action');
    const isActive = (authMode === 'login' && action === 'login-tab') || (authMode === 'register' && action === 'register-tab');
    btn.className = isActive
      ? 'flex-1 py-3 text-center text-label-md font-label-md rounded-lg bg-primary text-on-primary shadow transition-all'
      : 'flex-1 py-3 text-center text-label-md font-label-md text-on-surface-variant rounded-lg transition-all';
  });
  authSubmitBtn.textContent = authMode === 'login' ? 'ВОЙТИ В СИСТЕМУ' : 'ЗАРЕГИСТРИРОВАТЬСЯ';
}

function updateNavUI() {
  // Сайдбар (.nav-link) и нижний таб-бар (.bottom-tab) — оба помечаются [data-tab]
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    const active = btn.getAttribute('data-tab') === state.activeTab && !state.selectedActivityId;
    btn.classList.toggle('active', active);
  });
}

async function renderCurrentTab() {
  updateNavUI();
  viewContainer.textContent = '';
  try {
    if (state.selectedActivityId) {
      await renderActivityDetail(state.selectedActivityId);
    } else if (state.activeTab === 'today') {
      await renderDashboardTab();
    } else if (state.activeTab === 'activities') {
      await renderActivitiesTab();
    } else if (state.activeTab === 'stats') {
      await renderStatsTab();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ==========================================
// 6. TODAY (дашборд)
// ==========================================
async function renderDashboardTab() {
  const todayDate = localDay();
  let res;
  try {
    res = await api.getStats(todayDate, 1);
  } catch (err) {
    showToast('Ошибка загрузки дашборда', 'error');
    return;
  }
  const activities = res.activities || [];
  state.activities = activities;

  // Подсчёт прогресса
  let overallPercent = 0, habitsLeft = 0, maxStreak = 0;
  if (activities.length > 0) {
    let completedSum = 0;
    activities.forEach((act) => {
      const comp = act.daily_goal > 0 ? Math.min(act.today_total / act.daily_goal, 1) : (act.today_total > 0 ? 1 : 0);
      completedSum += comp;
      if (comp < 1) habitsLeft++;
      if (act.streak > maxStreak) maxStreak = act.streak;
    });
    overallPercent = Math.round((completedSum / activities.length) * 100);
  }

  viewContainer.appendChild(pageHeader('Hi, Hero!', 'Ready to ascend today?', scoreCard('Daily Score', `${overallPercent}%`)));

  if (activities.length === 0) {
    viewContainer.appendChild(emptyState('Привычек пока нет', 'Добавьте первую цель на вкладке Activities.'));
    return;
  }

  // Bento-сетка
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-12 gap-gutter';

  // Карточка сводки (Weekly momentum)
  const summary = document.createElement('div');
  summary.className = 'col-span-12 md:col-span-6 lg:col-span-4 glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 relative overflow-hidden flex flex-col';
  summary.innerHTML = `
    <h3 class="text-headline-md font-headline-md mb-1">Daily Momentum</h3>
    <p class="text-body-md font-body-md text-on-surface-variant mb-6">${habitsLeft === 0 ? 'Все цели закрыты! Ты невесом 🚀' : `Осталось целей сегодня: ${habitsLeft}`}</p>
    <div class="mt-auto flex items-center justify-between">
      <div>
        <p class="text-headline-xl font-headline-xl text-primary leading-none">${overallPercent}%</p>
        <p class="text-label-sm font-label-sm text-outline uppercase tracking-wider mt-1">Ascended</p>
      </div>
      <div class="text-right text-secondary font-semibold flex items-center gap-1">
        <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">local_fire_department</span>
        <span class="text-headline-md font-headline-md">${maxStreak}d</span>
      </div>
    </div>
  `;
  grid.appendChild(summary);

  activities.forEach((act) => grid.appendChild(habitCard(act, todayDate)));
  viewContainer.appendChild(grid);
}

function habitCard(act, todayDate) {
  const color = act.color || '#0059b5';
  const card = document.createElement('div');
  card.className = 'col-span-12 md:col-span-6 lg:col-span-4 glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 flex flex-col gap-md group hover:border-primary/30 transition-all duration-500 cursor-pointer';
  card.addEventListener('click', () => { state.selectedActivityId = act.id; renderCurrentTab(); });

  let percent = 0;
  if (act.daily_goal > 0) percent = Math.min((act.today_total / act.daily_goal) * 100, 100);
  else if (act.today_total > 0) percent = 100;
  const done = act.daily_goal > 0 && act.today_total >= act.daily_goal;

  const head = document.createElement('div');
  head.className = 'flex justify-between items-start';
  const streakColor = act.streak === 0 ? 'rgb(var(--outline))' : (done ? 'rgb(var(--secondary))' : color);
  head.innerHTML = `
    <div class="flex flex-col gap-1 min-w-0">
      <span class="text-headline-md font-headline-md truncate">${getEmoji(act.name)} ${esc(act.name)}</span>
      <div class="flex items-center gap-1 font-semibold" style="color:${streakColor}">
        <span class="material-symbols-outlined text-[18px]" style="font-variation-settings:'FILL' ${act.streak === 0 ? 0 : 1};">local_fire_department</span>
        <span class="text-label-md font-label-md">${act.streak} Day Streak</span>
      </div>
    </div>
    <span class="text-headline-md font-headline-md text-on-surface-variant/40 group-hover:text-primary transition-colors shrink-0 ml-2">${Number(act.today_total.toFixed(1))} / ${act.daily_goal}</span>
  `;
  card.appendChild(head);

  const track = document.createElement('div');
  track.className = 'w-full h-4 bg-surface-container-high rounded-full overflow-hidden relative';
  const fill = document.createElement('div');
  fill.className = 'absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out';
  fill.style.width = '0%';
  fill.style.background = done ? 'rgb(var(--secondary-container))' : color;
  fill.style.boxShadow = `0 0 12px ${done ? 'rgb(var(--secondary-container) / 0.5)' : color + '66'}`;
  track.appendChild(fill);
  card.appendChild(track);
  requestAnimationFrame(() => { fill.style.width = `${percent}%`; });

  // Кнопки быстрой записи
  let presets = [1];
  if (act.daily_goal > 0) {
    const g = act.daily_goal;
    if (g >= 50) presets = [5, 15];
    else if (g >= 15) presets = [1, 10];
    else if (g >= 6) presets = [1, 5];
  }
  const btnRow = document.createElement('div');
  btnRow.className = 'grid grid-cols-3 gap-sm mt-auto';
  presets.slice(0, 2).forEach((val) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'glass-panel py-3 rounded-xl text-label-md font-label-md hover:bg-surface-container-highest transition-colors active:scale-95';
    b.textContent = `+${val}`;
    b.addEventListener('click', (e) => quickLog(e, act, val, todayDate));
    btnRow.appendChild(b);
  });
  const doneBtn = document.createElement('button');
  doneBtn.type = 'button';
  doneBtn.className = 'bg-on-surface text-on-primary py-3 rounded-xl text-label-md font-label-md hover:opacity-90 transition-opacity active:scale-95';
  doneBtn.textContent = 'Done';
  const remaining = act.daily_goal > 0 ? Math.max(act.daily_goal - act.today_total, 0) : 0;
  doneBtn.addEventListener('click', (e) => quickLog(e, act, remaining > 0 ? remaining : (act.daily_goal || 1), todayDate));
  btnRow.appendChild(doneBtn);
  card.appendChild(btnRow);

  return card;
}

async function quickLog(e, act, val, todayDate) {
  e.stopPropagation();
  if (!val || val <= 0) { showToast('Цель уже достигнута 🎉'); return; }
  try {
    await api.addLog(act.id, val, todayDate);
    showToast(`Добавлено +${Number(val.toFixed ? val.toFixed(1) : val)} ${act.unit || ''}`);
    await renderCurrentTab();
  } catch (err) {
    showToast('Не удалось сохранить лог', 'error');
  }
}

function emptyState(title, subtitle) {
  const el = document.createElement('div');
  el.className = 'glass-panel rounded-[32px] p-lg text-center shadow-sm';
  el.innerHTML = `
    <p class="text-headline-md font-headline-md text-on-surface mb-2">${title}</p>
    <p class="text-body-md font-body-md text-on-surface-variant">${subtitle}</p>
  `;
  return el;
}

// ==========================================
// 7. ДЕТАЛЬ ПРИВЫЧКИ
// ==========================================
async function renderActivityDetail(activityId) {
  const todayDate = localDay();
  let resp;
  try {
    resp = await api.getStats(todayDate, state.statsDays);
  } catch (err) {
    showToast('Не удалось загрузить сведения', 'error');
    state.selectedActivityId = null;
    return renderCurrentTab();
  }
  const act = (resp.activities || []).find((a) => a.id === activityId);
  if (!act) {
    showToast('Активность не найдена', 'error');
    state.selectedActivityId = null;
    return renderCurrentTab();
  }
  const color = act.color || '#0059b5';
  const series = act.series || [];
  const total = series.reduce((a, c) => a + c.total, 0);
  const best = series.length ? Math.max(...series.map((s) => s.total)) : 0;

  viewContainer.appendChild(backHeader(act.name));

  // Hero + три плашки
  const hero = document.createElement('section');
  hero.className = 'grid grid-cols-12 gap-gutter mb-md';
  hero.innerHTML = `
    <div class="col-span-12 md:col-span-6 glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 flex flex-col justify-center items-center text-center">
      <span class="text-headline-xl font-headline-xl text-primary leading-none">${Number(total.toFixed(1))}</span>
      <span class="text-label-sm font-label-sm text-outline uppercase tracking-wider mt-2">Всего ${esc((act.unit || '').toUpperCase())}</span>
    </div>
    <div class="col-span-12 md:col-span-6 grid grid-cols-3 gap-gutter">
      ${miniStat('Сегодня', Number(act.today_total.toFixed(1)))}
      ${miniStat('Рекорд', Number(best.toFixed(1)), color)}
      ${miniStat('Streak', act.streak + 'd')}
    </div>
  `;
  viewContainer.appendChild(hero);

  // Недельный график
  const chartSec = document.createElement('section');
  chartSec.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 mb-md';
  const chartHead = document.createElement('div');
  chartHead.className = 'flex justify-between items-center mb-6';
  chartHead.innerHTML = `<h3 class="text-headline-md font-headline-md">Weekly Progress</h3><span class="text-label-md font-label-md text-primary">7 дней</span>`;
  chartSec.appendChild(chartHead);

  const last7 = series.slice(-7);
  const maxVal = Math.max(...last7.map((s) => s.total), act.daily_goal || 1);
  const bars = document.createElement('div');
  bars.className = 'flex items-end justify-between h-40 gap-3 pt-4';
  const wd = ['В', 'П', 'В', 'С', 'Ч', 'П', 'С'];
  last7.forEach((d) => {
    const isToday = d.day === todayDate;
    const date = new Date(d.day + 'T00:00:00');
    const h = maxVal > 0 ? (d.total / maxVal) * 100 : 0;
    const done = act.daily_goal > 0 && d.total >= act.daily_goal;
    const col = document.createElement('div');
    col.className = 'flex-1 flex flex-col items-center gap-2 group relative';
    const tip = document.createElement('div');
    tip.className = 'absolute -top-2 bg-on-surface text-on-primary text-xs font-bold rounded py-1 px-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10';
    tip.textContent = `${Number(d.total.toFixed(1))} ${act.unit || ''}`;
    const tr = document.createElement('div');
    tr.className = 'w-full bg-surface-container-high rounded-t-xl relative h-28 overflow-hidden';
    const bf = document.createElement('div');
    bf.className = 'absolute bottom-0 left-0 w-full rounded-t-xl transition-all duration-700 ease-out';
    bf.style.height = `${h}%`;
    bf.style.background = done ? 'rgb(var(--secondary-container))' : color;
    bf.style.boxShadow = done ? '0 0 10px rgb(var(--secondary-container) / 0.45)' : `0 0 10px ${color}55`;
    tr.appendChild(bf);
    const lab = document.createElement('span');
    lab.className = `text-label-sm font-label-sm ${isToday ? 'font-bold text-primary' : 'text-on-surface-variant/60'}`;
    lab.textContent = wd[date.getDay()];
    col.appendChild(tip); col.appendChild(tr); col.appendChild(lab);
    bars.appendChild(col);
  });
  chartSec.appendChild(bars);
  viewContainer.appendChild(chartSec);

  // Достижения
  const badges = [
    { title: 'First Step', icon: 'military_tech', unlocked: total > 0 },
    { title: '14d Streak', icon: 'local_fire_department', unlocked: act.streak >= 14 },
    { title: '100 Club', icon: 'emoji_events', unlocked: total >= 100 },
    { title: 'Elite', icon: 'workspace_premium', unlocked: total >= 500 },
  ];
  const achSec = document.createElement('section');
  achSec.className = 'mb-md';
  achSec.innerHTML = '<h3 class="text-headline-md font-headline-md mb-md">Достижения</h3>';
  const achWrap = document.createElement('div');
  achWrap.className = 'grid grid-cols-2 sm:grid-cols-4 gap-gutter';
  badges.forEach((b, i) => {
    const c = document.createElement('div');
    c.className = `glass-panel rounded-2xl p-md flex flex-col items-center text-center shadow-sm ${b.unlocked ? '' : 'opacity-40'}`;
    c.innerHTML = `
      <div class="w-14 h-14 rounded-full ${b.unlocked ? 'bg-secondary/10 animate-float' : 'bg-surface-container-high'} flex items-center justify-center mb-2" style="animation-delay:${i * 0.6}s">
        <span class="material-symbols-outlined ${b.unlocked ? 'text-secondary' : 'text-outline'} text-3xl">${b.unlocked ? b.icon : 'lock'}</span>
      </div>
      <span class="text-label-sm font-label-sm font-bold">${b.title}</span>
    `;
    achWrap.appendChild(c);
  });
  achSec.appendChild(achWrap);
  viewContainer.appendChild(achSec);

  // Последние логи
  const logged = series.filter((s) => s.total > 0).reverse();
  const logSec = document.createElement('section');
  logSec.className = 'glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5';
  logSec.innerHTML = '<h3 class="text-headline-md font-headline-md mb-6">Recent Activity</h3>';
  const logList = document.createElement('div');
  logList.className = 'space-y-4';
  if (logged.length === 0) {
    logList.innerHTML = '<p class="text-body-md font-body-md text-on-surface-variant text-center py-4">Нет записей за последнее время</p>';
  } else {
    logged.forEach((d) => {
      const p = d.day.split('-');
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-4 bg-surface-container/50 rounded-2xl border border-outline-variant/20';
      item.innerHTML = `
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span class="material-symbols-outlined">event_available</span>
          </div>
          <div>
            <p class="text-label-md font-label-md font-bold">${p[2]}.${p[1]}.${p[0]}</p>
            <p class="text-label-sm font-label-sm text-on-surface-variant">Дневная сумма</p>
          </div>
        </div>
        <p class="text-headline-md font-headline-md text-primary">${Number(d.total.toFixed(1))} <span class="text-label-sm text-outline">${esc(act.unit || '')}</span></p>
      `;
      logList.appendChild(item);
    });
  }
  logSec.appendChild(logList);
  viewContainer.appendChild(logSec);
}

function miniStat(label, value, border) {
  return `
    <div class="glass-panel rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm" ${border ? `style="border:2px solid ${border}60"` : ''}>
      <span class="text-headline-md font-headline-md text-primary">${value}</span>
      <span class="text-label-sm font-label-sm text-outline uppercase tracking-wider mt-1">${label}</span>
    </div>`;
}

// ==========================================
// 8. ACTIVITIES (CRUD)
// ==========================================
async function renderActivitiesTab() {
  const addBtnNode = document.createElement('button');
  addBtnNode.type = 'button';
  addBtnNode.className = 'btn-primary flex items-center gap-2 px-5';
  addBtnNode.innerHTML = '<span class="material-symbols-outlined text-[20px]">add</span> Добавить';
  addBtnNode.addEventListener('click', () => openActivityModal(null));
  viewContainer.appendChild(pageHeader('Привычки', 'Управляй своими целями', addBtnNode));

  // Переключатель темы (доступен и на мобильном)
  viewContainer.appendChild(themeToggleRow());

  let res;
  try {
    res = await api.getActivities();
  } catch (err) {
    showToast('Ошибка загрузки привычек', 'error');
    return;
  }
  const activities = res.activities || [];
  state.activities = activities;

  if (activities.length === 0) {
    viewContainer.appendChild(emptyState('Список пуст', 'Добавьте первую привычку прямо сейчас.'));
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-12 gap-gutter';
  activities.forEach((act) => {
    const item = document.createElement('div');
    item.className = 'col-span-12 md:col-span-6 lg:col-span-4 glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5 flex items-center justify-between gap-3';
    const left = document.createElement('div');
    left.className = 'min-w-0';
    left.innerHTML = `
      <h3 class="text-headline-md font-headline-md truncate">${getEmoji(act.name)} ${esc(act.name)}</h3>
      <div class="text-label-sm font-label-sm text-on-surface-variant mt-1 flex items-center gap-2">
        <span class="inline-block w-3 h-3 rounded-full" style="background:${act.color || '#0059b5'}"></span>
        Цель: ${act.daily_goal} ${esc(act.unit || '')}
      </div>
    `;
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'btn-ghost px-4 py-2 shrink-0';
    edit.textContent = 'Изменить';
    edit.addEventListener('click', () => openActivityModal(act));
    item.appendChild(left);
    item.appendChild(edit);
    grid.appendChild(item);
  });
  viewContainer.appendChild(grid);
}

// ==========================================
// 9. STATS
// ==========================================
async function renderStatsTab() {
  // Переключатель периода 7 / 30 дней
  const toggle = document.createElement('div');
  toggle.className = 'flex bg-surface-container rounded-xl p-1 border border-outline-variant/40';
  [7, 30].forEach((d) => {
    const b = document.createElement('button');
    b.type = 'button';
    const active = state.statsPeriod === d;
    b.className = active
      ? 'px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md font-label-md transition-all'
      : 'px-4 py-2 rounded-lg text-on-surface-variant text-label-md font-label-md transition-all';
    b.textContent = `${d} дней`;
    b.addEventListener('click', () => { if (state.statsPeriod !== d) { state.statsPeriod = d; renderCurrentTab(); } });
    toggle.appendChild(b);
  });
  viewContainer.appendChild(pageHeader('Статистика', 'Динамика по привычкам', toggle));

  let resp;
  try {
    resp = await api.getStats(localDay(), state.statsPeriod);
  } catch (err) {
    showToast('Ошибка загрузки статистики', 'error');
    return;
  }
  const activities = resp.activities || [];
  if (activities.length === 0) {
    viewContainer.appendChild(emptyState('Нет данных', 'Залогируйте привычки, чтобы увидеть аналитику.'));
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-12 gap-gutter';
  activities.forEach((act) => {
    const color = act.color || '#0059b5';
    const series = act.series || [];
    const sum = series.reduce((a, c) => a + c.total, 0);
    const card = document.createElement('div');
    card.className = 'col-span-12 glass-panel rounded-[32px] p-md shadow-xl shadow-on-surface/5';
    card.innerHTML = `
      <div class="flex justify-between items-center mb-md border-b border-outline-variant/30 pb-3">
        <div class="min-w-0">
          <h3 class="text-headline-md font-headline-md truncate">${getEmoji(act.name)} ${esc(act.name)}</h3>
          <span class="text-label-sm font-label-sm text-on-surface-variant">Сумма за ${state.statsPeriod} дн.: ${Number(sum.toFixed(1))} ${esc(act.unit || '')}</span>
        </div>
        <div class="text-right shrink-0 ml-2 text-secondary font-semibold flex items-center gap-1">
          <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">local_fire_department</span>
          <span class="text-headline-md font-headline-md">${act.streak}</span>
        </div>
      </div>
    `;
    // SVG-график
    const w = 460, hgt = 70;
    const maxVal = Math.max(...series.map((s) => s.total), act.daily_goal || 1);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
    svg.setAttribute('class', 'w-full h-16 mt-3');
    const gap = series.length > 10 ? 3 : 8;
    const bw = (w - gap * (series.length - 1)) / series.length;
    series.forEach((d, i) => {
      let bh = maxVal > 0 ? (d.total / maxVal) * hgt : 0;
      if (d.total > 0 && bh < 5) bh = 5;
      const done = act.daily_goal > 0 && d.total >= act.daily_goal;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (i * (bw + gap)).toString());
      rect.setAttribute('y', (hgt - bh).toString());
      rect.setAttribute('width', bw.toString());
      rect.setAttribute('height', bh.toString());
      rect.setAttribute('rx', '4');
      // var() в SVG работает только через style, не через presentation-атрибут fill
      rect.style.fill = done ? 'rgb(var(--secondary-container))' : (d.total > 0 ? color : 'rgb(var(--surface-container-high))');
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      t.textContent = `${d.day}: ${Number(d.total.toFixed(1))} / ${act.daily_goal} ${act.unit || ''}`;
      rect.appendChild(t);
      svg.appendChild(rect);
    });
    card.appendChild(svg);
    grid.appendChild(card);
  });
  viewContainer.appendChild(grid);
}

// ==========================================
// 10. МОДАЛКИ
// ==========================================
const activityModal = document.getElementById('activityModal');
const activityForm = document.getElementById('activityForm');
const modalTitle = document.getElementById('modalTitle');
const activityIdInput = document.getElementById('activityIdInput');
const actNameInput = document.getElementById('actNameInput');
const actUnitInput = document.getElementById('actUnitInput');
const actGoalInput = document.getElementById('actGoalInput');
const actColorInput = document.getElementById('actColorInput');
const deleteActivityBtn = document.getElementById('deleteActivityBtn');
const colorPicker = document.getElementById('colorPicker');

const logModal = document.getElementById('logModal');
const logForm = document.getElementById('logForm');
const logActivitySelect = document.getElementById('logActivitySelect');
const logAmountInput = document.getElementById('logAmountInput');

function initColorPicker() {
  colorPicker.textContent = '';
  COLOR_PRESETS.forEach((color) => {
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = color;
    if (state.selectedColor === color) sw.classList.add('active');
    sw.addEventListener('click', () => {
      colorPicker.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      state.selectedColor = color;
      actColorInput.value = color;
    });
    colorPicker.appendChild(sw);
  });
}

function openActivityModal(activity = null) {
  if (activity) {
    modalTitle.textContent = 'Редактировать привычку';
    activityIdInput.value = activity.id;
    actNameInput.value = activity.name;
    actUnitInput.value = activity.unit || '';
    actGoalInput.value = activity.daily_goal || 0;
    state.selectedColor = activity.color || '#0059b5';
    actColorInput.value = state.selectedColor;
    deleteActivityBtn.hidden = false;
  } else {
    modalTitle.textContent = 'Новая привычка';
    activityIdInput.value = '';
    activityForm.reset();
    state.selectedColor = '#0059b5';
    actColorInput.value = '#0059b5';
    deleteActivityBtn.hidden = true;
  }
  initColorPicker();
  activityModal.classList.remove('hidden');
}

function closeActivityModal() { activityModal.classList.add('hidden'); }

function openLogModal() {
  logActivitySelect.textContent = '';
  if (!state.activities || state.activities.length === 0) {
    showToast('Сначала создайте привычку', 'error');
    return;
  }
  state.activities.forEach((act) => {
    const opt = document.createElement('option');
    opt.value = act.id;
    opt.textContent = `${act.name} (${act.unit || ''})`;
    logActivitySelect.appendChild(opt);
  });
  if (state.selectedActivityId) logActivitySelect.value = state.selectedActivityId;
  logAmountInput.value = '';
  logModal.classList.remove('hidden');
}

function closeLogModal() { logModal.classList.add('hidden'); }

// ==========================================
// 10.5 ТЕМА (Light / Dark)
// ==========================================
const THEME_KEY = 'antigravity-theme';

function currentTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) {}
  syncThemeUI();
}

function toggleTheme() {
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}

// Приводит все переключатели/иконки к текущему состоянию темы
function syncThemeUI() {
  const dark = currentTheme() === 'dark';
  const sideIcon = document.querySelector('#themeToggleSide .material-symbols-outlined');
  if (sideIcon) sideIcon.textContent = dark ? 'light_mode' : 'dark_mode';
  document.querySelectorAll('.theme-switch .knob .material-symbols-outlined').forEach((el) => {
    el.textContent = dark ? 'dark_mode' : 'light_mode';
  });
}

// Строка-переключатель темы для вкладки Activities
function themeToggleRow() {
  const row = document.createElement('div');
  row.className = 'glass-panel rounded-2xl p-4 flex items-center justify-between shadow-sm mb-md';
  const label = document.createElement('div');
  label.innerHTML = `
    <p class="text-label-md font-label-md font-bold">Тёмная тема</p>
    <p class="text-label-sm font-label-sm text-on-surface-variant">Светлое / тёмное оформление</p>
  `;
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'theme-switch';
  sw.setAttribute('aria-label', 'Сменить тему');
  const knob = document.createElement('span');
  knob.className = 'knob';
  knob.innerHTML = `<span class="material-symbols-outlined">${currentTheme() === 'dark' ? 'dark_mode' : 'light_mode'}</span>`;
  sw.appendChild(knob);
  sw.addEventListener('click', toggleTheme);
  row.appendChild(label);
  row.appendChild(sw);
  return row;
}

// ==========================================
// 11. ИНИЦИАЛИЗАЦИЯ И СОБЫТИЯ
// ==========================================
async function initApp() {
  try {
    const res = await api.getMe();
    if (res && res.user) {
      enterApp(res.user);
    } else {
      state.user = null;
      renderAuth();
    }
  } catch (err) {
    state.user = null;
    renderAuth();
  }
}

function enterApp(user) {
  state.user = user;
  userEmailSpan.textContent = user.email;
  userNameSpan.textContent = (user.email || 'Hero').split('@')[0];
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  state.activeTab = 'today';
  state.selectedActivityId = null;
  renderCurrentTab();
}

// Авторизация
document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const authError = document.getElementById('authError');
  authError.textContent = '';
  try {
    const res = authMode === 'login' ? await api.login(email, password) : await api.register(email, password);
    showToast(authMode === 'login' ? 'С возвращением!' : 'Аккаунт создан!');
    if (res && res.user) enterApp(res.user);
  } catch (err) {
    authError.textContent = err.message || 'Ошибка входа/регистрации';
  }
});

document.getElementById('authTabs').addEventListener('click', (e) => {
  const action = e.target.getAttribute('data-action');
  if (!action) return;
  authMode = action === 'login-tab' ? 'login' : 'register';
  renderAuth();
});

// Навигация (сайдбар + нижний таб-бар — все элементы с data-tab)
document.querySelectorAll('[data-tab]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const tab = btn.getAttribute('data-tab');
    if (!tab) return;
    state.activeTab = tab;
    state.selectedActivityId = null;
    await renderCurrentTab();
  });
});

// Переключатель темы в сайдбаре
document.getElementById('themeToggleSide').addEventListener('click', toggleTheme);

// Add New Habit
document.getElementById('addHabitBtn').addEventListener('click', () => openActivityModal(null));

// FAB → лог
document.getElementById('fabBtn').addEventListener('click', openLogModal);

// Выход
async function doLogout() {
  if (!confirm('Выйти из аккаунта?')) return;
  try {
    await api.logout();
    state.user = null;
    state.selectedActivityId = null;
    closeSidebar();
    showToast('Сессия завершена');
    renderAuth();
  } catch (err) {
    showToast('Не удалось выйти', 'error');
  }
}
document.getElementById('logoutBtn').addEventListener('click', doLogout);

// Модалки — закрытие
document.getElementById('closeModalBtn').addEventListener('click', closeActivityModal);
document.getElementById('cancelModalBtn').addEventListener('click', closeActivityModal);
document.getElementById('closeLogModalBtn').addEventListener('click', closeLogModal);
document.getElementById('cancelLogModalBtn').addEventListener('click', closeLogModal);

// Сохранение лога
logForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const actId = parseInt(logActivitySelect.value);
  const amount = parseFloat(logAmountInput.value);
  if (isNaN(actId) || isNaN(amount) || amount <= 0) return;
  try {
    await api.addLog(actId, amount, localDay());
    showToast('Запись добавлена!');
    closeLogModal();
    await renderCurrentTab();
  } catch (err) {
    showToast('Не удалось сохранить лог', 'error');
  }
});

// Сохранение привычки
activityForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = activityIdInput.value;
  const name = actNameInput.value.trim();
  const unit = actUnitInput.value.trim();
  const goal = parseFloat(actGoalInput.value) || 0;
  const color = actColorInput.value;
  try {
    if (id) {
      await api.updateActivity(id, name, unit, color, goal);
      showToast('Привычка обновлена!');
    } else {
      await api.createActivity(name, unit, color, goal);
      showToast('Привычка добавлена!');
    }
    closeActivityModal();
    await renderCurrentTab();
  } catch (err) {
    showToast('Не удалось сохранить', 'error');
  }
});

// Удаление привычки
deleteActivityBtn.addEventListener('click', async () => {
  const id = activityIdInput.value;
  if (!id) return;
  if (!confirm('Удалить эту привычку безвозвратно?')) return;
  try {
    await api.deleteActivity(id);
    showToast('Привычка удалена', 'error');
    closeActivityModal();
    if (state.selectedActivityId === parseInt(id)) state.selectedActivityId = null;
    await renderCurrentTab();
  } catch (err) {
    showToast('Не удалось удалить', 'error');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  syncThemeUI();
  initApp();
});
