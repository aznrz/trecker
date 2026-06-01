/**
 * Antigravity — Персональный трекер привычек (OLED Glassmorphism SPA)
 * Архитектура: State (состояние), API (запросы), Render (интерфейс)
 */

// ==========================================
// 1. STATE (Состояние)
// ==========================================
const state = {
  user: null,               // Текущий пользователь { id, email }
  activities: [],           // Список активностей
  activeTab: 'today',       // Активный таб ('today', 'stats', 'activities')
  selectedActivityId: null, // ID выбранной привычки для детального drill-down экрана
  statsDays: 30,            // Количество дней для истории логов
  selectedColor: '#007aff', // Выбранный цвет по умолчанию (Electric Blue)
};

// Премиальная OLED-палитра (светящиеся неоновые акценты)
const COLOR_PRESETS = [
  '#007aff', // Electric Blue (Primary)
  '#32d74b', // Neon Green (Tertiary)
  '#bf5af2', // Vibrant Purple (Secondary)
  '#ff453a', // Sunset Red
  '#ff9f0a', // Neon Orange
  '#64d2ff', // Cyber Cyan
  '#ffd60a', // Cyber Yellow
  '#ff375f'  // Neon Pink
];

// Получить локальную YYYY-MM-DD
function localDay() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Автоматический подбор эмодзи для красивого вывода в стиле макета
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
// 2. API CLIENT (Сетевые запросы)
// ==========================================
async function fetchJson(url, options = {}) {
  options.credentials = 'same-origin';
  options.headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, options);
    
    if (res.status === 401) {
      const hadUser = !!state.user;
      state.user = null;
      renderAuth();
      if (hadUser) {
        showToast('Сессия истекла, пожалуйста, войдите снова', 'error');
      }
      throw new Error('Требуется авторизация');
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Ошибка сервера: ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error:`, err);
    throw err;
  }
}

const api = {
  async getMe() {
    return await fetchJson('/api/me');
  },
  async login(email, password) {
    return await fetchJson('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },
  async register(email, password) {
    return await fetchJson('/api/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },
  async logout() {
    return await fetchJson('/api/logout', { method: 'POST' });
  },
  async getActivities() {
    return await fetchJson('/api/activities');
  },
  async createActivity(name, unit, color, dailyGoal) {
    return await fetchJson('/api/activities', {
      method: 'POST',
      body: JSON.stringify({ name, unit, color, daily_goal: dailyGoal })
    });
  },
  async updateActivity(id, name, unit, color, dailyGoal) {
    return await fetchJson(`/api/activities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, unit, color, daily_goal: dailyGoal })
    });
  },
  async deleteActivity(id) {
    return await fetchJson(`/api/activities/${id}`, { method: 'DELETE' });
  },
  async addLog(activityId, amount, day) {
    return await fetchJson('/api/logs', {
      method: 'POST',
      body: JSON.stringify({ activity_id: activityId, amount, day })
    });
  },
  async getStats(day, days) {
    return await fetchJson(`/api/stats?today=${day}&days=${days}`);
  }
};

// ==========================================
// 3. TOAST & NOTIFICATIONS
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
  
  if (type === 'error') {
    toast.style.borderColor = '#ffb4ab';
    icon.style.color = '#ffb4ab';
  } else {
    toast.style.borderColor = '#007aff';
    icon.style.color = '#adc6ff';
  }
  
  toast.appendChild(icon);
  toast.appendChild(document.createTextNode(' ' + message));
  toast.classList.remove('hidden');

  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// ==========================================
// 4. RENDER VIEWS
// ==========================================
const authScreen = document.getElementById('auth');
const appScreen = document.getElementById('app');
const viewContainer = document.getElementById('view');
const userEmailSpan = document.getElementById('userEmail');
const backBtn = document.getElementById('backBtn');
const headerTitle = document.getElementById('headerTitle');
const fabBtn = document.getElementById('fabBtn');

let authMode = 'login';

function renderAuth() {
  authScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
  
  const authTabs = document.getElementById('authTabs');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authError = document.getElementById('authError');
  authError.textContent = '';

  const buttons = authTabs.querySelectorAll('button');
  buttons.forEach(btn => {
    const action = btn.getAttribute('data-action');
    if ((authMode === 'login' && action === 'login-tab') || (authMode === 'register' && action === 'register-tab')) {
      btn.className = 'flex-1 py-3 text-center font-label-caps text-label-caps rounded-lg bg-primary text-on-primary shadow-lg active-interaction transition-all';
    } else {
      btn.className = 'flex-1 py-3 text-center font-label-caps text-label-caps text-on-surface-variant rounded-lg active-interaction transition-all';
    }
  });

  authSubmitBtn.textContent = authMode === 'login' ? 'ВОЙТИ В СИСТЕМУ' : 'ЗАРЕГИСТРИРОВАТЬСЯ';
}

function updateTabbarUI() {
  const tabs = document.querySelectorAll('nav .tab');
  tabs.forEach(btn => {
    const tabName = btn.getAttribute('data-tab');
    const icon = btn.querySelector('.material-symbols-outlined');
    
    if (tabName === state.activeTab && !state.selectedActivityId) {
      btn.className = 'tab flex flex-col items-center justify-center text-primary relative active-nav-dot active-interaction duration-200';
      if (icon) icon.classList.add('active-icon');
    } else {
      btn.className = 'tab flex flex-col items-center justify-center text-on-surface-variant/60 hover:text-primary/80 active-nav-dot-none active-interaction duration-200';
      btn.classList.remove('active-nav-dot');
      if (icon) icon.classList.remove('active-icon');
    }
  });
}

async function renderCurrentTab() {
  updateTabbarUI();
  viewContainer.textContent = '';

  // Если выбрана привычка -> Drill-Down Детализация
  if (state.selectedActivityId) {
    backBtn.classList.remove('hidden');
    await renderActivityDetail(state.selectedActivityId);
    return;
  }

  // Обычный экран вкладок
  backBtn.classList.add('hidden');
  headerTitle.textContent = 'Antigravity';

  try {
    if (state.activeTab === 'today') {
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

// --- 4.1 ТАБ 1: ДАШБОРД (TODAY) ---
async function renderDashboardTab() {
  const todayDate = localDay();

  // Приветственная секция в стиле Antigravity
  const greetingSec = document.createElement('section');
  greetingSec.className = 'mb-md pt-4';
  greetingSec.innerHTML = `
    <h1 class="font-display-lg-mobile text-display-lg-mobile text-on-surface font-extrabold">Hi, Hero!</h1>
    <p class="text-on-surface-variant font-body-lg mt-xs opacity-80">Ready to ascend today?</p>
  `;
  viewContainer.appendChild(greetingSec);

  // Получаем статистику привычек
  let res;
  try {
    res = await api.getStats(todayDate, 1);
  } catch (err) {
    showToast('Ошибка загрузки дашборда', 'error');
    return;
  }

  const activities = res.activities || [];
  state.activities = activities; // Кэш

  // Bento-карточка прогресса (Daily Momentum Ring)
  let overallPercent = 0;
  let activeStreaks = [];
  let habitsLeft = 0;

  if (activities.length > 0) {
    let completedSum = 0;
    activities.forEach(act => {
      const comp = act.daily_goal > 0 ? Math.min(act.today_total / act.daily_goal, 1) : (act.today_total > 0 ? 1 : 0);
      completedSum += comp;
      if (comp < 1) habitsLeft++;
      if (act.streak > 0) activeStreaks.push(act.streak);
    });
    overallPercent = Math.round((completedSum / activities.length) * 100);
  }

  const maxStreak = activeStreaks.length > 0 ? Math.max(...activeStreaks) : 0;

  const bentoSection = document.createElement('section');
  bentoSection.className = 'mb-md';

  const bentoCard = document.createElement('div');
  bentoCard.className = 'glass-card rounded-xl p-md flex flex-col items-center relative overflow-hidden';

  const bentoLabel = document.createElement('span');
  bentoLabel.className = 'font-label-caps text-label-caps text-on-surface-variant mb-md tracking-widest';
  bentoLabel.textContent = 'DAILY MOMENTUM';

  // SVG круговой прогресс с неоновым свечением
  const ringSize = 160;
  const strokeWidth = 10;
  const radius = (ringSize - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (circ * overallPercent) / 100;

  const svgRing = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgRing.setAttribute('class', 'w-40 h-40');
  svgRing.setAttribute('viewBox', `0 0 ${ringSize} ${ringSize}`);

  const circleTrack = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circleTrack.setAttribute('class', 'text-white/5');
  circleTrack.setAttribute('cx', (ringSize / 2).toString());
  circleTrack.setAttribute('cy', (ringSize / 2).toString());
  circleTrack.setAttribute('r', radius.toString());
  circleTrack.setAttribute('fill', 'transparent');
  circleTrack.setAttribute('stroke', 'currentColor');
  circleTrack.setAttribute('stroke-width', strokeWidth.toString());

  const circleBar = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circleBar.setAttribute('class', 'text-primary progress-ring-circle');
  circleBar.setAttribute('cx', (ringSize / 2).toString());
  circleBar.setAttribute('cy', (ringSize / 2).toString());
  circleBar.setAttribute('r', radius.toString());
  circleBar.setAttribute('fill', 'transparent');
  circleBar.setAttribute('stroke', 'currentColor');
  circleBar.setAttribute('stroke-width', strokeWidth.toString());
  circleBar.setAttribute('stroke-dasharray', circ.toFixed(0));
  circleBar.setAttribute('stroke-dashoffset', circ.toFixed(0)); // анимация
  circleBar.setAttribute('stroke-linecap', 'round');
  circleBar.setAttribute('style', 'filter: drop-shadow(0px 0px 6px rgba(173,198,255,0.6))');

  svgRing.appendChild(circleTrack);
  svgRing.appendChild(circleBar);

  const ringInner = document.createElement('div');
  ringInner.className = 'relative w-40 h-40 flex items-center justify-center';
  ringInner.appendChild(svgRing);

  const percentLabel = document.createElement('div');
  percentLabel.className = 'absolute flex flex-col items-center';
  percentLabel.innerHTML = `
    <span class="font-sora text-4xl text-primary font-extrabold leading-none">${overallPercent}%</span>
    <span class="font-label-caps text-label-caps text-on-surface-variant mt-1">ASCENDED</span>
  `;
  ringInner.appendChild(percentLabel);

  const infoText = document.createElement('div');
  infoText.className = 'mt-md text-center';
  infoText.innerHTML = `
    <p class="font-headline-md text-headline-md text-on-surface font-extrabold">${maxStreak > 0 ? `Streak: ${maxStreak} days active 🔥` : 'Start your streak today!'}</p>
    <p class="text-on-surface-variant font-body-md opacity-80 mt-xs">${habitsLeft === 0 ? 'All habits complete! You are weightless 🚀' : `${habitsLeft} goals remaining today`}</p>
  `;

  bentoCard.appendChild(bentoLabel);
  bentoCard.appendChild(ringInner);
  bentoCard.appendChild(infoText);
  bentoSection.appendChild(bentoCard);
  viewContainer.appendChild(bentoSection);

  // Анимация кольца
  setTimeout(() => {
    circleBar.setAttribute('stroke-dashoffset', offset.toFixed(0));
  }, 100);

  // Список Привычек
  if (activities.length === 0) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'glass-card rounded-xl p-lg text-center text-on-surface-variant font-semibold mt-md';
    emptyCard.textContent = 'Привычек не найдено. Добавьте цель во вкладке Habits!';
    viewContainer.appendChild(emptyCard);
    return;
  }

  const listContainer = document.createElement('div');
  listContainer.className = 'flex flex-col gap-md mt-md';

  activities.forEach(act => {
    const card = document.createElement('div');
    card.className = 'glass-card rounded-xl p-md flex flex-col gap-sm relative overflow-hidden transition-all duration-300 hover:glass-card-active active:scale-[0.98] cursor-pointer';
    
    // Клик на тело карточки открывает drill-down
    card.addEventListener('click', () => {
      state.selectedActivityId = act.id;
      renderCurrentTab();
    });

    const header = document.createElement('div');
    header.className = 'flex justify-between items-start';

    const info = document.createElement('div');
    const emoji = getEmoji(act.name);
    
    const titleText = document.createElement('h3');
    titleText.className = 'font-headline-md text-headline-md font-bold text-on-surface';
    titleText.textContent = `${emoji} ${act.name}`;

    const streakText = document.createElement('p');
    streakText.className = 'font-label-caps text-label-caps mt-xs';
    streakText.style.color = act.color || '#007aff';
    streakText.textContent = `🔥 ${act.streak} days streak`;

    info.appendChild(titleText);
    info.appendChild(streakText);

    const statsArea = document.createElement('div');
    statsArea.className = 'text-right flex flex-col';
    
    const bigVal = document.createElement('span');
    bigVal.className = 'font-stats-num text-stats-num font-bold';
    bigVal.style.color = act.color || '#007aff';
    bigVal.textContent = Number(act.today_total.toFixed(1));

    const goalVal = document.createElement('span');
    goalVal.className = 'text-on-surface-variant/60 font-body-md -mt-1';
    goalVal.textContent = `/ ${act.daily_goal} ${act.unit || ''}`;

    statsArea.appendChild(bigVal);
    statsArea.appendChild(goalVal);

    header.appendChild(info);
    header.appendChild(statsArea);
    card.appendChild(header);

    // Прогресс-бар
    const progressTrack = document.createElement('div');
    progressTrack.className = 'w-full h-3 progress-track rounded-full overflow-hidden mt-sm';

    const progressFill = document.createElement('div');
    progressFill.className = 'h-full transition-all duration-1000 rounded-full';
    
    let percent = 0;
    if (act.daily_goal > 0) {
      percent = Math.min((act.today_total / act.daily_goal) * 100, 100);
    } else if (act.today_total > 0) {
      percent = 100;
    }
    
    progressFill.style.width = `${percent}%`;
    progressFill.style.backgroundColor = act.color || '#007aff';
    progressFill.style.boxShadow = `0 0 12px ${act.color || '#007aff'}`;

    progressTrack.appendChild(progressFill);
    card.appendChild(progressTrack);

    // Кнопки быстрого лога внутри карточки
    const btnsRow = document.createElement('div');
    btnsRow.className = 'flex gap-sm mt-sm';

    // Формируем кнопки
    let presets = [1];
    if (act.daily_goal > 0) {
      const g = act.daily_goal;
      if (g >= 50) presets = [5, 15, 25];
      else if (g >= 15) presets = [1, 5, 10];
      else if (g >= 6) presets = [1, 3, 5];
    }

    presets.forEach(val => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'flex-1 py-2 px-sm rounded-lg border border-white/10 glass-card font-label-caps text-label-caps text-on-surface hover:bg-white/10 active-interaction transition-colors';
      btn.textContent = `+${val}`;

      btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Исключаем клик открытия экрана
        try {
          await api.addLog(act.id, val, todayDate);
          showToast(`Добавлено +${val} ${act.unit || ''}`);
          await renderCurrentTab();
        } catch (err) {
          showToast('Не удалось сохранить лог', 'error');
        }
      });
      btnsRow.appendChild(btn);
    });

    card.appendChild(btnsRow);
    listContainer.appendChild(card);
  });

  viewContainer.appendChild(listContainer);
}

// --- 4.2 ДЕТАЛЬНЫЙ ЭКРАН ПРИВЫЧКИ (DRILL-DOWN) ---
async function renderActivityDetail(activityId) {
  const todayDate = localDay();
  
  let statsResponse;
  try {
    statsResponse = await api.getStats(todayDate, state.statsDays);
  } catch (err) {
    showToast('Не удалось загрузить сведения', 'error');
    state.selectedActivityId = null;
    await renderCurrentTab();
    return;
  }

  const act = (statsResponse.activities || []).find(a => a.id === activityId);
  if (!act) {
    showToast('Активность не найдена', 'error');
    state.selectedActivityId = null;
    await renderCurrentTab();
    return;
  }

  headerTitle.textContent = act.name;

  const series = act.series || [];
  const totalReps = series.reduce((acc, curr) => acc + curr.total, 0);
  const personalBest = series.length > 0 ? Math.max(...series.map(s => s.total)) : 0;

  // 1. HERO АКТИВНОСТИ
  const heroSection = document.createElement('section');
  heroSection.className = 'mb-md text-center';

  const heroCard = document.createElement('div');
  heroCard.className = 'inline-flex items-center justify-center p-6 bg-surface-container-lowest rounded-[2rem] shadow-sm mb-md relative overflow-hidden group border border-white/5';
  heroCard.innerHTML = `
    <div class="absolute inset-0 bg-primary opacity-0 group-hover:opacity-5 transition-opacity duration-500"></div>
    <div class="relative">
      <span class="font-sora text-5xl text-primary block font-extrabold leading-none" style="text-shadow: 0 0 15px ${act.color || '#007aff'}40">${Number(totalReps.toFixed(1))}</span>
      <span class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest block mt-2 font-bold">TOTAL ${act.unit.toUpperCase()}</span>
    </div>
  `;
  heroSection.appendChild(heroCard);

  const tripleBox = document.createElement('div');
  tripleBox.className = 'flex justify-center gap-md';
  
  // Отрисовка 3-х плашек
  tripleBox.innerHTML = `
    <div class="bg-surface-container px-md py-sm rounded-xl flex-1 text-center border border-white/5">
      <span class="block font-headline-md text-headline-md font-bold text-primary">${Number(act.today_total.toFixed(1))}</span>
      <span class="block font-label-caps text-[10px] text-on-surface-variant font-bold mt-1">TODAY</span>
    </div>
    <div class="bg-surface-container px-md py-sm rounded-xl border-2 flex-1 text-center shadow-md" style="border-color: ${act.color || '#007aff'}60">
      <span class="block font-headline-md text-headline-md font-bold text-primary">${Number(personalBest.toFixed(1))}</span>
      <span class="block font-label-caps text-[10px] text-on-surface-variant font-bold mt-1">BEST</span>
    </div>
    <div class="bg-surface-container px-md py-sm rounded-xl flex-1 text-center border border-white/5">
      <span class="block font-headline-md text-headline-md font-bold text-primary">${act.streak}d</span>
      <span class="block font-label-caps text-[10px] text-on-surface-variant font-bold mt-1">STREAK</span>
    </div>
  `;
  heroSection.appendChild(tripleBox);
  viewContainer.appendChild(heroSection);

  // 2. WEEKLY PROGRESS CHART (7 ДНЕЙ)
  const chartSection = document.createElement('section');
  chartSection.className = 'mb-md';
  chartSection.innerHTML = `
    <div class="flex justify-between items-end mb-md">
      <h2 class="font-headline-md text-headline-md text-on-surface">Weekly Progress</h2>
      <span class="font-label-caps text-label-caps text-primary font-bold">7 days</span>
    </div>
  `;

  const chartCard = document.createElement('div');
  chartCard.className = 'bg-surface-container-lowest p-md rounded-xl shadow-sm border border-outline-variant/30';

  const last7Days = series.slice(-7);
  const maxVal = Math.max(...last7Days.map(s => s.total), act.daily_goal || 1);

  const flexBars = document.createElement('div');
  flexBars.className = 'flex items-end justify-between h-40 gap-3 pt-4 px-1';

  const weekdayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  last7Days.forEach(dayData => {
    const isToday = dayData.day === todayDate;
    const dateObj = new Date(dayData.day + 'T00:00:00');
    const dayName = weekdayNames[dateObj.getDay()];

    let hPercent = 0;
    if (maxVal > 0) {
      hPercent = (dayData.total / maxVal) * 100;
    }

    const flexBar = document.createElement('div');
    flexBar.className = 'flex-1 flex flex-col items-center gap-2 group relative';

    const barTrack = document.createElement('div');
    barTrack.className = 'w-full bg-surface-container-low rounded-t-full relative h-28 overflow-hidden cursor-pointer';

    const barFill = document.createElement('div');
    const isCompleted = act.daily_goal > 0 && dayData.total >= act.daily_goal;
    const fillBg = isCompleted ? '#32d74b' : (act.color || '#007aff');
    const fillGlow = isCompleted ? 'rgba(66, 227, 85, 0.4)' : `${act.color || '#007aff'}40`;

    barFill.className = 'absolute bottom-0 left-0 w-full rounded-t-full transition-all duration-700 ease-out';
    barFill.style.height = `${hPercent}%`;
    barFill.style.backgroundColor = fillBg;
    barFill.style.boxShadow = `0 0 10px ${fillGlow}`;

    const tooltip = document.createElement('div');
    tooltip.className = 'absolute bottom-32 bg-on-surface text-background text-xs font-bold rounded py-1 px-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10';
    tooltip.textContent = `${Number(dayData.total.toFixed(1))} ${act.unit}`;

    barTrack.appendChild(barFill);
    flexBar.appendChild(tooltip);
    flexBar.appendChild(barTrack);

    const label = document.createElement('span');
    label.className = `font-label-caps text-[10px] ${isToday ? 'font-bold text-primary' : 'text-on-surface-variant/60'}`;
    label.textContent = dayName;
    flexBar.appendChild(label);

    flexBars.appendChild(flexBar);
  });

  chartCard.appendChild(flexBars);
  chartSection.appendChild(chartCard);
  viewContainer.appendChild(chartSection);

  // 3. ДОСТИЖЕНИЯ (ACHIEVEMENTS)
  const achSection = document.createElement('section');
  achSection.className = 'mb-md';
  achSection.innerHTML = '<h2 class="font-headline-md text-headline-md text-on-surface mb-md">Achievements</h2>';

  const achScroll = document.createElement('div');
  achScroll.className = 'flex gap-md overflow-x-auto pb-4 no-scrollbar';

  const badges = [
    { title: 'First Step', icon: 'military_tech', unlocked: totalReps > 0, glow: 'neon-glow-primary', color: 'text-primary' },
    { title: '14d Streak', icon: 'local_fire_department', unlocked: act.streak >= 14, glow: 'neon-glow-secondary', color: 'text-secondary' },
    { title: '100 Club', icon: 'emoji_events', unlocked: totalReps >= 100, glow: 'neon-glow-tertiary', color: 'text-tertiary' },
    { title: 'Elite Level', icon: 'workspace_premium', unlocked: totalReps >= 500, glow: 'neon-glow-primary', color: 'text-primary' }
  ];

  badges.forEach((badge, index) => {
    const card = document.createElement('div');
    if (badge.unlocked) {
      card.className = 'flex-shrink-0 w-32 bg-surface-container-lowest p-md rounded-xl shadow-sm border border-white/5 flex flex-col items-center text-center';
      card.innerHTML = `
        <div class="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-base animate-float ${badge.glow}" style="animation-delay: ${index * 0.8}s">
          <span class="material-symbols-outlined ${badge.color} text-3xl font-bold active-icon">${badge.icon}</span>
        </div>
        <span class="font-label-caps text-[10px] text-on-surface leading-tight font-bold">${badge.title}</span>
      `;
    } else {
      card.className = 'flex-shrink-0 w-32 bg-surface-container-low p-md rounded-xl flex flex-col items-center text-center opacity-40';
      card.innerHTML = `
        <div class="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mb-base">
          <span class="material-symbols-outlined text-on-surface-variant text-3xl">lock</span>
        </div>
        <span class="font-label-caps text-[10px] text-on-surface-variant leading-tight font-semibold">${badge.title}</span>
      `;
    }
    achScroll.appendChild(card);
  });

  achSection.appendChild(achScroll);
  viewContainer.appendChild(achSection);

  // 4. ПОСЛЕДНИЕ ЛОГИ (RECENT LOGS)
  const logsSection = document.createElement('section');
  logsSection.className = 'mb-md';
  logsSection.innerHTML = `
    <div class="flex justify-between items-center mb-md">
      <h2 class="font-headline-md text-headline-md text-on-surface">Recent Logs</h2>
    </div>
  `;

  const logsList = document.createElement('div');
  logsList.className = 'space-y-md';

  const loggedDays = series.filter(s => s.total > 0).reverse();

  if (loggedDays.length === 0) {
    const emptyLog = document.createElement('div');
    emptyLog.className = 'p-md bg-surface-container-lowest rounded-xl text-center text-on-surface-variant border border-white/5 font-semibold';
    emptyLog.textContent = 'Нет записей за последнее время';
    logsList.appendChild(emptyLog);
  } else {
    loggedDays.forEach(dayData => {
      const parts = dayData.day.split('-');
      const formatted = `${parts[2]}.${parts[1]}.${parts[0]}`;

      const logItem = document.createElement('div');
      logItem.className = 'flex items-center justify-between p-md bg-surface-container-lowest rounded-xl shadow-sm border border-white/5';
      logItem.innerHTML = `
        <div class="flex items-center gap-md">
          <div class="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary">
            <span class="material-symbols-outlined">fitness_center</span>
          </div>
          <div>
            <span class="block font-label-caps text-[10px] text-on-surface font-extrabold">${formatted}</span>
            <span class="block text-on-surface-variant/60 text-xs font-semibold">Daily logs</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-headline-md text-headline-md font-bold text-primary">${Number(dayData.total.toFixed(1))}</span>
          <span class="text-on-surface-variant/40 text-xs font-bold">${act.unit}</span>
        </div>
      `;
      logsList.appendChild(logItem);
    });
  }

  logsSection.appendChild(logsList);
  viewContainer.appendChild(logsSection);
}

// --- 4.3 ТАБ 2: Habits (CRUD) ---
async function renderActivitiesTab() {
  const title = document.createElement('h2');
  title.className = 'font-headline-md text-headline-md font-bold text-on-surface mb-lg px-xs';
  title.textContent = 'Управление привычками';
  viewContainer.appendChild(title);

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
    const emptyCard = document.createElement('div');
    emptyCard.className = 'bg-surface-container-lowest p-xl rounded-xl text-center text-on-surface-variant border border-white/5 font-semibold mb-lg';
    emptyCard.textContent = 'Список привычек пуст. Добавьте первую прямо сейчас!';
    viewContainer.appendChild(emptyCard);
  } else {
    const list = document.createElement('div');
    list.className = 'space-y-lg mb-lg';

    activities.forEach(act => {
      const item = document.createElement('div');
      item.className = 'bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-white/5 flex items-center justify-between active-interaction hover:border-primary transition-all';
      
      const emoji = getEmoji(act.name);

      const left = document.createElement('div');
      left.innerHTML = `
        <h3 class="font-headline-md text-headline-md font-bold text-on-surface">${emoji} ${act.name}</h3>
        <div class="font-label-caps text-[10px] text-on-surface-variant/60 mt-1 font-bold">ЦЕЛЬ: ${act.daily_goal} ${act.unit.toUpperCase()}</div>
      `;

      const right = document.createElement('div');
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'px-4 py-2 border border-white/10 bg-white/5 rounded-lg font-label-caps text-label-caps text-on-surface hover:bg-white/10 active-interaction transition-all';
      editBtn.textContent = 'ИЗМЕНИТЬ';
      editBtn.addEventListener('click', () => {
        openActivityModal(act);
      });

      right.appendChild(editBtn);
      item.appendChild(left);
      item.appendChild(right);
      list.appendChild(item);
    });

    viewContainer.appendChild(list);
  }

  const addBtn = document.createElement('button');
  addBtn.className = 'w-full py-5 bg-primary/10 border border-dashed border-primary/30 text-primary hover:bg-primary/20 transition-all font-bold text-headline-md rounded-xl flex items-center justify-center gap-2 active-interaction font-label-caps text-label-caps';
  addBtn.type = 'button';
  addBtn.innerHTML = `
    <span class="material-symbols-outlined font-bold text-2xl">add</span>
    ДОБАВИТЬ ПРИВЫЧКУ
  `;
  addBtn.addEventListener('click', () => {
    openActivityModal(null);
  });

  viewContainer.appendChild(addBtn);
}

// --- 4.4 ТАБ 3: АНАЛИЗ (STATS) ---
async function renderStatsTab() {
  const todayDate = localDay();

  const title = document.createElement('h2');
  title.className = 'font-headline-md text-headline-md font-bold text-on-surface mb-lg px-xs';
  title.textContent = 'Глобальная Аналитика';
  viewContainer.appendChild(title);

  let statsResponse;
  try {
    statsResponse = await api.getStats(todayDate, 7);
  } catch (err) {
    showToast('Ошибка загрузки статистики', 'error');
    return;
  }

  const activities = statsResponse.activities || [];
  if (activities.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'bg-surface-container-lowest p-xl rounded-xl text-center text-on-surface-variant border border-white/5 font-semibold';
    emptyMsg.textContent = 'Нет данных для аналитики.';
    viewContainer.appendChild(emptyMsg);
    return;
  }

  const list = document.createElement('div');
  list.className = 'space-y-lg';

  activities.forEach(act => {
    const card = document.createElement('div');
    card.className = 'bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-white/5';

    const series = act.series || [];
    const sum = series.reduce((acc, curr) => acc + curr.total, 0);
    const emoji = getEmoji(act.name);

    card.innerHTML = `
      <div class="flex justify-between items-center mb-md border-b border-white/5 pb-3">
        <div>
          <h3 class="font-headline-md text-headline-md font-bold text-on-surface">${emoji} ${act.name}</h3>
          <span class="text-on-surface-variant/60 font-semibold text-xs">Недельная сумма: ${Number(sum.toFixed(1))} ${act.unit}</span>
        </div>
        <div class="text-right">
          <span class="block font-headline-md text-headline-md font-bold text-primary">🔥 ${act.streak}</span>
          <span class="block font-label-caps text-[10px] text-on-surface-variant/60 font-bold">DAYS STREAK</span>
        </div>
      </div>
    `;

    // SVG Мини-график аналитики
    const svgWidth = 460;
    const svgHeight = 70;
    const maxVal = Math.max(...series.map(s => s.total), act.daily_goal || 1);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    svg.setAttribute('class', 'w-full h-16 mt-3');

    const gap = 8;
    const barWidth = (svgWidth - gap * (series.length - 1)) / series.length;

    series.forEach((dayData, idx) => {
      const val = dayData.total;
      let barHeight = 0;
      if (maxVal > 0) {
        barHeight = (val / maxVal) * svgHeight;
      }
      if (val > 0 && barHeight < 5) barHeight = 5;

      const x = idx * (barWidth + gap);
      const y = svgHeight - barHeight;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x.toString());
      rect.setAttribute('y', y.toString());
      rect.setAttribute('width', barWidth.toString());
      rect.setAttribute('height', barHeight.toString());
      rect.setAttribute('rx', '4');

      const isCompleted = act.daily_goal > 0 && val >= act.daily_goal;
      const barColor = isCompleted ? '#32d74b' : (val > 0 ? (act.color || '#007aff') : 'rgba(255,255,255,0.05)');
      rect.setAttribute('fill', barColor);
      
      if (val > 0) {
        rect.setAttribute('style', `filter: drop-shadow(0px 0px 4px ${barColor}40)`);
      }

      const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      titleEl.textContent = `${dayData.day}: ${Number(val.toFixed(1))} / ${act.daily_goal} ${act.unit}`;
      rect.appendChild(titleEl);

      svg.appendChild(rect);
    });

    card.appendChild(svg);
    list.appendChild(card);
  });

  viewContainer.appendChild(list);
}

// ==========================================
// 5. МОДАЛЬНЫЕ ОКНА (MODALS)
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

// Модалка FAB логов
const logModal = document.getElementById('logModal');
const logForm = document.getElementById('logForm');
const logActivitySelect = document.getElementById('logActivitySelect');
const logAmountInput = document.getElementById('logAmountInput');

// Инициализация палитры цветов в модальном окне
function initColorPicker() {
  colorPicker.textContent = '';
  COLOR_PRESETS.forEach(color => {
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = color;
    swatch.setAttribute('data-color', color);

    if (state.selectedColor === color) {
      swatch.classList.add('active');
    }

    swatch.addEventListener('click', () => {
      const swatches = colorPicker.querySelectorAll('.swatch');
      swatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      state.selectedColor = color;
      actColorInput.value = color;
    });

    colorPicker.appendChild(swatch);
  });
}

function openActivityModal(activity = null) {
  if (activity) {
    modalTitle.textContent = 'Редактировать привычку';
    activityIdInput.value = activity.id;
    actNameInput.value = activity.name;
    actUnitInput.value = activity.unit || '';
    actGoalInput.value = activity.daily_goal || 0;
    state.selectedColor = activity.color || '#007aff';
    actColorInput.value = state.selectedColor;
    deleteActivityBtn.hidden = false;
  } else {
    modalTitle.textContent = 'Новая привычка';
    activityIdInput.value = '';
    activityForm.reset();
    state.selectedColor = '#007aff';
    actColorInput.value = '#007aff';
    deleteActivityBtn.hidden = true;
  }

  initColorPicker();
  activityModal.classList.remove('hidden');
}

function closeActivityModal() {
  activityModal.classList.add('hidden');
}

// Модалка быстрой записи
function openLogModal() {
  logActivitySelect.textContent = '';
  
  if (state.activities.length === 0) {
    showToast('Сначала создайте привычку во вкладке Habits', 'error');
    return;
  }

  state.activities.forEach(act => {
    const opt = document.createElement('option');
    opt.value = act.id;
    opt.textContent = `${act.name} (${act.unit})`;
    logActivitySelect.appendChild(opt);
  });

  if (state.selectedActivityId) {
    logActivitySelect.value = state.selectedActivityId;
  }

  logAmountInput.value = '';
  logModal.classList.remove('hidden');
}

function closeLogModal() {
  logModal.classList.add('hidden');
}

// ==========================================
// 6. ИНИЦИАЛИЗАЦИЯ И СОБЫТИЯ
// ==========================================
async function initApp() {
  try {
    const res = await api.getMe();
    if (res && res.user) {
      state.user = res.user;
      userEmailSpan.textContent = res.user.email;
      authScreen.classList.add('hidden');
      appScreen.classList.remove('hidden');
      await renderCurrentTab();
    } else {
      state.user = null;
      renderAuth();
    }
  } catch (err) {
    state.user = null;
    renderAuth();
  }
}

// Отправка формы авторизации
document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const authError = document.getElementById('authError');
  authError.textContent = '';

  try {
    let res;
    if (authMode === 'login') {
      res = await api.login(email, password);
      showToast('С возвращением!');
    } else {
      res = await api.register(email, password);
      showToast('Вход выполнен!');
    }

    if (res && res.user) {
      state.user = res.user;
      userEmailSpan.textContent = res.user.email;
      authScreen.classList.add('hidden');
      appScreen.classList.remove('hidden');
      state.activeTab = 'today';
      state.selectedActivityId = null;
      await renderCurrentTab();
    }
  } catch (err) {
    authError.textContent = err.message || 'Ошибка входа/регистрации';
  }
});

// Клик по табам авторизации
document.getElementById('authTabs').addEventListener('click', (e) => {
  const action = e.target.getAttribute('data-action');
  if (!action) return;

  authMode = action === 'login-tab' ? 'login' : 'register';
  renderAuth();
});

// Навигационный таб-бар
document.querySelectorAll('nav .tab').forEach(btn => {
  btn.addEventListener('click', async () => {
    const tabName = btn.getAttribute('data-tab');
    if (!tabName) return;

    state.activeTab = tabName;
    state.selectedActivityId = null;
    await renderCurrentTab();
  });
});

// Кнопка Назад (выход из drill-down)
backBtn.addEventListener('click', async () => {
  state.selectedActivityId = null;
  await renderCurrentTab();
});

// FAB
fabBtn.addEventListener('click', openLogModal);

// Выход из аккаунта
document.getElementById('logoutBtn').addEventListener('click', async () => {
  if (confirm('Вы уверены, что хотите выйти?')) {
    try {
      await api.logout();
      state.user = null;
      state.selectedActivityId = null;
      showToast('Сессия завершена');
      renderAuth();
    } catch (err) {
      showToast('Не удалось совершить выход', 'error');
    }
  }
});

// Закрытие модальных окон
document.getElementById('closeModalBtn').addEventListener('click', closeActivityModal);
document.getElementById('cancelModalBtn').addEventListener('click', closeActivityModal);

document.getElementById('closeLogModalBtn').addEventListener('click', closeLogModal);
document.getElementById('cancelLogModalBtn').addEventListener('click', closeLogModal);

// Сохранение лога из FAB
logForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const actId = parseInt(logActivitySelect.value);
  const amount = parseFloat(logAmountInput.value);
  const todayDate = localDay();

  if (isNaN(actId) || isNaN(amount) || amount <= 0) return;

  try {
    await api.addLog(actId, amount, todayDate);
    showToast('Запись успешно добавлена!');
    closeLogModal();
    await renderCurrentTab();
  } catch (err) {
    showToast('Не удалось сохранить лог', 'error');
  }
});

// Сохранение/Редактирование привычки
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
    showToast('Не удалось сохранить активность', 'error');
  }
});

// Удаление привычки
deleteActivityBtn.addEventListener('click', async () => {
  const id = activityIdInput.value;
  if (!id) return;

  if (confirm('Вы действительно хотите безвозвратно удалить эту привычку?')) {
    try {
      await api.deleteActivity(id);
      showToast('Привычка удалена', 'error');
      closeActivityModal();
      if (state.selectedActivityId === parseInt(id)) {
        state.selectedActivityId = null;
      }
      await renderCurrentTab();
    } catch (err) {
      showToast('Не удалось удалить привычку', 'error');
    }
  }
});

// Клик по любому элементу добавляет красивый волновой эффект (ripple)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button, .tab, .swatch');
  if (!btn) return;
  
  const rect = btn.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const ripple = document.createElement('span');
  ripple.style.position = 'absolute';
  ripple.style.width = '2px';
  ripple.style.height = '2px';
  ripple.style.background = 'rgba(255, 255, 255, 0.25)';
  ripple.style.borderRadius = '50%';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.transform = 'scale(0)';
  ripple.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
  ripple.style.pointerEvents = 'none';
  
  btn.style.position = btn.style.position || 'relative';
  btn.appendChild(ripple);
  
  requestAnimationFrame(() => {
    ripple.style.transform = 'scale(100)';
    ripple.style.opacity = '0';
  });
  
  setTimeout(() => ripple.remove(), 500);
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initApp);
