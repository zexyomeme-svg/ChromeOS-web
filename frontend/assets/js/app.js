const STORAGE_KEY = 'arena-web-chromeos-v1';
const savedSnapshot = localStorage.getItem(STORAGE_KEY);
const hasSavedSnapshot = !!savedSnapshot;

const WALLPAPERS = [
  {
    id: 'aurora',
    name: 'Aurora Blue',
    css: 'radial-gradient(circle at 18% 20%, rgba(255,255,255,0.28), transparent 28%), radial-gradient(circle at 78% 16%, rgba(255,255,255,0.2), transparent 24%), linear-gradient(135deg, #0b4ec3 0%, #5f8dff 25%, #8cd1ff 55%, #f2f7ff 100%)',
  },
  {
    id: 'sunrise',
    name: 'Warm Sunrise',
    css: 'radial-gradient(circle at 20% 25%, rgba(255,255,255,0.24), transparent 28%), radial-gradient(circle at 85% 20%, rgba(255,214,164,0.28), transparent 26%), linear-gradient(140deg, #ff7a59 0%, #ffb057 30%, #ffd89a 60%, #fff6dd 100%)',
  },
  {
    id: 'dusk',
    name: 'Dusk Violet',
    css: 'radial-gradient(circle at 20% 15%, rgba(255,255,255,0.24), transparent 26%), radial-gradient(circle at 80% 22%, rgba(148,163,255,0.24), transparent 28%), linear-gradient(145deg, #311b92 0%, #673ab7 36%, #9c6dff 70%, #f3e8ff 100%)',
  },
  {
    id: 'ocean',
    name: 'Ocean Glass',
    css: 'radial-gradient(circle at 10% 15%, rgba(255,255,255,0.22), transparent 25%), radial-gradient(circle at 80% 10%, rgba(186, 230, 253, 0.24), transparent 22%), linear-gradient(145deg, #045d75 0%, #0ea5e9 36%, #67e8f9 70%, #dffcff 100%)',
  },
  {
    id: 'forest',
    name: 'Forest Dawn',
    css: 'radial-gradient(circle at 18% 18%, rgba(255,255,255,0.22), transparent 28%), radial-gradient(circle at 82% 18%, rgba(187,247,208,0.24), transparent 24%), linear-gradient(150deg, #124d38 0%, #1f8a70 40%, #76c893 70%, #edfdf5 100%)',
  },
];

const ACCENTS = ['#3b82f6', '#2563eb', '#0ea5e9', '#10b981', '#f97316', '#8b5cf6', '#ec4899'];

const APP_IDS = ['browser', 'files', 'text', 'notes', 'calculator', 'calendar', 'camera', 'gallery', 'terminal', 'tasks', 'mail', 'clock', 'paint', 'media', 'settings'];

const dom = {
  system: document.getElementById('system'),
  wallpaper: document.getElementById('wallpaper-layer'),
  nightLight: document.getElementById('night-light-layer'),
  brightness: document.getElementById('brightness-layer'),
  bootScreen: document.getElementById('boot-screen'),
  lockScreen: document.getElementById('lock-screen'),
  lockTime: document.getElementById('lock-time'),
  lockDate: document.getElementById('lock-date'),
  lockAuthPanel: document.getElementById('lock-auth-panel'),
  deskStrip: document.getElementById('desk-strip'),
  desktopIcons: document.getElementById('desktop-icons'),
  widgetRail: document.getElementById('widget-rail'),
  windowsLayer: document.getElementById('windows-layer'),
  overviewLayer: document.getElementById('overview-layer'),
  launcher: document.getElementById('launcher'),
  launcherButton: document.getElementById('launcher-button'),
  desksButton: document.getElementById('desks-button'),
  profileButton: document.getElementById('profile-button'),
  profileAvatar: document.getElementById('profile-avatar'),
  launcherSearch: document.getElementById('launcher-search'),
  launcherAppGrid: document.getElementById('launcher-app-grid'),
  launcherResults: document.getElementById('launcher-results'),
  quickSettings: document.getElementById('quick-settings'),
  notificationsPanel: document.getElementById('notifications-panel'),
  notificationsButton: document.getElementById('notifications-button'),
  notificationDot: document.getElementById('notification-dot'),
  shelfApps: document.getElementById('shelf-apps'),
  systemStatus: document.getElementById('system-status'),
  statusClock: document.getElementById('status-clock'),
  statusWifi: document.getElementById('status-wifi'),
  statusBattery: document.getElementById('status-battery'),
  contextMenu: document.getElementById('context-menu'),
  toastContainer: document.getElementById('toast-container'),
  modalLayer: document.getElementById('modal-layer'),
};

let windows = [];
let zCounter = 20;
let activeWindowId = null;
let batteryApi = null;
let modalResolver = null;
let isBooted = false;
let runtimeStats = {
  connected: false,
  source: 'browser',
  environment: 'browser',
  performanceProfile: 'browser',
  host: {
    cpuCores: navigator.hardwareConcurrency || 0,
    totalMemMb: navigator.deviceMemory ? navigator.deviceMemory * 1024 : null,
    freeMemMb: null,
    uptimeSec: 0,
    loadAvg: [0, 0, 0],
    nodeVersion: null,
    hostname: 'client',
    platform: navigator.platform || 'browser',
    arch: null,
  },
  process: {
    rssMb: null,
    heapTotalMb: null,
    heapUsedMb: null,
    externalMb: null,
    pid: null,
  },
  render: {
    serviceName: null,
    instanceId: null,
    region: null,
    gitCommit: null,
    gitBranch: null,
  },
  timestamp: null,
};
let runtimeStatsTimer = null;
let networkState = {
  online: navigator.onLine,
  type: navigator.connection?.effectiveType || navigator.connection?.type || '',
  saveData: !!navigator.connection?.saveData,
};
let overviewOpen = false;

function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized;
  const num = Number.parseInt(full, 16);
  return [num >> 16 & 255, num >> 8 & 255, num & 255];
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function debounce(fn, wait = 200) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function dateToLocalIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayIso() {
  return dateToLocalIso(new Date());
}

function formatTime(date = new Date(), twentyFour = state.settings.twentyFourHour) {
  return new Intl.DateTimeFormat([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !twentyFour,
  }).format(date);
}

function formatDateLong(date = new Date()) {
  return new Intl.DateTimeFormat([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function formatFileSize(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatUptimeShort(seconds = 0) {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function getRuntimePollingMs() {
  if (runtimeStats.performanceProfile === 'economy') return 12000;
  if (runtimeStats.performanceProfile === 'performance') return 3500;
  return 7000;
}

function applyAdaptiveMode() {
  dom.system.classList.remove('perf-economy', 'perf-balanced', 'perf-performance', 'perf-browser');
  const profile = runtimeStats.performanceProfile || 'browser';
  dom.system.classList.add(`perf-${profile}`);
}

function runtimeStatsSummary() {
  const host = runtimeStats.host || {};
  const processStats = runtimeStats.process || {};
  return {
    profile: runtimeStats.performanceProfile || 'browser',
    cpu: host.cpuCores || 0,
    ramMb: host.totalMemMb || null,
    freeRamMb: host.freeMemMb || null,
    rssMb: processStats.rssMb || null,
    heapMb: processStats.heapUsedMb || null,
    environment: runtimeStats.environment || 'browser',
    uptimeSec: host.uptimeSec || 0,
    connected: !!runtimeStats.connected,
  };
}

function startRuntimeStatsPolling() {
  async function pull() {
    try {
      const response = await fetch('/api/stats', { cache: 'no-store' });
      if (!response.ok) throw new Error('stats unavailable');
      const data = await response.json();
      runtimeStats = { ...runtimeStats, ...data, connected: true, source: 'server' };
    } catch (error) {
      runtimeStats.connected = false;
      runtimeStats.source = 'browser';
      runtimeStats.environment = 'browser';
      runtimeStats.host = {
        ...runtimeStats.host,
        cpuCores: navigator.hardwareConcurrency || runtimeStats.host.cpuCores || 0,
        totalMemMb: navigator.deviceMemory ? navigator.deviceMemory * 1024 : runtimeStats.host.totalMemMb,
      };
      if (!runtimeStats.performanceProfile || runtimeStats.performanceProfile === 'browser') {
        const mem = runtimeStats.host.totalMemMb || 0;
        const cpu = runtimeStats.host.cpuCores || 0;
        runtimeStats.performanceProfile = mem && cpu ? (mem < 768 || cpu < 2 ? 'economy' : mem < 4096 || cpu < 4 ? 'balanced' : 'performance') : 'browser';
      }
    }
    applyAdaptiveMode();
    if (!dom.quickSettings.classList.contains('hidden')) renderQuickSettings();
    renderWidgetRail();
    clearTimeout(runtimeStatsTimer);
    runtimeStatsTimer = setTimeout(pull, getRuntimePollingMs());
  }
  pull();
}

function updateNetworkState() {
  networkState.online = navigator.onLine;
  networkState.type = navigator.connection?.effectiveType || navigator.connection?.type || '';
  networkState.saveData = !!navigator.connection?.saveData;
  renderStatus();
  if (!dom.quickSettings.classList.contains('hidden')) renderQuickSettings();
}

function getNetworkCaption() {
  if (!networkState.online) return 'Offline';
  const parts = ['Online'];
  if (networkState.type) parts.push(networkState.type.toUpperCase());
  if (networkState.saveData) parts.push('Data saver');
  return parts.join(' • ');
}

function getBatteryCaption() {
  const battery = Math.round(state.battery.level || 0);
  return `${state.battery.charging ? 'Charging' : 'Battery'} • ${battery}%`;
}

function encodeSvgDataUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createSampleSvg(title, colors) {
  const [a, b, c] = colors;
  return encodeSvgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${a}" />
          <stop offset="50%" stop-color="${b}" />
          <stop offset="100%" stop-color="${c}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#g)" />
      <circle cx="210" cy="180" r="170" fill="rgba(255,255,255,.18)" />
      <circle cx="980" cy="140" r="140" fill="rgba(255,255,255,.14)" />
      <rect x="0" y="520" width="1200" height="280" fill="rgba(255,255,255,.08)" />
      <text x="90" y="690" fill="white" font-size="92" font-family="Arial, sans-serif" font-weight="700">${title}</text>
      <text x="94" y="740" fill="rgba(255,255,255,.75)" font-size="28" font-family="Arial, sans-serif">Generated demo artwork for the Web ChromeOS Gallery</text>
    </svg>
  `);
}

function createDefaultFiles() {
  const now = Date.now();
  return [
    { path: '/', name: '/', kind: 'folder', modified: now },
    { path: '/Downloads', name: 'Downloads', kind: 'folder', modified: now },
    { path: '/Documents', name: 'Documents', kind: 'folder', modified: now },
    { path: '/Pictures', name: 'Pictures', kind: 'folder', modified: now },
    { path: '/Notes', name: 'Notes', kind: 'folder', modified: now },
    {
      path: '/Documents/Welcome.txt',
      name: 'Welcome.txt',
      kind: 'file',
      mime: 'text/plain',
      modified: now,
      size: 366,
      content: 'Welcome to ChromeOS Web!\n\nIncluded apps:\n• Browser with tabs and local pages\n• Files with import, folders, preview, and downloads\n• Text editor\n• Notes board\n• Calculator\n• Calendar with events\n• Camera with snapshot capture\n• Gallery\n• Terminal\n• Settings\n\nTip: Press Ctrl + Space to open the launcher.',
    },
    {
      path: '/Notes/Project Ideas.md',
      name: 'Project Ideas.md',
      kind: 'file',
      mime: 'text/markdown',
      modified: now,
      size: 180,
      content: '# Ideas\n\n- Build a kiosk dashboard\n- Use the Gallery for mock shots\n- Organize files in Documents\n- Add events to the Calendar\n- Use Terminal commands like ls, cat, mkdir, touch, open',
    },
    {
      path: '/Pictures/Aurora Demo.svg',
      name: 'Aurora Demo.svg',
      kind: 'file',
      mime: 'image/svg+xml',
      modified: now,
      content: createSampleSvg('Aurora Demo', ['#2563eb', '#60a5fa', '#dbeafe']),
      size: 18200,
    },
    {
      path: '/Pictures/Sunrise Demo.svg',
      name: 'Sunrise Demo.svg',
      kind: 'file',
      mime: 'image/svg+xml',
      modified: now,
      content: createSampleSvg('Sunrise Demo', ['#ea580c', '#fb923c', '#ffedd5']),
      size: 17600,
    },
  ];
}

function createDefaultTasks() {
  return [
    { id: uid('task'), title: 'Review welcome files', done: false, due: todayIso(), priority: 'High', list: 'Personal', notes: 'Open Files and inspect the starter documents.' },
    { id: uid('task'), title: 'Customize wallpaper', done: false, due: todayIso(), priority: 'Medium', list: 'Setup', notes: 'Try Gallery and Settings.' },
    { id: uid('task'), title: 'Reply to design inbox', done: true, due: todayIso(), priority: 'Low', list: 'Work', notes: 'The demo Mail app has a few sample messages.' },
  ];
}

function createDefaultMailbox(profileName = 'Owner') {
  const now = Date.now();
  return [
    {
      id: uid('mail'),
      folder: 'inbox',
      from: 'design-team@arena.local',
      to: `${profileName.toLowerCase()}@chromeos-web.local`,
      subject: 'Welcome to your upgraded desktop',
      body: 'Your web desktop now supports profiles, widgets, mail, media playback, multiple desks, and extra apps. Explore the launcher to find everything.',
      read: false,
      time: now - 1000 * 60 * 32,
    },
    {
      id: uid('mail'),
      folder: 'inbox',
      from: 'calendar@arena.local',
      to: `${profileName.toLowerCase()}@chromeos-web.local`,
      subject: 'Today has 2 upcoming events',
      body: 'Open Calendar or check the widget rail to review your agenda for today.',
      read: true,
      time: now - 1000 * 60 * 140,
    },
    {
      id: uid('mail'),
      folder: 'sent',
      from: `${profileName.toLowerCase()}@chromeos-web.local`,
      to: 'team@arena.local',
      subject: 'Desktop prototype update',
      body: 'The prototype includes a ChromeOS-style shelf, launcher, windows, quick settings, and more apps.',
      read: true,
      time: now - 1000 * 60 * 350,
    },
  ];
}

function createDefaultDesks() {
  const first = uid('desk');
  const second = uid('desk');
  return {
    desks: [
      { id: first, name: 'Desk 1' },
      { id: second, name: 'Focus' },
    ],
    currentDeskId: first,
  };
}

function createDefaultState(profileName = 'Owner') {
  const now = Date.now();
  const deskState = createDefaultDesks();
  return {
    settings: {
      theme: 'light',
      accent: '#3b82f6',
      wallpaper: 'aurora',
      brightness: 100,
      volume: 64,
      wifi: true,
      bluetooth: false,
      dnd: false,
      nightLight: false,
      batterySaver: false,
      twentyFourHour: false,
      locked: false,
      widgets: false,
      deskBar: false,
      compactShelf: false,
    },
    pinnedApps: ['browser', 'files', 'mail', 'tasks', 'text', 'notes', 'clock', 'media', 'settings'],
    battery: {
      level: 87,
      charging: true,
      updated: now,
    },
    files: createDefaultFiles(),
    notes: [
      {
        id: uid('note'),
        title: 'Welcome',
        color: '#fff1a8',
        updated: now,
        content: 'This Notes app autosaves. Create a few sticky notes, then use the launcher to jump between apps quickly.',
      },
      {
        id: uid('note'),
        title: 'Things to try',
        color: '#c9f7d5',
        updated: now,
        content: 'Open Files\nTake a snapshot in Camera\nSwitch wallpapers in Settings\nUse Terminal commands like help, ls, cat, open settings',
      },
    ],
    tasks: createDefaultTasks(),
    mailbox: createDefaultMailbox(profileName),
    events: [
      {
        id: uid('evt'),
        title: 'Explore the new desktop',
        date: todayIso(),
        time: '09:30',
        color: '#3b82f6',
      },
      {
        id: uid('evt'),
        title: 'Review imported files',
        date: todayIso(),
        time: '14:00',
        color: '#10b981',
      },
    ],
    notifications: [
      {
        id: uid('n'),
        title: 'System ready',
        body: 'Your ChromeOS-style desktop has loaded successfully.',
        time: now,
        appId: 'system',
      },
    ],
    recentApps: ['browser', 'files', 'notes', 'mail'],
    desks: deskState.desks,
    currentDeskId: deskState.currentDeskId,
    profileMeta: {
      displayName: profileName,
      signature: `Sent from ${profileName}'s ChromeOS Web desktop`,
    },
    media: {
      lastPath: '',
      lastType: '',
    },
  };
}

function mergeProfileState(parsed = {}) {
  const defaults = createDefaultState(parsed.profileMeta?.displayName || 'Owner');
  const merged = {
    ...defaults,
    ...parsed,
    settings: { ...defaults.settings, ...(parsed.settings || {}) },
    battery: { ...defaults.battery, ...(parsed.battery || {}) },
    pinnedApps: Array.isArray(parsed.pinnedApps) ? parsed.pinnedApps : defaults.pinnedApps,
    files: Array.isArray(parsed.files) ? parsed.files : defaults.files,
    notes: Array.isArray(parsed.notes) ? parsed.notes : defaults.notes,
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : defaults.tasks,
    mailbox: Array.isArray(parsed.mailbox) ? parsed.mailbox : defaults.mailbox,
    events: Array.isArray(parsed.events) ? parsed.events : defaults.events,
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : defaults.notifications,
    recentApps: Array.isArray(parsed.recentApps) ? parsed.recentApps : defaults.recentApps,
    desks: Array.isArray(parsed.desks) ? parsed.desks : defaults.desks,
    profileMeta: { ...defaults.profileMeta, ...(parsed.profileMeta || {}) },
    media: { ...defaults.media, ...(parsed.media || {}) },
  };
  ensureRequiredFolders(merged.files);
  if (!Array.isArray(merged.desks) || !merged.desks.length) {
    const deskState = createDefaultDesks();
    merged.desks = deskState.desks;
    merged.currentDeskId = deskState.currentDeskId;
  }
  if (!merged.currentDeskId || !merged.desks.some((desk) => desk.id === merged.currentDeskId)) {
    merged.currentDeskId = merged.desks[0].id;
  }
  return merged;
}

function createDefaultProfile(name, avatar, options = {}) {
  const profile = {
    id: uid('profile'),
    name,
    avatar,
    color: options.color || '#3b82f6',
    pin: options.pin || '',
    lastLogin: 0,
    data: createDefaultState(name),
  };
  if (options.guest) {
    profile.data.settings.theme = 'dark';
    profile.data.settings.wallpaper = 'ocean';
    profile.data.profileMeta.signature = 'Sent from Guest mode';
  }
  return profile;
}

function createDefaultStore() {
  const owner = createDefaultProfile('Owner', 'O', { color: '#3b82f6' });
  const guest = createDefaultProfile('Guest', 'G', { color: '#06b6d4', guest: true });
  return {
    version: 2,
    currentProfileId: owner.id,
    profiles: [owner, guest],
  };
}

let store = null;

function getCurrentProfile() {
  if (!store?.profiles?.length) return null;
  return store.profiles.find((profile) => profile.id === store.currentProfileId) || store.profiles[0];
}

function loadStore() {
  if (!savedSnapshot) return createDefaultStore();
  try {
    const parsed = JSON.parse(savedSnapshot);
    if (parsed?.version === 2 && Array.isArray(parsed.profiles)) {
      const profiles = parsed.profiles.map((profile, index) => ({
        ...profile,
        name: profile.name || `Profile ${index + 1}`,
        avatar: profile.avatar || (profile.name || 'P').slice(0, 1).toUpperCase(),
        color: profile.color || ACCENTS[index % ACCENTS.length],
        pin: profile.pin || '',
        lastLogin: profile.lastLogin || 0,
        data: mergeProfileState(profile.data || {}),
      }));
      return {
        version: 2,
        currentProfileId: parsed.currentProfileId || profiles[0]?.id,
        profiles,
      };
    }
    const owner = createDefaultProfile('Owner', 'O', { color: '#3b82f6' });
    owner.data = mergeProfileState(parsed || {});
    return {
      version: 2,
      currentProfileId: owner.id,
      profiles: [owner, createDefaultProfile('Guest', 'G', { color: '#06b6d4', guest: true })],
    };
  } catch (error) {
    console.error('Could not load state, resetting', error);
    return createDefaultStore();
  }
}

store = loadStore();
let state = mergeProfileState(getCurrentProfile()?.data || createDefaultState());
if (getCurrentProfile()) getCurrentProfile().data = state;
let session = {
  loggedIn: false,
  selectedProfileId: store.currentProfileId || getCurrentProfile()?.id,
  mode: 'signin',
  error: '',
};

const saveState = debounce(() => {
  const profile = getCurrentProfile();
  if (profile) {
    profile.data = state;
    store.currentProfileId = profile.id;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}, 180);

function normalizePath(path = '/') {
  let next = String(path).replace(/\\/g, '/').trim() || '/';
  if (!next.startsWith('/')) next = `/${next}`;
  next = next.replace(/\/+/g, '/');
  if (next.length > 1 && next.endsWith('/')) next = next.slice(0, -1);
  return next || '/';
}

function baseName(path) {
  const normalized = normalizePath(path);
  if (normalized === '/') return '/';
  return normalized.split('/').filter(Boolean).pop();
}

function parentPath(path) {
  const normalized = normalizePath(path);
  if (normalized === '/') return '/';
  const parts = normalized.split('/').filter(Boolean);
  parts.pop();
  return parts.length ? `/${parts.join('/')}` : '/';
}

function resolvePath(cwd = '/', input = '.') {
  const source = String(input || '.').trim();
  const raw = source.startsWith('/') ? source : `${cwd}/${source}`;
  const tokens = normalizePath(raw).split('/').filter(Boolean);
  const parts = [];
  tokens.forEach((token) => {
    if (token === '.' || token === '') return;
    if (token === '..') {
      parts.pop();
      return;
    }
    parts.push(token);
  });
  return parts.length ? `/${parts.join('/')}` : '/';
}

function getEntry(path) {
  return state.files.find((entry) => entry.path === normalizePath(path));
}

function ensureRequiredFolders(list = state.files) {
  const required = ['/', '/Downloads', '/Documents', '/Pictures', '/Notes'];
  required.forEach((folderPath) => {
    if (!list.some((entry) => entry.path === folderPath)) {
      list.push({ path: folderPath, name: baseName(folderPath), kind: 'folder', modified: Date.now() });
    }
  });
}

function listDirectory(path = '/') {
  const folder = normalizePath(path);
  return state.files
    .filter((entry) => entry.path !== folder && parentPath(entry.path) === folder)
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function folderChildren(path) {
  const normalized = normalizePath(path);
  return state.files.filter((entry) => entry.path.startsWith(`${normalized}/`));
}

function createFolder(path) {
  const normalized = normalizePath(path);
  if (getEntry(normalized)) throw new Error('An item with that name already exists.');
  const parent = getEntry(parentPath(normalized));
  if (!parent || parent.kind !== 'folder') throw new Error('Parent folder not found.');
  const folder = { path: normalized, name: baseName(normalized), kind: 'folder', modified: Date.now() };
  state.files.push(folder);
  saveState();
  return folder;
}

function createFile(path, content = '', mime = 'text/plain') {
  const normalized = normalizePath(path);
  if (getEntry(normalized)) throw new Error('A file with that name already exists.');
  const parent = getEntry(parentPath(normalized));
  if (!parent || parent.kind !== 'folder') throw new Error('Parent folder not found.');
  const file = {
    path: normalized,
    name: baseName(normalized),
    kind: 'file',
    mime,
    content,
    modified: Date.now(),
    size: content.length || 0,
  };
  state.files.push(file);
  saveState();
  return file;
}

function updateFile(path, content, mime) {
  const file = getEntry(path);
  if (!file || file.kind !== 'file') throw new Error('File not found.');
  file.content = content;
  if (mime) file.mime = mime;
  file.modified = Date.now();
  file.size = content.length || 0;
  saveState();
  return file;
}

function renamePath(oldPath, newName) {
  const current = getEntry(oldPath);
  if (!current || current.path === '/') throw new Error('Cannot rename this item.');
  const targetPath = normalizePath(`${parentPath(current.path)}/${newName}`);
  if (getEntry(targetPath)) throw new Error('That name is already in use.');
  const affected = state.files.filter((entry) => entry.path === current.path || entry.path.startsWith(`${current.path}/`));
  affected.forEach((entry) => {
    const suffix = entry.path.slice(current.path.length);
    entry.path = `${targetPath}${suffix}`;
    entry.name = baseName(entry.path);
    entry.modified = Date.now();
  });
  saveState();
}

function deletePath(path) {
  const normalized = normalizePath(path);
  if (normalized === '/') throw new Error('Cannot delete the root folder.');
  state.files = state.files.filter((entry) => entry.path !== normalized && !entry.path.startsWith(`${normalized}/`));
  saveState();
}

function downloadFile(entry) {
  if (!entry || entry.kind !== 'file') return;
  const anchor = document.createElement('a');
  if (entry.content.startsWith('data:')) {
    anchor.href = entry.content;
  } else {
    anchor.href = URL.createObjectURL(new Blob([entry.content], { type: entry.mime || 'text/plain' }));
  }
  anchor.download = entry.name;
  anchor.click();
  if (!entry.content.startsWith('data:')) {
    setTimeout(() => URL.revokeObjectURL(anchor.href), 500);
  }
}

function openFileEntry(entry) {
  if (!entry) return;
  if (entry.kind === 'folder') {
    openApp('files', { path: entry.path });
    return;
  }
  if ((entry.mime || '').startsWith('image/')) {
    openApp('gallery', { imagePath: entry.path, tab: 'pictures' });
    return;
  }
  if ((entry.mime || '').startsWith('audio/') || (entry.mime || '').startsWith('video/')) {
    openApp('media', { path: entry.path });
    return;
  }
  openApp('text', { path: entry.path });
}

function getSelectedProfile() {
  return store.profiles.find((profile) => profile.id === session.selectedProfileId) || store.profiles[0];
}

function setCurrentProfile(profileId) {
  const profile = store.profiles.find((item) => item.id === profileId);
  if (!profile) return null;
  store.currentProfileId = profile.id;
  session.selectedProfileId = profile.id;
  state = mergeProfileState(profile.data || createDefaultState(profile.name));
  profile.data = state;
  return profile;
}

function closeAllWindows() {
  windows.forEach((win) => {
    if (win.controller && typeof win.controller.onClose === 'function') win.controller.onClose();
    win.el.remove();
  });
  windows = [];
  activeWindowId = null;
  dom.windowsLayer.innerHTML = '';
}

function currentDesk() {
  return state.desks.find((desk) => desk.id === state.currentDeskId) || state.desks[0];
}

function syncWindowVisibility(win) {
  if (!win?.el) return;
  win.el.classList.toggle('minimized', !!win.minimized);
  win.el.classList.toggle('desk-hidden', win.deskId !== state.currentDeskId);
}

function refreshWindowVisibility() {
  windows.forEach(syncWindowVisibility);
  const visible = windows.filter((win) => !win.minimized && win.deskId === state.currentDeskId);
  if (!visible.some((win) => win.id === activeWindowId)) {
    activeWindowId = visible.length ? visible[visible.length - 1].id : null;
  }
  renderShelf();
  renderDeskStrip();
  if (overviewOpen) renderOverview();
}

function switchDesk(deskId) {
  if (!state.desks.some((desk) => desk.id === deskId)) return;
  state.currentDeskId = deskId;
  saveState();
  refreshWindowVisibility();
  renderWidgetRail();
}

function cycleDesk() {
  const desks = state.desks;
  const index = desks.findIndex((desk) => desk.id === state.currentDeskId);
  const next = desks[(index + 1) % desks.length] || desks[0];
  switchDesk(next.id);
  showToast('Desk switched', next.name);
}

async function createDeskPrompt() {
  const result = await showFormDialog({
    title: 'Create desk',
    fields: [{ name: 'name', label: 'Desk name', value: `Desk ${state.desks.length + 1}` }],
    submitLabel: 'Create',
  });
  if (!result?.name) return;
  const desk = { id: uid('desk'), name: result.name };
  state.desks.push(desk);
  state.currentDeskId = desk.id;
  saveState();
  renderDeskStrip();
  refreshWindowVisibility();
}

async function renameCurrentDeskPrompt() {
  const desk = currentDesk();
  if (!desk) return;
  const result = await showFormDialog({
    title: 'Rename desk',
    fields: [{ name: 'name', label: 'Desk name', value: desk.name }],
    submitLabel: 'Rename',
  });
  if (!result?.name) return;
  desk.name = result.name;
  saveState();
  renderDeskStrip();
}

function removeCurrentDesk() {
  if (state.desks.length <= 1) {
    showToast('Desk manager', 'At least one desk must remain.');
    return;
  }
  const desk = currentDesk();
  const fallback = state.desks.find((item) => item.id !== desk.id);
  windows.filter((win) => win.deskId === desk.id).forEach((win) => {
    win.deskId = fallback.id;
  });
  state.desks = state.desks.filter((item) => item.id !== desk.id);
  state.currentDeskId = fallback.id;
  saveState();
  refreshWindowVisibility();
}

function renderDeskStrip() {
  if (!dom.deskStrip) return;
  dom.deskStrip.classList.toggle('hidden', !state.settings.deskBar);
  dom.desksButton.title = `Overview and desks • ${currentDesk()?.name || 'Desk'}`;
  dom.deskStrip.innerHTML = `
    ${state.desks.map((desk, index) => `
      <button class="desk-chip ${desk.id === state.currentDeskId ? 'active' : ''}" data-desk-id="${desk.id}">
        <strong>${escapeHtml(desk.name)}</strong>
        <small>${index + 1}</small>
      </button>
    `).join('')}
    <div class="desk-strip-meta">
      <button class="desk-chip" data-desk-action="add">＋ Add</button>
      <button class="desk-chip" data-desk-action="rename">Rename</button>
      <button class="desk-chip" data-desk-action="remove">Remove</button>
    </div>
  `;
}

function profileGradient(profile) {
  const accent = profile?.color || state.settings.accent;
  return `linear-gradient(135deg, ${accent}, rgba(15, 37, 88, 0.92))`;
}

function renderProfileButton() {
  const profile = getCurrentProfile();
  if (!profile || !dom.profileAvatar) return;
  dom.profileAvatar.textContent = profile.avatar || profile.name.slice(0, 1).toUpperCase();
  dom.profileAvatar.style.background = profileGradient(profile);
  dom.profileButton.title = `${profile.name} — switch or lock`;
}

function renderLockScreen() {
  const profile = getSelectedProfile();
  if (!profile || !dom.lockAuthPanel) return;
  dom.lockAuthPanel.innerHTML = `
    <div class="auth-inline">
      <div class="profile-chip-avatar" style="background:${profileGradient(profile)};">${escapeHtml(profile.avatar || profile.name.slice(0, 1))}</div>
      <div>
        <h3>${session.mode === 'signin' ? 'Choose a profile' : 'Unlock desktop'}</h3>
        <div class="muted">All profiles and app data are stored locally in this browser.</div>
      </div>
    </div>
    <div class="profile-grid">
      ${store.profiles.map((item) => `
        <button class="profile-card ${item.id === profile.id ? 'active' : ''}" data-profile-select="${item.id}">
          <div class="profile-chip-avatar" style="background:${profileGradient(item)};">${escapeHtml(item.avatar || item.name.slice(0, 1))}</div>
          <strong>${escapeHtml(item.name)}</strong>
          <p>${item.pin ? 'PIN protected' : 'No PIN required'}${item.lastLogin ? ` • Last active ${escapeHtml(formatDateTime(item.lastLogin))}` : ''}</p>
        </button>
      `).join('')}
    </div>
    <div class="auth-form">
      <h4>${escapeHtml(profile.name)}</h4>
      <div class="muted">${profile.pin ? 'Enter PIN to continue.' : 'Click continue to enter this profile.'}</div>
      ${profile.pin ? `<input id="profile-pin-input" class="form-control" type="password" inputmode="numeric" placeholder="PIN" maxlength="12" />` : ''}
      ${session.error ? `<div class="info-banner">${escapeHtml(session.error)}</div>` : ''}
      <div class="auth-actions">
        <button class="auth-action primary" data-lock-action="submit">${session.mode === 'signin' ? 'Sign in' : 'Unlock'}</button>
        <button class="auth-action" data-lock-action="new-profile">New profile</button>
        <button class="auth-action" data-lock-action="guest">Guest</button>
      </div>
    </div>
  `;
  const pinInput = document.getElementById('profile-pin-input');
  if (pinInput) {
    setTimeout(() => pinInput.focus(), 10);
    pinInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') attemptProfileUnlock(pinInput.value);
    });
  }
}

function showLockScreen(mode = 'lock', profileId = null) {
  session.mode = mode;
  session.loggedIn = false;
  session.selectedProfileId = profileId || session.selectedProfileId || store.currentProfileId || store.profiles[0]?.id;
  session.error = '';
  dom.lockScreen.classList.remove('hidden');
  renderLockScreen();
}

function hideLockScreen() {
  session.loggedIn = true;
  session.error = '';
  dom.lockScreen.classList.add('hidden');
  renderProfileButton();
}

function attemptProfileUnlock(pin = '') {
  const profile = getSelectedProfile();
  if (!profile) return false;
  if (profile.pin && profile.pin !== pin) {
    session.error = 'Incorrect PIN. Please try again.';
    renderLockScreen();
    return false;
  }
  closeAllWindows();
  profile.lastLogin = Date.now();
  setCurrentProfile(profile.id);
  state.settings.locked = false;
  applySettings();
  renderNotificationsPanel();
  renderQuickSettings();
  renderLauncher();
  renderDeskStrip();
  renderWidgetRail();
  hideLockScreen();
  if (!state.profileMeta.onboarded) {
    state.profileMeta.onboarded = true;
    openApp('browser', { url: 'chrome://welcome' });
    openApp('mail');
    openApp('tasks');
    sendNotification('Welcome', `Signed in as ${profile.name}. Explore the new apps, desks, and widgets.`);
    saveState();
  }
  return true;
}

async function createProfilePrompt() {
  const result = await showFormDialog({
    title: 'Create profile',
    description: 'Profiles keep their own files, notes, tasks, events, settings, and wallpapers.',
    fields: [
      { name: 'name', label: 'Profile name', value: `User ${store.profiles.length + 1}` },
      { name: 'avatar', label: 'Avatar letter', value: 'U', maxlength: '1' },
      { name: 'pin', label: 'PIN (optional)', type: 'password', value: '' },
      { name: 'color', label: 'Accent color', type: 'color', value: ACCENTS[store.profiles.length % ACCENTS.length] },
    ],
    submitLabel: 'Create profile',
  });
  if (!result?.name) return;
  const profile = createDefaultProfile(result.name, (result.avatar || result.name).slice(0, 1).toUpperCase(), { color: result.color, pin: result.pin || '' });
  store.profiles.push(profile);
  session.selectedProfileId = profile.id;
  saveState();
  renderLockScreen();
  renderProfileButton();
}

function deleteProfile(profileId) {
  if (store.profiles.length <= 1) {
    showToast('Profiles', 'At least one profile must remain.');
    return;
  }
  const profile = store.profiles.find((item) => item.id === profileId);
  if (!profile) return;
  if (!confirm(`Delete profile “${profile.name}” and all of its saved data?`)) return;
  store.profiles = store.profiles.filter((item) => item.id !== profileId);
  if (store.currentProfileId === profileId) {
    setCurrentProfile(store.profiles[0].id);
  }
  session.selectedProfileId = store.currentProfileId;
  saveState();
  renderLockScreen();
  renderProfileButton();
}

function renderWidgetRail() {
  if (!dom.widgetRail) return;
  dom.widgetRail.classList.toggle('hidden', !state.settings.widgets);
  if (!state.settings.widgets) return;
  const desk = currentDesk();
  const upcoming = state.events.filter((event) => event.date >= todayIso()).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).slice(0, 3);
  const tasks = state.tasks.slice().sort((a, b) => Number(a.done) - Number(b.done)).slice(0, 4);
  const unread = state.mailbox.filter((mail) => mail.folder === 'inbox' && !mail.read).slice(0, 3);
  const profile = getCurrentProfile();
  dom.widgetRail.innerHTML = `
    <section class="widget-card">
      <div class="setting-row">
        <div>
          <div class="big-time">${escapeHtml(formatTime())}</div>
          <div class="muted">${escapeHtml(formatDateLong())}</div>
        </div>
        <div class="profile-chip-avatar" style="background:${profileGradient(profile)}; width:46px; height:46px;">${escapeHtml(profile.avatar)}</div>
      </div>
      <div class="widget-inline">
        <button class="widget-action primary" data-widget-action="open-calendar">Calendar</button>
        <button class="widget-action" data-widget-action="open-settings">Settings</button>
      </div>
      <div class="muted">${escapeHtml(profile.name)} • ${escapeHtml(desk?.name || 'Desk')}</div>
    </section>
    <section class="widget-card">
      <div class="setting-row"><h4>Tasks</h4><button class="widget-action" data-widget-action="open-tasks">Open</button></div>
      <div class="widget-list">
        ${tasks.length ? tasks.map((task) => `
          <label class="widget-task-row ${task.done ? 'done' : ''}">
            <input type="checkbox" data-widget-task="${task.id}" ${task.done ? 'checked' : ''} />
            <div><strong>${escapeHtml(task.title)}</strong><div class="muted">${escapeHtml(task.list)}${task.due ? ` • ${escapeHtml(task.due)}` : ''}</div></div>
            <small>${escapeHtml(task.priority)}</small>
          </label>
        `).join('') : '<div class="muted">No tasks yet.</div>'}
      </div>
    </section>
    <section class="widget-card">
      <div class="setting-row"><h4>Agenda</h4><button class="widget-action" data-widget-action="open-calendar">Open</button></div>
      <div class="widget-list">
        ${upcoming.length ? upcoming.map((event) => `
          <button class="widget-event-row" data-widget-open-event="${event.date}">
            <span class="calendar-dot"></span>
            <div><strong>${escapeHtml(event.title)}</strong><div class="muted">${escapeHtml(event.date)}${event.time ? ` • ${escapeHtml(event.time)}` : ''}</div></div>
            <span>›</span>
          </button>
        `).join('') : '<div class="muted">No upcoming events.</div>'}
      </div>
    </section>
    <section class="widget-card">
      <div class="setting-row"><h4>Inbox</h4><button class="widget-action" data-widget-action="open-mail">Mail</button></div>
      <div class="widget-list">
        ${unread.length ? unread.map((mail) => `
          <button class="widget-mail-row" data-widget-mail="${mail.id}">
            <span>✉</span>
            <div><strong>${escapeHtml(mail.subject)}</strong><div class="muted">${escapeHtml(mail.from)}</div></div>
            <span>›</span>
          </button>
        `).join('') : '<div class="muted">Inbox is clear.</div>'}
      </div>
    </section>
    <section class="widget-card">
      <div class="setting-row"><h4>Runtime</h4><span class="muted">${escapeHtml(runtimeStatsSummary().profile)}</span></div>
      <div class="widget-list">
        <div class="info-card"><strong>${runtimeStats.connected ? 'Render / Node service' : 'Browser fallback'}</strong><p>CPU ${runtimeStatsSummary().cpu || '?'} • RAM ${runtimeStatsSummary().ramMb ? formatFileSize(runtimeStatsSummary().ramMb * 1024 * 1024) : 'unknown'} • Uptime ${formatUptimeShort(runtimeStatsSummary().uptimeSec)}</p></div>
        <div class="info-card"><strong>Process</strong><p>RSS ${runtimeStatsSummary().rssMb ? formatFileSize(runtimeStatsSummary().rssMb * 1024 * 1024) : 'n/a'}${runtimeStatsSummary().heapMb ? ` • Heap ${formatFileSize(runtimeStatsSummary().heapMb * 1024 * 1024)}` : ''}</p></div>
      </div>
    </section>
    <section class="widget-card">
      <div class="setting-row"><h4>System</h4><span class="muted">${Math.round(state.battery.level)}%</span></div>
      <div class="widget-inline">
        <button class="widget-action" data-widget-action="open-media">Media</button>
        <button class="widget-action" data-widget-action="lock">Lock</button>
        <button class="widget-action" data-widget-action="cycle-desk">Next desk</button>
      </div>
      <div class="muted">Wi‑Fi ${state.settings.wifi ? 'connected' : 'off'} • ${state.settings.theme} theme • ${formatFileSize(JSON.stringify(state).length)} used</div>
    </section>
  `;
}

function addRecentApp(appId) {
  state.recentApps = [appId, ...state.recentApps.filter((id) => id !== appId)].slice(0, 8);
  saveState();
}

function appWindowInstances(appId) {
  return windows.filter((win) => win.appId === appId);
}

function renderIcon(appId, size = 'default') {
  const app = APPS[appId] || { iconClass: 'icon-system', glyph: '◎' };
  const extra = size === 'large' ? 'large' : size === 'small' ? 'small' : '';
  return `<span class="icon-bubble ${app.iconClass} ${extra}"><span>${escapeHtml(app.glyph)}</span></span>`;
}

function sendNotification(title, body, appId = 'system', persistent = true) {
  const item = { id: uid('n'), title, body, time: Date.now(), appId };
  if (persistent) {
    state.notifications = [item, ...state.notifications].slice(0, 24);
    saveState();
  }
  renderNotificationsPanel();
  if (!state.settings.dnd) {
    showToast(title, body);
  }
}

function showToast(title, body) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<strong>${escapeHtml(title)}</strong><div>${escapeHtml(body)}</div>`;
  dom.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 180);
  }, 3800);
}

function closePanels({ except = null } = {}) {
  if (except !== 'launcher') dom.launcher.classList.add('hidden');
  if (except !== 'quick-settings') dom.quickSettings.classList.add('hidden');
  if (except !== 'notifications') dom.notificationsPanel.classList.add('hidden');
  if (except !== 'overview') {
    overviewOpen = false;
    dom.overviewLayer.classList.add('hidden');
  }
  dom.contextMenu.classList.add('hidden');
}

function toggleLauncher(force) {
  const shouldOpen = typeof force === 'boolean' ? force : dom.launcher.classList.contains('hidden');
  if (shouldOpen) {
    closePanels({ except: 'launcher' });
    dom.launcher.classList.remove('hidden');
    renderLauncher();
    requestAnimationFrame(() => dom.launcherSearch.focus());
  } else {
    dom.launcher.classList.add('hidden');
  }
}

function toggleQuickSettings(force) {
  const shouldOpen = typeof force === 'boolean' ? force : dom.quickSettings.classList.contains('hidden');
  if (shouldOpen) {
    closePanels({ except: 'quick-settings' });
    renderQuickSettings();
    dom.quickSettings.classList.remove('hidden');
  } else {
    dom.quickSettings.classList.add('hidden');
  }
}

function toggleNotifications(force) {
  const shouldOpen = typeof force === 'boolean' ? force : dom.notificationsPanel.classList.contains('hidden');
  if (shouldOpen) {
    closePanels({ except: 'notifications' });
    renderNotificationsPanel();
    dom.notificationsPanel.classList.remove('hidden');
  } else {
    dom.notificationsPanel.classList.add('hidden');
  }
}

function renderOverview() {
  const visible = windows.filter((win) => !win.minimized && win.deskId === state.currentDeskId);
  dom.overviewLayer.innerHTML = `
    <div class="overview-shell glass">
      <div class="overview-topbar">
        <div>
          <strong>Overview</strong>
          <div class="muted">${escapeHtml(currentDesk()?.name || 'Desk')} • ${visible.length} open window${visible.length === 1 ? '' : 's'}</div>
        </div>
        <div class="overview-desk-row">
          ${state.desks.map((desk) => `
            <button class="overview-desk-chip ${desk.id === state.currentDeskId ? 'active' : ''}" data-overview-desk="${desk.id}">${escapeHtml(desk.name)}</button>
          `).join('')}
          <button class="overview-desk-chip" data-overview-desk-action="add">＋ New desk</button>
        </div>
      </div>
      <div class="overview-grid">
        ${visible.length ? visible.map((win) => `
          <button class="overview-window-card" data-overview-window="${win.id}">
            <div class="overview-window-top">
              <div class="overview-window-title">${renderIcon(win.appId, 'small')}<span>${escapeHtml(win.title)}</span></div>
              <span class="overview-window-action" data-overview-close="${win.id}">✕</span>
            </div>
            <div class="overview-window-preview">
              <div class="overview-preview-bar"></div>
              <div class="overview-preview-body"></div>
            </div>
          </button>
        `).join('') : '<div class="empty-state overview-empty">No open windows on this desk.</div>'}
      </div>
    </div>
  `;
}

function toggleOverview(force) {
  const shouldOpen = typeof force === 'boolean' ? force : dom.overviewLayer.classList.contains('hidden');
  if (shouldOpen) {
    closePanels({ except: 'overview' });
    overviewOpen = true;
    renderOverview();
    dom.overviewLayer.classList.remove('hidden');
  } else {
    overviewOpen = false;
    dom.overviewLayer.classList.add('hidden');
  }
}

function showContextMenu(x, y) {
  dom.contextMenu.innerHTML = `
    <button data-action="open-launcher">Open launcher</button>
    <button data-action="new-note">New note</button>
    <button data-action="new-task">Open Tasks</button>
    <button data-action="open-files">Open Files</button>
    <button data-action="change-wallpaper">Change wallpaper</button>
    <button data-action="switch-user">Switch profile</button>
    <button data-action="lock">Lock screen</button>
  `;
  dom.contextMenu.style.left = `${Math.min(x, window.innerWidth - 240)}px`;
  dom.contextMenu.style.top = `${Math.min(y, window.innerHeight - 260)}px`;
  dom.contextMenu.classList.remove('hidden');
}

function applySettings() {
  const theme = state.settings.theme === 'dark' ? 'theme-dark' : 'theme-light';
  dom.system.classList.remove('theme-dark', 'theme-light');
  dom.system.classList.add(theme);
  const [r, g, b] = hexToRgb(state.settings.accent);
  dom.system.style.setProperty('--accent', state.settings.accent);
  dom.system.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
  applyWallpaper();
  dom.nightLight.style.opacity = state.settings.nightLight ? '1' : '0';
  dom.brightness.style.opacity = String(clamp(1 - (state.settings.brightness / 100), 0, 0.72));
  renderStatus();
  renderDesktopIcons();
  renderShelf();
  renderLauncher();
  renderDeskStrip();
  renderWidgetRail();
  renderProfileButton();
  refreshWindowVisibility();
  if (!dom.quickSettings.classList.contains('hidden')) renderQuickSettings();
  rerenderAppWindows('settings');
  rerenderAppWindows('gallery');
}

function getWallpaperObject() {
  const selected = state.settings.wallpaper || 'aurora';
  if (selected.startsWith('custom:')) {
    const entry = getEntry(selected.replace('custom:', ''));
    if (entry && entry.content) {
      return {
        id: selected,
        name: entry.name,
        css: `linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.08)), url("${entry.content}") center/cover no-repeat`,
      };
    }
  }
  return WALLPAPERS.find((wallpaper) => wallpaper.id === selected) || WALLPAPERS[0];
}

function applyWallpaper() {
  const wallpaper = getWallpaperObject();
  dom.wallpaper.style.background = wallpaper.css;
}

function renderStatus() {
  dom.statusClock.textContent = formatTime(new Date());
  dom.lockTime.textContent = formatTime(new Date());
  dom.lockDate.textContent = formatDateLong(new Date());
  dom.statusWifi.textContent = networkState.online && state.settings.wifi ? '📶' : '⦸';
  const battery = Math.round(state.battery.level || 0);
  dom.statusBattery.textContent = state.battery.charging ? `⚡${battery}%` : `🔋${battery}%`;
  dom.notificationDot.classList.toggle('hidden', !state.notifications.length);
  dom.desksButton.textContent = `◫ ${state.desks.findIndex((desk) => desk.id === state.currentDeskId) + 1}`;
  renderProfileButton();
}

function renderDesktopIcons() {
  dom.desktopIcons.innerHTML = '';
  dom.desktopIcons.setAttribute('aria-hidden', 'true');
}

function updateClockLoop() {
  renderStatus();
  if (!dom.quickSettings.classList.contains('hidden')) renderQuickSettings();
}

function setWindowTitle(win, title) {
  win.title = title;
  const titleEl = win.el.querySelector('.window-title-text');
  if (titleEl) titleEl.textContent = title;
}

function focusWindow(win) {
  if (!win || !win.el) return;
  if (win.deskId && win.deskId !== state.currentDeskId) {
    state.currentDeskId = win.deskId;
    refreshWindowVisibility();
  }
  activeWindowId = win.id;
  windows.forEach((item) => item.el.classList.toggle('active', item.id === win.id));
  win.el.style.zIndex = String(++zCounter);
  if (win.minimized) {
    win.minimized = false;
  }
  syncWindowVisibility(win);
  renderShelf();
}

function minimizeWindow(win) {
  win.minimized = true;
  syncWindowVisibility(win);
  renderShelf();
}

function toggleMaximizeWindow(win) {
  if (win.maximized) {
    win.maximized = false;
    win.el.classList.remove('maximized');
    if (win.restoreBounds) {
      win.el.style.left = `${win.restoreBounds.left}px`;
      win.el.style.top = `${win.restoreBounds.top}px`;
      win.el.style.width = `${win.restoreBounds.width}px`;
      win.el.style.height = `${win.restoreBounds.height}px`;
    }
  } else {
    const rect = win.el.getBoundingClientRect();
    win.restoreBounds = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    win.maximized = true;
    win.el.classList.add('maximized');
  }
}

function closeWindow(win) {
  if (win.controller && typeof win.controller.onClose === 'function') {
    win.controller.onClose();
  }
  win.el.remove();
  windows = windows.filter((item) => item.id !== win.id);
  if (activeWindowId === win.id) activeWindowId = windows.length ? windows[windows.length - 1].id : null;
  refreshWindowVisibility();
}

function makeWindowDraggable(win, titlebar) {
  titlebar.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.window-controls') || win.maximized) return;
    focusWindow(win);
    const rect = win.el.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const originLeft = rect.left;
    const originTop = rect.top;

    const onMove = (moveEvent) => {
      const nextLeft = clamp(originLeft + moveEvent.clientX - startX, 0, window.innerWidth - 220);
      const nextTop = clamp(originTop + moveEvent.clientY - startY, 0, window.innerHeight - 160);
      win.el.style.left = `${nextLeft}px`;
      win.el.style.top = `${nextTop}px`;
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });

  titlebar.addEventListener('dblclick', () => toggleMaximizeWindow(win));
}

function rerenderAppWindows(appId) {
  windows.filter((win) => win.appId === appId).forEach((win) => {
    if (win.controller && typeof win.controller.render === 'function') win.controller.render();
  });
}

function createWindow(appId, options = {}) {
  const app = APPS[appId];
  const starting = {
    width: options.width || app.defaultSize.width,
    height: options.height || app.defaultSize.height,
  };
  const x = options.x ?? clamp(70 + windows.length * 22, 20, Math.max(20, window.innerWidth - starting.width - 20));
  const y = options.y ?? clamp(60 + windows.length * 18, 20, Math.max(20, window.innerHeight - starting.height - 120));

  const el = document.createElement('section');
  el.className = 'window active';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = `${starting.width}px`;
  el.style.height = `${starting.height}px`;
  el.innerHTML = `
    <header class="window-titlebar">
      <div class="window-title">
        ${renderIcon(appId, 'small')}
        <h2 class="window-title-text">${escapeHtml(app.title)}</h2>
      </div>
      <div class="window-controls">
        <button data-control="minimize" title="Minimize">—</button>
        <button data-control="maximize" title="Maximize">▢</button>
        <button data-control="close" title="Close">✕</button>
      </div>
    </header>
    <div class="window-content"></div>
  `;
  dom.windowsLayer.appendChild(el);

  const win = {
    id: uid('win'),
    appId,
    title: app.title,
    deskId: state.currentDeskId,
    minimized: false,
    maximized: false,
    restoreBounds: null,
    el,
    body: el.querySelector('.window-content'),
    controller: null,
    state: {},
  };

  windows.push(win);
  el.style.zIndex = String(++zCounter);
  focusWindow(win);
  makeWindowDraggable(win, el.querySelector('.window-titlebar'));

  el.addEventListener('mousedown', () => focusWindow(win));
  el.querySelector('.window-controls').addEventListener('click', (event) => {
    const control = event.target.closest('button')?.dataset.control;
    if (!control) return;
    if (control === 'minimize') minimizeWindow(win);
    if (control === 'maximize') toggleMaximizeWindow(win);
    if (control === 'close') closeWindow(win);
  });

  const controller = app.mount(win, win.body, options) || {};
  win.controller = controller;
  if (options.title) setWindowTitle(win, options.title);
  syncWindowVisibility(win);
  renderShelf();
  if (overviewOpen) renderOverview();
  addRecentApp(appId);
  return win;
}

function openApp(appId, options = {}) {
  const app = APPS[appId];
  if (!app) return null;
  if (app.singleInstance) {
    const existing = windows.find((win) => win.appId === appId);
    if (existing) {
      focusWindow(existing);
      if (existing.controller && typeof existing.controller.onReuse === 'function') existing.controller.onReuse(options);
      return existing;
    }
  }
  return createWindow(appId, options);
}

function renderShelf() {
  const visibleWindows = windows.filter((win) => win.deskId === state.currentDeskId);
  const runningIds = [...new Set(visibleWindows.map((win) => win.appId))].filter((appId) => !state.pinnedApps.includes(appId));
  const ids = [...state.pinnedApps, ...runningIds];
  dom.shelfApps.innerHTML = ids.map((appId) => {
    const app = APPS[appId];
    const appWins = appWindowInstances(appId).filter((win) => win.deskId === state.currentDeskId);
    const running = appWins.length > 0;
    const active = running && appWins.some((win) => win.id === activeWindowId && !win.minimized);
    return `
      <button class="shelf-pill shelf-app-btn ${active ? 'active' : ''}" data-app="${appId}" title="${escapeHtml(app.title)}">
        ${renderIcon(appId)}
        ${running ? '<span class="running-indicator"></span>' : ''}
      </button>
    `;
  }).join('');
}

function renderLauncher() {
  const query = dom.launcherSearch.value.trim();
  const apps = APP_IDS.map((appId) => APPS[appId]);
  dom.launcherAppGrid.innerHTML = apps.map((app) => `
    <button class="app-card" data-open-app="${app.id}">
      ${renderIcon(app.id, 'large')}
      <strong>${escapeHtml(app.title)}</strong>
      <span>${escapeHtml(app.description)}</span>
    </button>
  `).join('');

  const results = query ? buildSearchEntries(query) : buildDefaultLauncherResults();
  dom.launcherResults.innerHTML = results.length
    ? results.map((result, index) => `
      <button class="result-card" data-launch-result="${index}">
        ${renderIcon(result.icon || 'system')}
        <div>
          <strong>${escapeHtml(result.title)}</strong>
          <small>${escapeHtml(result.subtitle)}</small>
        </div>
      </button>
    `).join('')
    : '<div class="empty-state">No matching apps or files</div>';
  dom.launcherResults.dataset.serializedResults = JSON.stringify(results.map((result) => ({
    kind: result.kind,
    appId: result.appId || null,
    path: result.path || null,
    date: result.date || null,
    mailId: result.mailId || null,
    profileId: result.profileId || null,
  })));
}

function buildDefaultLauncherResults() {
  const items = [];
  state.recentApps.forEach((appId) => {
    const app = APPS[appId];
    if (!app) return;
    items.push({ kind: 'app', title: app.title, subtitle: 'Recent app', icon: appId, appId });
  });
  state.tasks.filter((task) => !task.done).slice(0, 2).forEach((task) => {
    items.push({ kind: 'task', title: task.title, subtitle: `${task.list} task`, icon: 'tasks', appId: 'tasks' });
  });
  state.mailbox.filter((mail) => mail.folder === 'inbox' && !mail.read).slice(0, 2).forEach((mail) => {
    items.push({ kind: 'mail', title: mail.subject, subtitle: mail.from, icon: 'mail', appId: 'mail', mailId: mail.id });
  });
  state.files
    .filter((entry) => entry.kind === 'file')
    .slice(0, 4)
    .forEach((entry) => {
      items.push({ kind: 'file', title: entry.name, subtitle: entry.path, icon: (entry.mime || '').startsWith('image/') ? 'gallery' : (entry.mime || '').startsWith('audio/') || (entry.mime || '').startsWith('video/') ? 'media' : 'text', path: entry.path });
    });
  return items.slice(0, 10);
}

function buildSearchEntries(query) {
  const needle = query.toLowerCase();
  const items = [];
  APP_IDS.forEach((appId) => {
    const app = APPS[appId];
    if (`${app.title} ${app.description}`.toLowerCase().includes(needle)) {
      items.push({ kind: 'app', title: app.title, subtitle: 'App', icon: appId, appId });
    }
  });
  state.files.forEach((entry) => {
    const searchableContent = entry.kind === 'file' && !(entry.mime || '').startsWith('image/') && !(entry.mime || '').startsWith('audio/') && !(entry.mime || '').startsWith('video/')
      ? String(entry.content || '').slice(0, 1200)
      : '';
    const haystack = `${entry.name} ${entry.path} ${searchableContent}`.toLowerCase();
    if (haystack.includes(needle)) {
      items.push({
        kind: 'file',
        title: entry.name,
        subtitle: entry.path,
        icon: entry.kind === 'folder' ? 'files' : (entry.mime || '').startsWith('image/') ? 'gallery' : 'text',
        path: entry.path,
      });
    }
  });
  state.notes.forEach((note) => {
    if (`${note.title} ${note.content}`.toLowerCase().includes(needle)) {
      items.push({ kind: 'note', title: note.title, subtitle: 'Sticky note', icon: 'notes', appId: 'notes' });
    }
  });
  state.events.forEach((event) => {
    if (`${event.title} ${event.date} ${event.time}`.toLowerCase().includes(needle)) {
      items.push({ kind: 'event', title: event.title, subtitle: `${event.date}${event.time ? ` • ${event.time}` : ''}`, icon: 'calendar', date: event.date, appId: 'calendar' });
    }
  });
  state.tasks.forEach((task) => {
    if (`${task.title} ${task.list} ${task.notes || ''}`.toLowerCase().includes(needle)) {
      items.push({ kind: 'task', title: task.title, subtitle: `${task.list}${task.due ? ` • ${task.due}` : ''}`, icon: 'tasks', appId: 'tasks' });
    }
  });
  state.mailbox.forEach((mail) => {
    if (`${mail.subject} ${mail.from} ${mail.to} ${mail.body}`.toLowerCase().includes(needle)) {
      items.push({ kind: 'mail', title: mail.subject, subtitle: `${mail.folder} • ${mail.from}`, icon: 'mail', appId: 'mail', mailId: mail.id });
    }
  });
  store.profiles.forEach((profile) => {
    if (`${profile.name} ${profile.avatar}`.toLowerCase().includes(needle)) {
      items.push({ kind: 'profile', title: profile.name, subtitle: 'Profile', icon: 'settings', profileId: profile.id });
    }
  });
  return items.slice(0, 20);
}

function executeLauncherResult(serialized) {
  if (!serialized) return;
  if (serialized.kind === 'app') openApp(serialized.appId);
  if (serialized.kind === 'file') openFileEntry(getEntry(serialized.path));
  if (serialized.kind === 'note') openApp('notes');
  if (serialized.kind === 'event') openApp('calendar', { date: serialized.date });
  if (serialized.kind === 'task') openApp('tasks');
  if (serialized.kind === 'mail') openApp('mail', { mailId: serialized.mailId });
  if (serialized.kind === 'profile') showLockScreen('signin', serialized.profileId);
  toggleLauncher(false);
}

function renderQuickSettings() {
  const todayEvents = state.events.filter((event) => event.date === todayIso()).slice(0, 3);
  const profile = getCurrentProfile();
  const runtime = runtimeStatsSummary();
  const mediaOpen = windows.some((win) => win.appId === 'media' && !win.minimized);
  dom.quickSettings.innerHTML = `
    <div class="qs-header">
      <div>
        <h3>${escapeHtml(formatTime())}</h3>
        <div class="muted">${escapeHtml(formatDateLong())}</div>
      </div>
      <button class="secondary-btn" data-action="open-settings">Settings</button>
    </div>
    <div class="qs-hero-card">
      <div class="qs-hero-profile">
        <span class="profile-chip-avatar" style="background:${profileGradient(profile)};">${escapeHtml(profile.avatar || profile.name.slice(0, 1))}</span>
        <div>
          <strong>${escapeHtml(profile.name)}</strong>
          <div class="muted">${escapeHtml(currentDesk()?.name || 'Desk')} • ${escapeHtml(state.settings.theme)} theme</div>
        </div>
      </div>
      <div class="qs-hero-meta">
        <span>${escapeHtml(getWallpaperObject().name)}</span>
        <span>${escapeHtml(getBatteryCaption())}</span>
      </div>
    </div>
    <div class="tile-grid">
      ${renderQuickToggle('wifi', 'Wi‑Fi', state.settings.wifi && networkState.online, state.settings.wifi ? getNetworkCaption() : 'Disabled in desktop')}
      ${renderQuickToggle('bluetooth', 'Bluetooth', state.settings.bluetooth, state.settings.bluetooth ? 'Ready for accessories' : 'Off')}
      ${renderQuickToggle('nightLight', 'Night Light', state.settings.nightLight, state.settings.nightLight ? 'Warmer evening tones' : 'Off')}
      ${renderQuickToggle('dnd', 'Do Not Disturb', state.settings.dnd, state.settings.dnd ? 'Notifications silenced' : 'Allow alerts')}
      ${renderQuickToggle('batterySaver', 'Battery Saver', state.settings.batterySaver, state.settings.batterySaver ? 'Reduce visual intensity' : 'Standard mode')}
      ${renderQuickToggle('widgets', 'Widgets', state.settings.widgets, state.settings.widgets ? 'Optional dashboard visible' : 'Hidden')}
      <button class="tile-btn" data-action="toggle-overview"><strong>Overview</strong><span>See windows and desks</span></button>
      <button class="tile-btn" data-action="lock-screen"><strong>Lock</strong><span>Secure the desktop</span></button>
    </div>
    <div class="slider-card">
      <div class="setting-row"><strong>Brightness</strong><span>${state.settings.brightness}%</span></div>
      <input type="range" min="25" max="100" value="${state.settings.brightness}" data-slider="brightness" />
    </div>
    <div class="slider-card">
      <div class="setting-row"><strong>Volume</strong><span>${state.settings.volume}%</span></div>
      <input type="range" min="0" max="100" value="${state.settings.volume}" data-slider="volume" />
    </div>
    <div class="today-card">
      <div class="setting-row"><strong>System</strong><span>${runtime.connected ? 'Web service' : 'Browser mode'}</span></div>
      <p class="muted">CPU ${runtime.cpu || '?'} • RAM ${runtime.ramMb ? formatFileSize(runtime.ramMb * 1024 * 1024) : 'unknown'} • RSS ${runtime.rssMb ? formatFileSize(runtime.rssMb * 1024 * 1024) : 'n/a'} • ${escapeHtml(runtime.profile)}</p>
    </div>
    <div class="today-card">
      <div class="setting-row"><strong>Media</strong><span>${mediaOpen ? 'Open' : 'Idle'}</span></div>
      <p class="muted">Quick Settings on ChromeOS surfaces playback controls; use the Media app here for real local playback.</p>
      <div class="settings-actions"><button class="small-chip" data-action="open-media">Open Media</button></div>
    </div>
    <div class="agenda-card">
      <div class="setting-row"><strong>Today</strong><button class="small-chip" data-action="open-calendar">Calendar</button></div>
      ${todayEvents.length ? todayEvents.map((event) => `<div class="event-card"><strong>${escapeHtml(event.title)}</strong><p>${escapeHtml(event.date)}${event.time ? ` • ${escapeHtml(event.time)}` : ''}</p></div>`).join('') : '<div class="muted">No events scheduled for today.</div>'}
    </div>
  `;
}

function renderQuickToggle(key, title, isActive, caption) {
  return `<button class="tile-btn ${isActive ? 'active' : ''}" data-toggle="${key}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(caption)}</span></button>`;
}

function renderNotificationsPanel() {
  dom.notificationsPanel.innerHTML = `
    <div class="notifications-header">
      <h3>Notifications</h3>
      <button class="secondary-btn" data-action="clear-notifications">Clear</button>
    </div>
    ${state.notifications.length ? state.notifications.map((item) => `
      <article class="notification-card">
        <header>
          <strong>${escapeHtml(item.title)}</strong>
          <small class="muted">${escapeHtml(formatDateTime(item.time))}</small>
        </header>
        <div>${escapeHtml(item.body)}</div>
      </article>
    `).join('') : '<div class="empty-state">No notifications right now</div>'}
  `;
  renderStatus();
}

function lockSystem() {
  state.settings.locked = true;
  saveState();
  showLockScreen('lock');
}

function unlockSystem() {
  state.settings.locked = false;
  saveState();
  hideLockScreen();
}

function openBrowserSearch(win, query) {
  if (win?.controller?.navigate) win.controller.navigate(query);
}

function showFormDialog({ title, description = '', fields = [], submitLabel = 'Save', cancelLabel = 'Cancel' }) {
  return new Promise((resolve) => {
    modalResolver = resolve;
    dom.modalLayer.classList.remove('hidden');
    dom.modalLayer.innerHTML = `
      <div class="modal-card">
        <h3>${escapeHtml(title)}</h3>
        ${description ? `<p class="muted">${escapeHtml(description)}</p>` : ''}
        <form class="modal-form">
          <div class="modal-fields">
            ${fields.map((field) => renderDialogField(field)).join('')}
          </div>
          <div class="modal-actions">
            <button type="button" class="secondary-btn" data-action="cancel">${escapeHtml(cancelLabel)}</button>
            <button type="submit" class="primary-btn">${escapeHtml(submitLabel)}</button>
          </div>
        </form>
      </div>
    `;
    const form = dom.modalLayer.querySelector('form');
    const firstInput = form.querySelector('input, textarea, select');
    if (firstInput) setTimeout(() => firstInput.focus(), 10);

    dom.modalLayer.querySelector('[data-action="cancel"]').addEventListener('click', () => closeModal(null));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = {};
      fields.forEach((field) => {
        payload[field.name] = formData.get(field.name);
      });
      closeModal(payload);
    });
  });
}

function renderDialogField(field) {
  if (field.type === 'textarea') {
    return `
      <label class="label-row">
        <span>${escapeHtml(field.label)}</span>
        <textarea class="form-control" name="${escapeHtml(field.name)}" placeholder="${escapeHtml(field.placeholder || '')}">${escapeHtml(field.value || '')}</textarea>
      </label>
    `;
  }
  if (field.type === 'select') {
    return `
      <label class="label-row">
        <span>${escapeHtml(field.label)}</span>
        <select class="form-control" name="${escapeHtml(field.name)}">
          ${(field.options || []).map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(field.value) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
        </select>
      </label>
    `;
  }
  return `
    <label class="label-row">
      <span>${escapeHtml(field.label)}</span>
      <input class="form-control" name="${escapeHtml(field.name)}" type="${escapeHtml(field.type || 'text')}" value="${escapeHtml(field.value || '')}" placeholder="${escapeHtml(field.placeholder || '')}" />
    </label>
  `;
}

function closeModal(result) {
  dom.modalLayer.classList.add('hidden');
  dom.modalLayer.innerHTML = '';
  if (modalResolver) {
    const resolver = modalResolver;
    modalResolver = null;
    resolver(result);
  }
}

function buildCalendarMatrix(viewDate) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const firstDay = first.getDay();
  const start = new Date(first);
  start.setDate(first.getDate() - firstDay);
  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days.push(date);
  }
  return days;
}

function getEventCount(dateString) {
  return state.events.filter((event) => event.date === dateString).length;
}

function getStorageUsage() {
  const raw = JSON.stringify(store);
  return formatFileSize(raw.length);
}

async function importFiles(fileList, folderPath) {
  const files = Array.from(fileList || []);
  for (const file of files) {
    const targetPath = normalizePath(`${folderPath}/${file.name}`);
    const content = await readImportedFile(file);
    const mime = file.type || (content.startsWith('data:') ? 'application/octet-stream' : 'text/plain');
    const existing = getEntry(targetPath);
    if (existing) {
      updateFile(targetPath, content, mime);
    } else {
      createFile(targetPath, content, mime);
    }
  }
  saveState();
  sendNotification('Files imported', `${files.length} item${files.length === 1 ? '' : 's'} saved to ${folderPath}`);
  rerenderAppWindows('files');
  rerenderAppWindows('gallery');
}

function readImportedFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result);
    if (file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  });
}

function triggerReset() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

function initializeBattery() {
  if (navigator.getBattery) {
    navigator.getBattery().then((battery) => {
      batteryApi = battery;
      const update = () => {
        state.battery.level = Math.round(battery.level * 100);
        state.battery.charging = battery.charging;
        state.battery.updated = Date.now();
        saveState();
        renderStatus();
        if (!dom.quickSettings.classList.contains('hidden')) renderQuickSettings();
      };
      ['levelchange', 'chargingchange'].forEach((eventName) => battery.addEventListener(eventName, update));
      update();
    }).catch(() => {});
  }
}

function setSetting(key, value) {
  state.settings[key] = value;
  saveState();
  applySettings();
}

function startBootSequence() {
  setTimeout(() => {
    dom.bootScreen.classList.add('hidden');
    dom.system.classList.remove('booting');
    isBooted = true;
    showLockScreen(hasSavedSnapshot ? 'lock' : 'signin');
  }, 1500);
}

function mountBrowser(win, root, options = {}) {
  const browserState = win.state.browser || {
    tabs: [],
    activeTabId: null,
    lastResults: [],
  };
  win.state.browser = browserState;

  function createTab(url = 'chrome://newtab') {
    const normalized = normalizeBrowserUrl(url);
    return {
      id: uid('tab'),
      history: [normalized],
      index: 0,
      title: normalized === 'chrome://newtab' ? 'New Tab' : normalized,
    };
  }

  function ensureTab() {
    if (!browserState.tabs.length) {
      const tab = createTab(options.url || 'chrome://newtab');
      browserState.tabs.push(tab);
      browserState.activeTabId = tab.id;
    }
  }

  function currentTab() {
    ensureTab();
    return browserState.tabs.find((tab) => tab.id === browserState.activeTabId) || browserState.tabs[0];
  }

  function currentUrl() {
    const tab = currentTab();
    return tab.history[tab.index];
  }

  function setTabTitle(title) {
    currentTab().title = title;
    setWindowTitle(win, `${title} — Browser`);
  }

  function navigate(url, mode = 'push') {
    const tab = currentTab();
    const normalized = normalizeBrowserUrl(url);
    if (mode === 'push') {
      tab.history = tab.history.slice(0, tab.index + 1);
      tab.history.push(normalized);
      tab.index += 1;
    } else {
      tab.history[tab.index] = normalized;
    }
    render();
  }

  function go(delta) {
    const tab = currentTab();
    const nextIndex = clamp(tab.index + delta, 0, tab.history.length - 1);
    if (nextIndex !== tab.index) {
      tab.index = nextIndex;
      render();
    }
  }

  function newTab(url) {
    const tab = createTab(url);
    browserState.tabs.push(tab);
    browserState.activeTabId = tab.id;
    render();
  }

  function closeTab(tabId) {
    if (browserState.tabs.length === 1) {
      browserState.tabs = [createTab('chrome://newtab')];
      browserState.activeTabId = browserState.tabs[0].id;
      render();
      return;
    }
    browserState.tabs = browserState.tabs.filter((tab) => tab.id !== tabId);
    if (browserState.activeTabId === tabId) browserState.activeTabId = browserState.tabs[0].id;
    render();
  }

  function getLocalPage(url) {
    if (url === 'chrome://newtab' || url === 'chrome://welcome') {
      const shortcuts = ['files', 'mail', 'tasks', 'calendar', 'gallery', 'clock', 'paint', 'settings'];
      return {
        title: url === 'chrome://welcome' ? 'Welcome' : 'New Tab',
        html: `
          <div class="browser-page">
            <div class="browser-hero">
              <div class="info-card">
                <strong>${url === 'chrome://welcome' ? 'Welcome to ChromeOS Web' : 'New Tab'}</strong>
                <p class="browser-hint">A detailed ChromeOS-inspired desktop that runs entirely in the browser with windows, files, settings, notifications, and built-in apps.</p>
              </div>
              <div class="shortcut-grid">
                ${shortcuts.map((appId) => `<button class="shortcut-card" data-open-app="${appId}">${renderIcon(appId)}<strong>${escapeHtml(APPS[appId].title)}</strong><span>${escapeHtml(APPS[appId].description)}</span></button>`).join('')}
              </div>
              <div class="info-grid">
                <div class="info-card"><strong>Launcher</strong><p>Press Ctrl + Space to search apps, files, notes, mail, tasks, profiles, and events.</p></div>
                <div class="info-card"><strong>Quick Settings</strong><p>Adjust brightness, theme, desks, widgets, wallpapers, battery saver, and Do Not Disturb.</p></div>
                <div class="info-card"><strong>Files & Apps</strong><p>Import files, edit documents, capture snapshots, draw, manage mail and tasks, and browse your local workspace.</p></div>
              </div>
            </div>
          </div>
        `,
      };
    }

    if (url === 'chrome://apps') {
      return {
        title: 'Apps',
        html: `
          <div class="browser-page">
            <div class="shortcut-grid">
              ${APP_IDS.map((appId) => `<button class="shortcut-card" data-open-app="${appId}">${renderIcon(appId)}<strong>${escapeHtml(APPS[appId].title)}</strong><span>${escapeHtml(APPS[appId].description)}</span></button>`).join('')}
            </div>
          </div>
        `,
      };
    }

    if (url === 'chrome://help') {
      return {
        title: 'Help',
        html: `
          <div class="browser-page">
            <div class="info-grid">
              <div class="info-card"><strong>Shortcuts</strong><p>Ctrl + Space opens Launcher • Alt + Tab cycles windows • Ctrl + S saves in Text editor • Ctrl + Alt + L locks the screen.</p></div>
              <div class="info-card"><strong>Terminal</strong><p>Try help, ls, cat, pwd, cd, mkdir, touch, rm, theme, wallpaper, notify, and open. New apps include Tasks, Mail, Clock, Canvas, and Media.</p></div>
              <div class="info-card"><strong>Camera</strong><p>If camera permission is unavailable, the app can still generate a stylized demo snapshot.</p></div>
            </div>
          </div>
        `,
      };
    }

    if (url.startsWith('search://')) {
      const query = decodeURIComponent(url.slice('search://'.length));
      const results = buildSearchEntries(query);
      browserState.lastResults = results;
      return {
        title: `Search: ${query}`,
        html: `
          <div class="browser-page">
            <div class="info-card"><strong>Search results for “${escapeHtml(query)}”</strong><p>Searches your built-in apps, files, notes, and calendar events.</p></div>
            <div class="browser-search-results">
              ${results.length ? results.map((result, index) => `
                <button class="browser-result" data-search-result="${index}">
                  <strong>${escapeHtml(result.title)}</strong>
                  <div class="muted">${escapeHtml(result.subtitle)}</div>
                </button>
              `).join('') : '<div class="empty-state">No matching results</div>'}
            </div>
          </div>
        `,
      };
    }

    if (url.startsWith('file://')) {
      const filePath = url.replace('file://', '') || '/';
      const entry = getEntry(filePath);
      if (!entry) {
        return {
          title: 'File not found',
          html: '<div class="browser-page"><div class="empty-state">The requested local file does not exist.</div></div>',
        };
      }
      if (entry.kind === 'folder') {
        return {
          title: entry.name,
          html: `
            <div class="browser-page">
              <div class="info-card"><strong>${escapeHtml(entry.name)}</strong><p>${escapeHtml(entry.path)}</p></div>
              <button class="secondary-btn" data-open-file-path="${escapeHtml(entry.path)}">Open in Files</button>
            </div>
          `,
        };
      }
      if ((entry.mime || '').startsWith('image/')) {
        return {
          title: entry.name,
          html: `
            <div class="browser-page">
              <img class="preview-image" src="${entry.content}" alt="${escapeHtml(entry.name)}" />
              <div class="files-actions"><button class="secondary-btn" data-open-file-path="${escapeHtml(entry.path)}">Show in Gallery</button></div>
            </div>
          `,
        };
      }
      return {
        title: entry.name,
        html: `
          <div class="browser-page">
            <div class="info-card"><strong>${escapeHtml(entry.name)}</strong><p>${escapeHtml(entry.path)}</p></div>
            <pre style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(entry.content || '')}</pre>
            <div class="files-actions"><button class="secondary-btn" data-open-file-path="${escapeHtml(entry.path)}">Open in Text</button></div>
          </div>
        `,
      };
    }

    return null;
  }

  function render() {
    ensureTab();
    root.innerHTML = `
      <div class="browser-app">
        <div class="browser-tabs"></div>
        <div class="browser-toolbar">
          <button class="toolbar-btn" data-browser-control="back">←</button>
          <button class="toolbar-btn" data-browser-control="forward">→</button>
          <button class="toolbar-btn" data-browser-control="refresh">↻</button>
          <button class="toolbar-btn" data-browser-control="home">⌂</button>
          <input class="browser-omnibox" value="${escapeHtml(displayBrowserUrl(currentUrl()))}" />
          <button class="toolbar-btn" data-browser-control="new-tab">+</button>
        </div>
        <div class="browser-bookmarks">
          <button class="browser-bookmark" data-nav-url="chrome://newtab">New Tab</button>
          <button class="browser-bookmark" data-nav-url="chrome://apps">Apps</button>
          <button class="browser-bookmark" data-nav-url="chrome://help">Help</button>
          <button class="browser-bookmark" data-open-app="files">Files</button>
          <button class="browser-bookmark" data-open-app="settings">Settings</button>
        </div>
        <div class="browser-content"></div>
      </div>
    `;

    const tabsEl = root.querySelector('.browser-tabs');
    tabsEl.innerHTML = browserState.tabs.map((tab) => `
      <div class="browser-tab ${tab.id === browserState.activeTabId ? 'active' : ''}" data-tab-id="${tab.id}">
        ${renderIcon('browser', 'small')}
        <span>${escapeHtml(tab.title)}</span>
        <button type="button" data-close-tab="${tab.id}">×</button>
      </div>
    `).join('');

    const contentEl = root.querySelector('.browser-content');
    const url = currentUrl();
    const localPage = getLocalPage(url);
    if (localPage) {
      setTabTitle(localPage.title);
      contentEl.innerHTML = localPage.html;
    } else {
      setTabTitle(url);
      contentEl.innerHTML = `
        <div class="browser-frame-wrap">
          <div class="browser-status">External sites may not load in the in-app preview because the workspace preview has no network access and many websites block iframes. Internal pages and local files work fully.</div>
          <iframe src="${escapeHtml(url)}" referrerpolicy="no-referrer" sandbox="allow-same-origin allow-scripts allow-forms allow-popups"></iframe>
        </div>
      `;
    }

    root.querySelector('.browser-omnibox').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') navigate(event.target.value, 'push');
    });
  }

  root.addEventListener('click', (event) => {
    const tabId = event.target.closest('[data-tab-id]')?.dataset.tabId;
    if (tabId && !event.target.closest('[data-close-tab]')) {
      browserState.activeTabId = tabId;
      render();
      return;
    }
    const closeTabId = event.target.closest('[data-close-tab]')?.dataset.closeTab;
    if (closeTabId) {
      closeTab(closeTabId);
      return;
    }
    const control = event.target.closest('[data-browser-control]')?.dataset.browserControl;
    if (control) {
      if (control === 'back') go(-1);
      if (control === 'forward') go(1);
      if (control === 'refresh') render();
      if (control === 'home') navigate('chrome://newtab', 'push');
      if (control === 'new-tab') newTab('chrome://newtab');
      return;
    }
    const navUrl = event.target.closest('[data-nav-url]')?.dataset.navUrl;
    if (navUrl) {
      navigate(navUrl, 'push');
      return;
    }
    const openAppId = event.target.closest('[data-open-app]')?.dataset.openApp;
    if (openAppId) {
      openApp(openAppId);
      return;
    }
    const resultIndex = event.target.closest('[data-search-result]')?.dataset.searchResult;
    if (resultIndex != null) {
      const result = browserState.lastResults[Number(resultIndex)];
      if (result.kind === 'app') openApp(result.appId);
      if (result.kind === 'file') openFileEntry(getEntry(result.path));
      if (result.kind === 'note') openApp('notes');
      if (result.kind === 'event') openApp('calendar', { date: result.date });
      if (result.kind === 'task') openApp('tasks');
      if (result.kind === 'mail') openApp('mail', { mailId: result.mailId });
      if (result.kind === 'profile') showLockScreen('signin', result.profileId);
      return;
    }
    const openFilePath = event.target.closest('[data-open-file-path]')?.dataset.openFilePath;
    if (openFilePath) {
      openFileEntry(getEntry(openFilePath));
    }
  });

  ensureTab();
  render();

  return {
    render,
    navigate,
    onReuse(nextOptions) {
      focusWindow(win);
      if (nextOptions?.url) navigate(nextOptions.url, 'push');
    },
  };
}

function normalizeBrowserUrl(input) {
  const value = String(input || '').trim();
  if (!value) return 'chrome://newtab';
  if (/^chrome:\/\//i.test(value)) return value.toLowerCase();
  if (/^search:\/\//i.test(value)) return value;
  if (/^file:\/\//i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `file://${value}`;
  if (value.includes('.') && !value.includes(' ')) return `https://${value}`;
  return `search://${encodeURIComponent(value)}`;
}

function displayBrowserUrl(url) {
  if (url.startsWith('search://')) return decodeURIComponent(url.slice('search://'.length));
  return url;
}

function mountFiles(win, root, options = {}) {
  const fileState = win.state.files || {
    path: options.path || '/Documents',
    selectedPath: null,
  };
  win.state.files = fileState;

  function currentSelection() {
    return fileState.selectedPath ? getEntry(fileState.selectedPath) : null;
  }

  function navigate(path) {
    const target = getEntry(path);
    if (target && target.kind === 'folder') {
      fileState.path = target.path;
      fileState.selectedPath = null;
      render();
    }
  }

  async function createNewFolder() {
    const result = await showFormDialog({
      title: 'New folder',
      fields: [{ name: 'name', label: 'Folder name', placeholder: 'Untitled Folder' }],
      submitLabel: 'Create',
    });
    if (!result?.name) return;
    try {
      createFolder(`${fileState.path}/${result.name}`);
      sendNotification('Folder created', `${result.name} was added to ${fileState.path}`);
      render();
      renderLauncher();
    } catch (error) {
      sendNotification('Folder not created', error.message, 'files', false);
    }
  }

  async function createNewFile() {
    const result = await showFormDialog({
      title: 'New text file',
      fields: [{ name: 'name', label: 'File name', placeholder: 'Untitled.txt', value: 'Untitled.txt' }],
      submitLabel: 'Create',
    });
    if (!result?.name) return;
    try {
      const created = createFile(`${fileState.path}/${result.name}`, '', 'text/plain');
      render();
      renderLauncher();
      openApp('text', { path: created.path });
      sendNotification('Text file created', created.name);
    } catch (error) {
      sendNotification('File not created', error.message, 'files', false);
    }
  }

  async function renameSelected() {
    const entry = currentSelection();
    if (!entry) return;
    const result = await showFormDialog({
      title: 'Rename',
      fields: [{ name: 'name', label: 'New name', value: entry.name }],
      submitLabel: 'Rename',
    });
    if (!result?.name || result.name === entry.name) return;
    try {
      renamePath(entry.path, result.name);
      if (fileState.selectedPath === entry.path) fileState.selectedPath = normalizePath(`${parentPath(entry.path)}/${result.name}`);
      render();
      renderLauncher();
      rerenderAppWindows('gallery');
      sendNotification('Renamed', `${entry.name} is now ${result.name}`);
    } catch (error) {
      sendNotification('Rename failed', error.message, 'files', false);
    }
  }

  function deleteSelected() {
    const entry = currentSelection();
    if (!entry) return;
    if (!confirm(`Delete ${entry.name}?`)) return;
    deletePath(entry.path);
    fileState.selectedPath = null;
    render();
    renderLauncher();
    rerenderAppWindows('gallery');
    sendNotification('Deleted', `${entry.name} was removed`);
  }

  function previewHtml(entry) {
    if (!entry) {
      const items = listDirectory(fileState.path);
      return `
        <div class="preview-pane">
          <h3>${escapeHtml(baseName(fileState.path) || 'Root')}</h3>
          <div class="preview-meta">${items.length} item${items.length === 1 ? '' : 's'} in this folder</div>
          <p class="muted">Select a file or folder to preview it here.</p>
        </div>
      `;
    }
    if (entry.kind === 'folder') {
      const count = listDirectory(entry.path).length;
      return `
        <div class="preview-pane">
          <h3>${escapeHtml(entry.name)}</h3>
          <div class="preview-meta">Folder • ${count} item${count === 1 ? '' : 's'}</div>
          <p class="muted">Path: ${escapeHtml(entry.path)}</p>
          <div class="files-actions">
            <button class="secondary-btn" data-preview-action="open">Open</button>
            <button class="secondary-btn" data-preview-action="rename">Rename</button>
            <button class="secondary-btn" data-preview-action="delete">Delete</button>
          </div>
        </div>
      `;
    }
    if ((entry.mime || '').startsWith('image/')) {
      return `
        <div class="preview-pane">
          <img class="preview-image" src="${entry.content}" alt="${escapeHtml(entry.name)}" />
          <h3>${escapeHtml(entry.name)}</h3>
          <div class="preview-meta">${escapeHtml(entry.mime || 'Image')} • ${formatFileSize(entry.size)}</div>
          <div class="files-actions">
            <button class="secondary-btn" data-preview-action="open">Open</button>
            <button class="secondary-btn" data-preview-action="download">Download</button>
          </div>
        </div>
      `;
    }
    if ((entry.mime || '').startsWith('audio/')) {
      return `
        <div class="preview-pane">
          <h3>${escapeHtml(entry.name)}</h3>
          <audio controls src="${entry.content}" style="width:100%;"></audio>
          <div class="preview-meta">${escapeHtml(entry.mime || 'Audio')} • ${formatFileSize(entry.size)}</div>
          <div class="files-actions">
            <button class="secondary-btn" data-preview-action="open">Open in Media</button>
            <button class="secondary-btn" data-preview-action="download">Download</button>
          </div>
        </div>
      `;
    }
    if ((entry.mime || '').startsWith('video/')) {
      return `
        <div class="preview-pane">
          <h3>${escapeHtml(entry.name)}</h3>
          <video controls src="${entry.content}" style="width:100%; border-radius:16px;"></video>
          <div class="preview-meta">${escapeHtml(entry.mime || 'Video')} • ${formatFileSize(entry.size)}</div>
          <div class="files-actions">
            <button class="secondary-btn" data-preview-action="open">Open in Media</button>
            <button class="secondary-btn" data-preview-action="download">Download</button>
          </div>
        </div>
      `;
    }
    return `
      <div class="preview-pane">
        <h3>${escapeHtml(entry.name)}</h3>
        <div class="preview-meta">${escapeHtml(entry.mime || 'Text file')} • ${formatFileSize(entry.size)}</div>
        <pre style="white-space: pre-wrap; line-height: 1.5;">${escapeHtml(String(entry.content || '').slice(0, 1800))}</pre>
        <div class="files-actions">
          <button class="secondary-btn" data-preview-action="open">Open</button>
          <button class="secondary-btn" data-preview-action="rename">Rename</button>
          <button class="secondary-btn" data-preview-action="download">Download</button>
          <button class="secondary-btn" data-preview-action="delete">Delete</button>
        </div>
      </div>
    `;
  }

  function render() {
    const list = listDirectory(fileState.path);
    root.innerHTML = `
      <div class="files-app">
        <aside class="files-sidebar">
          <div>
            <div class="section-title">Locations</div>
            ${['/', '/Documents', '/Downloads', '/Pictures', '/Notes'].map((path) => `
              <button class="${fileState.path === path ? 'active' : ''}" data-nav-path="${path}">${escapeHtml(path === '/' ? 'My files' : baseName(path))}</button>
            `).join('')}
          </div>
          <div class="info-card">
            <strong>Tips</strong>
            <p>Double-click folders to open them. Import your own files, then edit or preview them inside the built-in apps.</p>
          </div>
        </aside>
        <section class="files-main">
          <div class="files-toolbar">
            <div class="files-breadcrumb">
              ${buildBreadcrumb(fileState.path)}
            </div>
            <div style="flex:1"></div>
            <button class="toolbar-btn" data-action="up">Up</button>
            <button class="toolbar-btn" data-action="new-folder">New Folder</button>
            <button class="toolbar-btn" data-action="new-file">New Text</button>
            <button class="toolbar-btn" data-action="import">Import</button>
            <input type="file" class="hidden" multiple />
          </div>
          <div class="files-body">
            <div class="files-list">
              ${list.length ? list.map((entry) => `
                <button class="file-row ${fileState.selectedPath === entry.path ? 'active' : ''}" data-entry-path="${entry.path}">
                  ${renderIcon(entry.kind === 'folder' ? 'files' : (entry.mime || '').startsWith('image/') ? 'gallery' : 'text')}
                  <div class="file-title">
                    <strong>${escapeHtml(entry.name)}</strong>
                    <div class="file-meta">${entry.kind === 'folder' ? 'Folder' : escapeHtml(entry.mime || 'File')} • ${formatDateTime(entry.modified)}</div>
                  </div>
                  <div class="file-meta">${entry.kind === 'folder' ? '' : formatFileSize(entry.size)}</div>
                </button>
              `).join('') : '<div class="empty-state">This folder is empty.</div>'}
            </div>
            <aside class="files-preview">
              <div class="files-preview-inner">
                ${previewHtml(currentSelection())}
              </div>
            </aside>
          </div>
        </section>
      </div>
    `;
  }

  function buildBreadcrumb(path) {
    const normalized = normalizePath(path);
    if (normalized === '/') return '<button class="crumb-btn" data-nav-path="/">My files</button>';
    const parts = normalized.split('/').filter(Boolean);
    const crumbs = ['<button class="crumb-btn" data-nav-path="/">My files</button>'];
    let current = '';
    parts.forEach((part) => {
      current += `/${part}`;
      crumbs.push(`<span>›</span><button class="crumb-btn" data-nav-path="${current}">${escapeHtml(part)}</button>`);
    });
    return crumbs.join('');
  }

  root.addEventListener('click', async (event) => {
    const navPath = event.target.closest('[data-nav-path]')?.dataset.navPath;
    if (navPath) {
      navigate(navPath);
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action) {
      if (action === 'up') navigate(parentPath(fileState.path));
      if (action === 'new-folder') await createNewFolder();
      if (action === 'new-file') await createNewFile();
      if (action === 'import') root.querySelector('input[type="file"]').click();
      return;
    }
    const filePath = event.target.closest('[data-entry-path]')?.dataset.entryPath;
    if (filePath) {
      if (fileState.selectedPath === filePath) {
        openFileEntry(getEntry(filePath));
        return;
      }
      fileState.selectedPath = filePath;
      render();
      return;
    }
    const previewAction = event.target.closest('[data-preview-action]')?.dataset.previewAction;
    if (previewAction) {
      const selected = currentSelection();
      if (!selected) return;
      if (previewAction === 'open') openFileEntry(selected);
      if (previewAction === 'rename') await renameSelected();
      if (previewAction === 'delete') deleteSelected();
      if (previewAction === 'download') downloadFile(selected);
    }
  });


  root.addEventListener('change', async (event) => {
    if (event.target.matches('input[type="file"]')) {
      await importFiles(event.target.files, fileState.path);
      render();
      renderLauncher();
      event.target.value = '';
    }
  });

  render();
  setWindowTitle(win, `Files — ${baseName(fileState.path) === '/' ? 'My files' : baseName(fileState.path)}`);

  return {
    render() {
      render();
      setWindowTitle(win, `Files — ${baseName(fileState.path) === '/' ? 'My files' : baseName(fileState.path)}`);
    },
    onReuse(nextOptions) {
      if (nextOptions?.path) {
        fileState.path = normalizePath(nextOptions.path);
        fileState.selectedPath = null;
      }
      render();
    },
  };
}

function mountText(win, root, options = {}) {
  const editorState = win.state.text || {
    path: options.path || '',
    content: '',
    dirty: false,
  };
  win.state.text = editorState;

  function loadPath(path) {
    if (!path) return;
    const entry = getEntry(path);
    if (entry && entry.kind === 'file') {
      editorState.path = entry.path;
      editorState.content = String(entry.content || '');
      editorState.dirty = false;
    }
  }

  async function save(asNew = false) {
    if (!editorState.path || asNew) {
      const folders = state.files.filter((entry) => entry.kind === 'folder').map((entry) => ({ value: entry.path, label: entry.path === '/' ? '/' : entry.path }));
      const result = await showFormDialog({
        title: asNew ? 'Save as' : 'Save file',
        fields: [
          { name: 'folder', label: 'Folder', type: 'select', value: parentPath(editorState.path || '/Documents/New File.txt'), options: folders },
          { name: 'name', label: 'File name', value: baseName(editorState.path || '/Documents/New File.txt') },
        ],
      });
      if (!result?.name) return;
      editorState.path = normalizePath(`${result.folder}/${result.name}`);
    }

    const existing = getEntry(editorState.path);
    if (existing) {
      updateFile(editorState.path, editorState.content, existing.mime || 'text/plain');
    } else {
      createFile(editorState.path, editorState.content, 'text/plain');
    }
    editorState.dirty = false;
    sendNotification('File saved', baseName(editorState.path), 'text');
    renderLauncher();
    rerenderAppWindows('files');
    render();
  }

  function render() {
    const title = editorState.path ? baseName(editorState.path) : 'Untitled';
    const words = editorState.content.trim() ? editorState.content.trim().split(/\s+/).length : 0;
    setWindowTitle(win, `${title}${editorState.dirty ? ' •' : ''} — Text`);
    root.innerHTML = `
      <div class="text-app">
        <div class="text-toolbar">
          <div class="text-actions">
            <button class="toolbar-btn" data-action="save">Save</button>
            <button class="toolbar-btn" data-action="save-as">Save As</button>
            <button class="toolbar-btn" data-action="open-files">Browse Files</button>
          </div>
        </div>
        <div class="text-editor-shell">
          <aside class="text-editor-meta">
            <h3>${escapeHtml(title)}</h3>
            <div class="muted">${escapeHtml(editorState.path || 'Unsaved document')}</div>
            <div class="info-card"><strong>Stats</strong><p>${words} words • ${editorState.content.length} characters</p></div>
            <div class="info-card"><strong>Keyboard</strong><p>Use Ctrl + S to save quickly.</p></div>
          </aside>
          <textarea class="text-editor-textarea" spellcheck="false">${escapeHtml(editorState.content)}</textarea>
        </div>
      </div>
    `;
    const textarea = root.querySelector('textarea');
    textarea.addEventListener('input', () => {
      editorState.content = textarea.value;
      editorState.dirty = true;
      setWindowTitle(win, `${title} • — Text`);
    });
    textarea.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        save();
      }
    });
  }

  root.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'save') await save(false);
    if (action === 'save-as') await save(true);
    if (action === 'open-files') openApp('files', { path: editorState.path ? parentPath(editorState.path) : '/Documents' });
    render();
  });

  loadPath(options.path);
  render();

  return {
    render,
    onReuse(nextOptions) {
      if (nextOptions?.path) loadPath(nextOptions.path);
      render();
    },
  };
}

function mountNotes(win, root) {
  const colors = ['#fff1a8', '#c9f7d5', '#ffd4e2', '#d7d4ff', '#ffd8b1'];

  function render() {
    setWindowTitle(win, 'Notes');
    root.innerHTML = `
      <div class="notes-app">
        <div class="notes-toolbar">
          <button class="toolbar-btn" data-action="new-note">New note</button>
        </div>
        <div class="notes-workspace">
          ${state.notes.map((note) => `
            <div class="note-card" data-note-id="${note.id}" style="background:${note.color}; color:#1f2937;">
              <input value="${escapeHtml(note.title)}" data-field="title" />
              <textarea data-field="content">${escapeHtml(note.content)}</textarea>
              <div class="note-actions">
                <select data-field="color">
                  ${colors.map((color) => `<option value="${color}" ${color === note.color ? 'selected' : ''}>${color}</option>`).join('')}
                </select>
                <button class="secondary-btn" data-action="duplicate-note">Duplicate</button>
                <button class="secondary-btn" data-action="delete-note">Delete</button>
              </div>
              <div class="note-meta">Updated ${escapeHtml(formatDateTime(note.updated))}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  async function createNote() {
    const result = await showFormDialog({
      title: 'New note',
      fields: [{ name: 'title', label: 'Title', value: 'New Note' }, { name: 'content', label: 'Content', type: 'textarea', value: '' }],
      submitLabel: 'Create',
    });
    if (!result) return;
    state.notes.unshift({ id: uid('note'), title: result.title || 'New Note', content: result.content || '', color: colors[0], updated: Date.now() });
    saveState();
    render();
    renderLauncher();
  }

  root.addEventListener('click', async (event) => {
    const toolbarAction = event.target.closest('[data-action="new-note"]');
    if (toolbarAction) {
      await createNote();
      return;
    }
    const card = event.target.closest('[data-note-id]');
    if (!card) return;
    const note = state.notes.find((item) => item.id === card.dataset.noteId);
    if (!note) return;
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'duplicate-note') {
      state.notes.unshift({ ...note, id: uid('note'), title: `${note.title} copy`, updated: Date.now() });
      saveState();
      render();
    }
    if (action === 'delete-note') {
      state.notes = state.notes.filter((item) => item.id !== note.id);
      saveState();
      render();
      renderLauncher();
    }
  });

  root.addEventListener('input', (event) => {
    const card = event.target.closest('[data-note-id]');
    if (!card) return;
    const note = state.notes.find((item) => item.id === card.dataset.noteId);
    if (!note) return;
    note[event.target.dataset.field] = event.target.value;
    note.updated = Date.now();
    saveState();
    renderLauncher();
  });

  render();
  return {
    render,
    onReuse(nextOptions) {
      if (nextOptions?.tab) settingsState.tab = nextOptions.tab;
      render();
    },
  };
}

function mountCalculator(win, root) {
  const calcState = win.state.calculator || {
    expression: '0',
    history: [],
  };
  win.state.calculator = calcState;

  function evaluateExpression() {
    try {
      const sanitized = calcState.expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/[^0-9+\-*/().% ]/g, '');
      const result = Function(`"use strict"; return (${sanitized})`)();
      calcState.history.unshift(`${calcState.expression} = ${result}`);
      calcState.history = calcState.history.slice(0, 24);
      calcState.expression = String(result);
    } catch (error) {
      calcState.history.unshift(`${calcState.expression} = Error`);
      calcState.expression = '0';
    }
    render();
  }

  function pushValue(value) {
    if (calcState.expression === '0' && /[0-9.]/.test(value)) calcState.expression = value;
    else calcState.expression += value;
    render();
  }

  function render() {
    setWindowTitle(win, 'Calculator');
    root.innerHTML = `
      <div class="calculator-app">
        <div class="calc-wrap">
          <section class="calc-panel">
            <div class="calc-display">
              <div class="calc-history-line">${escapeHtml(calcState.history[0] || '')}</div>
              <div class="calc-current">${escapeHtml(calcState.expression)}</div>
            </div>
            <div class="calc-keypad">
              ${[
                ['C', 'clear'], ['(', 'operator'], [')', 'operator'], ['÷', 'operator'],
                ['7'], ['8'], ['9'], ['×', 'operator'],
                ['4'], ['5'], ['6'], ['-', 'operator'],
                ['1'], ['2'], ['3'], ['+', 'operator'],
                ['0'], ['.'], ['⌫', 'operator'], ['=', 'equals'],
              ].map(([label, kind = '']) => `<button class="calc-key ${kind}" data-key="${escapeHtml(label)}">${escapeHtml(label)}</button>`).join('')}
            </div>
          </section>
          <aside class="calc-history">
            <strong>History</strong>
            <div style="display:grid; gap:10px; margin-top:12px;">
              ${calcState.history.length ? calcState.history.map((line) => `<div class="info-card">${escapeHtml(line)}</div>`).join('') : '<div class="muted">No calculations yet.</div>'}
            </div>
          </aside>
        </div>
      </div>
    `;
  }

  root.addEventListener('click', (event) => {
    const key = event.target.closest('[data-key]')?.dataset.key;
    if (!key) return;
    if (key === 'C') {
      calcState.expression = '0';
      render();
      return;
    }
    if (key === '⌫') {
      calcState.expression = calcState.expression.length > 1 ? calcState.expression.slice(0, -1) : '0';
      render();
      return;
    }
    if (key === '=') {
      evaluateExpression();
      return;
    }
    pushValue(key);
  });

  render();
  return {
    render,
    onReuse(nextOptions) {
      if (nextOptions?.tab) settingsState.tab = nextOptions.tab;
      render();
    },
  };
}

function mountCalendar(win, root, options = {}) {
  const calendarState = win.state.calendar || {
    viewDate: new Date(),
    selectedDate: options.date || todayIso(),
  };
  win.state.calendar = calendarState;
  if (options.date) calendarState.selectedDate = options.date;

  async function addEvent(defaultDate = calendarState.selectedDate) {
    const result = await showFormDialog({
      title: 'New event',
      fields: [
        { name: 'title', label: 'Title', value: 'New event' },
        { name: 'date', label: 'Date', type: 'date', value: defaultDate },
        { name: 'time', label: 'Time', type: 'time', value: '09:00' },
      ],
      submitLabel: 'Add event',
    });
    if (!result?.title) return;
    state.events.push({ id: uid('evt'), title: result.title, date: result.date || defaultDate, time: result.time || '', color: state.settings.accent });
    state.events.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    saveState();
    render();
    renderLauncher();
    if (!dom.quickSettings.classList.contains('hidden')) renderQuickSettings();
  }

  function render() {
    const viewDate = new Date(calendarState.viewDate);
    const monthLabel = new Intl.DateTimeFormat([], { month: 'long', year: 'numeric' }).format(viewDate);
    const days = buildCalendarMatrix(viewDate);
    const selectedEvents = state.events.filter((event) => event.date === calendarState.selectedDate);
    setWindowTitle(win, 'Calendar');

    root.innerHTML = `
      <div class="calendar-app">
        <div class="calendar-toolbar">
          <button class="toolbar-btn" data-action="prev-month">←</button>
          <button class="toolbar-btn" data-action="today">Today</button>
          <button class="toolbar-btn" data-action="next-month">→</button>
          <strong>${escapeHtml(monthLabel)}</strong>
          <div style="flex:1"></div>
          <button class="toolbar-btn" data-action="add-event">Add event</button>
        </div>
        <div class="calendar-shell">
          <section class="calendar-board">
            <div class="calendar-grid">
              ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => `<div class="calendar-weekday">${day}</div>`).join('')}
              ${days.map((date) => {
                const iso = dateToLocalIso(date);
                const isOutside = date.getMonth() !== viewDate.getMonth();
                const eventCount = getEventCount(iso);
                return `
                  <button class="calendar-day ${calendarState.selectedDate === iso ? 'active' : ''} ${isOutside ? 'outside' : ''}" data-date="${iso}">
                    <strong>${date.getDate()}</strong>
                    ${eventCount ? `<div class="calendar-dot"></div><small>${eventCount} event${eventCount === 1 ? '' : 's'}</small>` : '<small class="muted">&nbsp;</small>'}
                  </button>
                `;
              }).join('')}
            </div>
          </section>
          <aside class="calendar-side">
            <h3>${escapeHtml(calendarState.selectedDate)}</h3>
            <p>Events for the selected day.</p>
            <div class="calendar-actions"><button class="secondary-btn" data-action="add-event">Add event</button></div>
            ${selectedEvents.length ? selectedEvents.map((event) => `
              <div class="event-card" data-event-id="${event.id}">
                <strong>${escapeHtml(event.title)}</strong>
                <p>${escapeHtml(event.time || 'All day')}</p>
              </div>
            `).join('') : '<div class="muted">No events for this day.</div>'}
          </aside>
        </div>
      </div>
    `;
  }

  root.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action) {
      if (action === 'prev-month') {
        calendarState.viewDate = new Date(calendarState.viewDate.getFullYear(), calendarState.viewDate.getMonth() - 1, 1);
        render();
      }
      if (action === 'next-month') {
        calendarState.viewDate = new Date(calendarState.viewDate.getFullYear(), calendarState.viewDate.getMonth() + 1, 1);
        render();
      }
      if (action === 'today') {
        calendarState.viewDate = new Date();
        calendarState.selectedDate = todayIso();
        render();
      }
      if (action === 'add-event') await addEvent(calendarState.selectedDate);
      return;
    }
    const date = event.target.closest('[data-date]')?.dataset.date;
    if (date) {
      calendarState.selectedDate = date;
      render();
    }
  });

  render();
  return {
    render,
    onReuse(nextOptions) {
      if (nextOptions?.date) {
        calendarState.selectedDate = nextOptions.date;
        calendarState.viewDate = new Date(nextOptions.date);
      }
      render();
    },
  };
}

function mountTerminal(win, root) {
  const terminalState = win.state.terminal || {
    cwd: '/',
    lines: [
      { text: 'ChromeOS Web Terminal', className: 'success' },
      { text: 'Type “help” to see available commands.', className: 'dim' },
    ],
  };
  win.state.terminal = terminalState;

  function print(text, className = '') {
    terminalState.lines.push({ text, className });
    render();
    const output = root.querySelector('.terminal-output');
    if (output) output.scrollTop = output.scrollHeight;
  }

  function listCommand(pathArg) {
    const path = resolvePath(terminalState.cwd, pathArg || '.');
    const entry = getEntry(path);
    if (!entry || entry.kind !== 'folder') {
      print(`ls: cannot access ${path}`, 'error');
      return;
    }
    const items = listDirectory(path);
    print(items.length ? items.map((item) => item.name + (item.kind === 'folder' ? '/' : '')).join('    ') : '(empty)');
  }

  async function run(commandLine) {
    const trimmed = commandLine.trim();
    if (!trimmed) return;
    print(`web@chromeos:${terminalState.cwd}$ ${trimmed}`);
    const parts = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((token) => token.replace(/^"|"$/g, '')) || [];
    const [command, ...args] = parts;

    if (command === 'help') {
      print('help, clear, pwd, ls [path], cd [path], cat <file>, mkdir <folder>, touch <file>, rm <path>, open <app>, theme <light|dark>, wallpaper <id>, notify <message>, desk <next|list>, date, whoami, neofetch');
      return;
    }
    if (command === 'clear') {
      terminalState.lines = [];
      render();
      return;
    }
    if (command === 'pwd') return print(terminalState.cwd);
    if (command === 'ls') return listCommand(args[0]);
    if (command === 'cd') {
      const path = resolvePath(terminalState.cwd, args[0] || '/');
      const entry = getEntry(path);
      if (entry && entry.kind === 'folder') {
        terminalState.cwd = path;
        render();
      } else print(`cd: no such directory: ${path}`, 'error');
      return;
    }
    if (command === 'cat') {
      const path = resolvePath(terminalState.cwd, args[0] || '');
      const entry = getEntry(path);
      if (entry && entry.kind === 'file') print(String(entry.content || ''));
      else print(`cat: file not found: ${path}`, 'error');
      return;
    }
    if (command === 'mkdir') {
      const path = resolvePath(terminalState.cwd, args[0] || 'New Folder');
      try {
        createFolder(path);
        print(`created ${path}`, 'success');
        rerenderAppWindows('files');
        renderLauncher();
      } catch (error) {
        print(error.message, 'error');
      }
      return;
    }
    if (command === 'touch') {
      const path = resolvePath(terminalState.cwd, args[0] || 'New File.txt');
      try {
        if (getEntry(path)) updateFile(path, String(getEntry(path).content || ''), getEntry(path).mime || 'text/plain');
        else createFile(path, '', 'text/plain');
        print(`updated ${path}`, 'success');
        rerenderAppWindows('files');
        renderLauncher();
      } catch (error) {
        print(error.message, 'error');
      }
      return;
    }
    if (command === 'rm') {
      const path = resolvePath(terminalState.cwd, args[0] || '');
      try {
        deletePath(path);
        print(`removed ${path}`, 'success');
        rerenderAppWindows('files');
        rerenderAppWindows('gallery');
        renderLauncher();
      } catch (error) {
        print(error.message, 'error');
      }
      return;
    }
    if (command === 'open') {
      const appName = args[0];
      if (APPS[appName]) {
        openApp(appName);
        print(`opened ${appName}`, 'success');
      } else print(`unknown app: ${appName}`, 'error');
      return;
    }
    if (command === 'theme') {
      const value = args[0];
      if (value === 'light' || value === 'dark') {
        setSetting('theme', value);
        print(`theme set to ${value}`, 'success');
      } else print('theme expects light or dark', 'error');
      return;
    }
    if (command === 'wallpaper') {
      const value = args[0];
      if (WALLPAPERS.some((wallpaper) => wallpaper.id === value)) {
        setSetting('wallpaper', value);
        print(`wallpaper set to ${value}`, 'success');
      } else print(`wallpaper not found. options: ${WALLPAPERS.map((w) => w.id).join(', ')}`, 'error');
      return;
    }
    if (command === 'notify') {
      sendNotification('Terminal', args.join(' ') || 'Hello from Terminal', 'terminal');
      print('notification sent', 'success');
      return;
    }
    if (command === 'desk') {
      if (args[0] === 'next') {
        cycleDesk();
        print(`switched to ${currentDesk().name}`, 'success');
      } else {
        print(state.desks.map((desk) => `${desk.id === state.currentDeskId ? '* ' : ''}${desk.name}`).join(' | '));
      }
      return;
    }
    if (command === 'date') return print(new Date().toString());
    if (command === 'whoami') return print('webuser');
    if (command === 'neofetch') {
      print('ChromeOS Web\n────────────\nPlatform: Browser\nDesktop: ChromeOS-inspired\nApps: Browser, Files, Text, Notes, Calculator, Calendar, Camera, Gallery, Terminal, Tasks, Mail, Clock, Canvas, Media, Settings\nStorage used: ' + getStorageUsage());
      return;
    }

    print(`command not found: ${command}`, 'error');
  }

  function render() {
    setWindowTitle(win, 'Terminal');
    root.innerHTML = `
      <div class="terminal-app">
        <div class="terminal-shell">
          <div class="terminal-topbar">web@chromeos • ${escapeHtml(terminalState.cwd)}</div>
          <div class="terminal-output">${terminalState.lines.map((line) => `<div class="terminal-line ${line.className || ''}">${escapeHtml(line.text)}</div>`).join('')}</div>
          <form class="terminal-input-row">
            <span>›</span>
            <input class="terminal-input" autocomplete="off" spellcheck="false" />
          </form>
        </div>
      </div>
    `;
    root.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = root.querySelector('.terminal-input');
      const value = input.value;
      input.value = '';
      await run(value);
    });
  }

  render();
  return {
    render,
    onReuse(nextOptions) {
      if (nextOptions?.tab) settingsState.tab = nextOptions.tab;
      render();
    },
  };
}

function mountSettings(win, root, options = {}) {
  const settingsState = win.state.settings || { tab: options.tab || 'appearance' };
  win.state.settings = settingsState;

  function renderAppearance() {
    return `
      <div class="settings-content">
        <h3>Appearance</h3>
        <div class="settings-grid">
          <div class="setting-card">
            <strong>Theme</strong>
            <p>Switch between light and dark window styles.</p>
            <div class="pill-row">
              <button class="small-chip" data-setting-theme="light">Light</button>
              <button class="small-chip" data-setting-theme="dark">Dark</button>
            </div>
          </div>
          <div class="setting-card">
            <strong>Clock format</strong>
            <p>Toggle the 24-hour clock throughout the system.</p>
            <button class="toggle ${state.settings.twentyFourHour ? 'on' : ''}" data-setting-toggle="twentyFourHour"></button>
          </div>
          <div class="setting-card">
            <strong>Accent color</strong>
            <p>Update highlights, active states, and controls.</p>
            <div class="palette-row">
              ${ACCENTS.map((accent) => `<button class="palette-swatch ${accent === state.settings.accent ? 'active' : ''}" style="background:${accent}" data-accent="${accent}"></button>`).join('')}
            </div>
          </div>
          <div class="setting-card" style="grid-column:1/-1;">
            <strong>Wallpaper</strong>
            <p>Choose a preset wallpaper or open Gallery to use imported images.</p>
            <div class="wallpaper-grid">
              ${WALLPAPERS.map((wallpaper) => `
                <button class="wallpaper-card" data-wallpaper="${wallpaper.id}">
                  <div class="wallpaper-preview" style="background:${wallpaper.css}"></div>
                  <strong>${escapeHtml(wallpaper.name)}</strong>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderDesktopSettings() {
    return `
      <div class="settings-content">
        <h3>Desktop & widgets</h3>
        <div class="settings-grid">
          <div class="setting-card">
            <div class="setting-row"><strong>Widget rail</strong><button class="toggle ${state.settings.widgets ? 'on' : ''}" data-setting-toggle="widgets"></button></div>
            <p>Show or hide the live desktop widgets on the right side of the screen.</p>
          </div>
          <div class="setting-card">
            <div class="setting-row"><strong>Desk strip</strong><button class="toggle ${state.settings.deskBar ? 'on' : ''}" data-setting-toggle="deskBar"></button></div>
            <p>Always show desk chips at the top of the desktop for quick switching.</p>
          </div>
          <div class="setting-card" style="grid-column:1/-1;">
            <div class="setting-row"><strong>Virtual desks</strong><button class="secondary-btn" data-action="create-desk">Add desk</button></div>
            <p>Use multiple desktops to separate apps and tasks.</p>
            <div class="profile-manager-grid">
              ${state.desks.map((desk) => `
                <div class="setting-card">
                  <div class="setting-row"><strong>${escapeHtml(desk.name)}</strong><small>${desk.id === state.currentDeskId ? 'Current' : ''}</small></div>
                  <div class="settings-actions">
                    <button class="secondary-btn" data-action="switch-desk" data-desk-id="${desk.id}">Switch</button>
                    <button class="secondary-btn" data-action="rename-desk" data-desk-id="${desk.id}">Rename</button>
                    ${state.desks.length > 1 ? `<button class="secondary-btn" data-action="remove-desk" data-desk-id="${desk.id}">Remove</button>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderProfiles() {
    return `
      <div class="settings-content">
        <h3>Profiles</h3>
        <div class="info-banner">Each profile stores its own files, notes, mail, tasks, calendar, wallpaper, and preferences locally in this browser.</div>
        <div class="profile-manager-grid">
          ${store.profiles.map((profile) => `
            <div class="setting-card">
              <div class="auth-inline">
                <div class="profile-chip-avatar" style="background:${profileGradient(profile)};">${escapeHtml(profile.avatar)}</div>
                <div>
                  <strong>${escapeHtml(profile.name)}</strong>
                  <p>${profile.pin ? 'PIN protected' : 'No PIN'}${profile.id === store.currentProfileId ? ' • Current profile' : ''}</p>
                </div>
              </div>
              <div class="settings-actions">
                <button class="secondary-btn" data-action="switch-profile" data-profile-id="${profile.id}">Switch</button>
                <button class="secondary-btn" data-action="set-profile-pin" data-profile-id="${profile.id}">Set PIN</button>
                ${store.profiles.length > 1 ? `<button class="secondary-btn" data-action="delete-profile" data-profile-id="${profile.id}">Delete</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="settings-actions" style="margin-top:14px;"><button class="primary-btn" data-action="create-profile">Create profile</button></div>
      </div>
    `;
  }

  function renderSystem() {
    return `
      <div class="settings-content">
        <h3>System</h3>
        <div class="settings-grid">
          ${[
            ['wifi', 'Wi‑Fi', 'Network access and status'],
            ['bluetooth', 'Bluetooth', 'Device discovery and accessories'],
            ['nightLight', 'Night Light', 'Warmer evening colors'],
            ['dnd', 'Do Not Disturb', 'Silence notifications'],
            ['batterySaver', 'Battery Saver', 'Extend battery life'],
          ].map(([key, label, desc]) => `
            <div class="setting-card">
              <div class="setting-row"><strong>${label}</strong><button class="toggle ${state.settings[key] ? 'on' : ''}" data-setting-toggle="${key}"></button></div>
              <p>${desc}</p>
            </div>
          `).join('')}
          <div class="setting-card">
            <div class="setting-row"><strong>Storage used</strong><small>${getStorageUsage()}</small></div>
            <p>State is stored locally in your browser with localStorage.</p>
            <div class="settings-actions">
              <button class="secondary-btn" data-action="export-data">Export data</button>
              <button class="secondary-btn" data-action="reset-system">Reset desktop</button>
            </div>
          </div>
          <div class="setting-card">
            <strong>Security</strong>
            <p>Lock the screen instantly and return later.</p>
            <div class="settings-actions"><button class="secondary-btn" data-action="lock-screen">Lock now</button></div>
          </div>
        </div>
      </div>
    `;
  }

  function renderAbout() {
    return `
      <div class="settings-content">
        <h3>About</h3>
        <div class="info-grid">
          <div class="info-card"><strong>ChromeOS-inspired web desktop</strong><p>A highly interactive single-page desktop with launcher, shelf, quick settings, widgets, profiles, desks, notifications, windows, and apps.</p></div>
          <div class="info-card"><strong>Included apps</strong><p>${APP_IDS.map((appId) => APPS[appId].title).join(', ')}</p></div>
          <div class="info-card"><strong>Persistence</strong><p>Your files, notes, tasks, mail, settings, and profiles are saved locally on this browser.</p></div>
          <div class="info-card"><strong>Deployment runtime</strong><p>${runtimeStats.connected ? `Server mode • ${runtimeStatsSummary().cpu || '?'} CPU • ${runtimeStatsSummary().ramMb ? formatFileSize(runtimeStatsSummary().ramMb * 1024 * 1024) : 'unknown RAM'} • ${escapeHtml(runtimeStatsSummary().profile)}` : 'Browser-only fallback mode. Deploy as a Render web service for live host stats.'}</p></div>
        </div>
      </div>
    `;
  }

  function render() {
    setWindowTitle(win, 'Settings');
    root.innerHTML = `
      <div class="settings-app">
        <aside class="settings-tabs">
          <button class="${settingsState.tab === 'appearance' ? 'active' : ''}" data-tab="appearance">Appearance</button>
          <button class="${settingsState.tab === 'desktop' ? 'active' : ''}" data-tab="desktop">Desktop</button>
          <button class="${settingsState.tab === 'profiles' ? 'active' : ''}" data-tab="profiles">Profiles</button>
          <button class="${settingsState.tab === 'system' ? 'active' : ''}" data-tab="system">System</button>
          <button class="${settingsState.tab === 'about' ? 'active' : ''}" data-tab="about">About</button>
        </aside>
        <section class="settings-main">
          <div class="settings-toolbar">
            <strong>Settings</strong>
          </div>
          ${settingsState.tab === 'appearance' ? renderAppearance() : settingsState.tab === 'desktop' ? renderDesktopSettings() : settingsState.tab === 'profiles' ? renderProfiles() : settingsState.tab === 'system' ? renderSystem() : renderAbout()}
        </section>
      </div>
    `;
  }

  root.addEventListener('click', async (event) => {
    const tab = event.target.closest('[data-tab]')?.dataset.tab;
    if (tab) {
      settingsState.tab = tab;
      render();
      return;
    }
    const toggleKey = event.target.closest('[data-setting-toggle]')?.dataset.settingToggle;
    if (toggleKey) {
      setSetting(toggleKey, !state.settings[toggleKey]);
      render();
      return;
    }
    const theme = event.target.closest('[data-setting-theme]')?.dataset.settingTheme;
    if (theme) {
      setSetting('theme', theme);
      render();
      return;
    }
    const accent = event.target.closest('[data-accent]')?.dataset.accent;
    if (accent) {
      setSetting('accent', accent);
      render();
      return;
    }
    const wallpaper = event.target.closest('[data-wallpaper]')?.dataset.wallpaper;
    if (wallpaper) {
      setSetting('wallpaper', wallpaper);
      render();
      sendNotification('Wallpaper applied', (WALLPAPERS.find((w) => w.id === wallpaper) || {}).name || wallpaper, 'settings');
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'lock-screen') lockSystem();
    if (action === 'create-profile') { await createProfilePrompt(); render(); }
    if (action === 'switch-profile') {
      showLockScreen('signin', event.target.closest('[data-profile-id]')?.dataset.profileId);
    }
    if (action === 'delete-profile') {
      deleteProfile(event.target.closest('[data-profile-id]')?.dataset.profileId);
      render();
    }
    if (action === 'set-profile-pin') {
      const profileId = event.target.closest('[data-profile-id]')?.dataset.profileId;
      const profile = store.profiles.find((item) => item.id === profileId);
      if (profile) {
        const result = await showFormDialog({ title: `Set PIN for ${profile.name}`, fields: [{ name: 'pin', label: 'PIN (leave blank to remove)', type: 'password', value: profile.pin || '' }], submitLabel: 'Save PIN' });
        if (result) {
          profile.pin = result.pin || '';
          saveState();
          render();
        }
      }
    }
    if (action === 'create-desk') { await createDeskPrompt(); render(); }
    if (action === 'switch-desk') { switchDesk(event.target.closest('[data-desk-id]')?.dataset.deskId); render(); }
    if (action === 'rename-desk') {
      const deskId = event.target.closest('[data-desk-id]')?.dataset.deskId;
      const desk = state.desks.find((item) => item.id === deskId);
      if (desk) {
        const result = await showFormDialog({ title: 'Rename desk', fields: [{ name: 'name', label: 'Desk name', value: desk.name }], submitLabel: 'Rename' });
        if (result?.name) {
          desk.name = result.name;
          saveState();
          renderDeskStrip();
          render();
        }
      }
    }
    if (action === 'remove-desk') {
      const deskId = event.target.closest('[data-desk-id]')?.dataset.deskId;
      if (state.currentDeskId !== deskId) {
        const target = state.desks.find((item) => item.id === deskId);
        if (target && confirm(`Remove desk “${target.name}”? Windows on it will move to the current desk.`)) {
          windows.filter((win) => win.deskId === deskId).forEach((win) => { win.deskId = state.currentDeskId; });
          state.desks = state.desks.filter((item) => item.id !== deskId);
          saveState();
          renderDeskStrip();
          render();
        }
      } else {
        removeCurrentDesk();
        render();
      }
    }
    if (action === 'reset-system') {
      if (confirm('Reset the desktop and clear all saved data?')) triggerReset();
    }
    if (action === 'export-data') {
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' }));
      anchor.download = 'chromeos-web-backup.json';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(anchor.href), 500);
    }
  });

  render();
  return {
    render,
    onReuse(nextOptions) {
      if (nextOptions?.tab) settingsState.tab = nextOptions.tab;
      render();
    },
  };
}

function mountGallery(win, root, options = {}) {
  const galleryState = win.state.gallery || {
    tab: options.tab || 'wallpapers',
    selected: options.imagePath ? `file:${options.imagePath}` : `wallpaper:${state.settings.wallpaper}`,
  };
  win.state.gallery = galleryState;
  if (options.imagePath) {
    galleryState.tab = 'pictures';
    galleryState.selected = `file:${options.imagePath}`;
  }

  function getItems() {
    const wallpapers = WALLPAPERS.map((wallpaper) => ({ id: `wallpaper:${wallpaper.id}`, type: 'wallpaper', name: wallpaper.name, css: wallpaper.css, wallpaperId: wallpaper.id }));
    const pictures = state.files.filter((entry) => entry.kind === 'file' && (entry.mime || '').startsWith('image/')).map((entry) => ({ id: `file:${entry.path}`, type: 'file', name: entry.name, path: entry.path, content: entry.content, mime: entry.mime }));
    return { wallpapers, pictures };
  }

  function currentItem() {
    const { wallpapers, pictures } = getItems();
    return [...wallpapers, ...pictures].find((item) => item.id === galleryState.selected) || wallpapers[0] || pictures[0] || null;
  }

  function render() {
    const { wallpapers, pictures } = getItems();
    const items = galleryState.tab === 'wallpapers' ? wallpapers : pictures;
    const selected = currentItem();
    setWindowTitle(win, 'Gallery');

    root.innerHTML = `
      <div class="gallery-app">
        <div class="gallery-toolbar">
          <div class="gallery-actions">
            <button class="small-chip" data-tab="wallpapers">Wallpapers</button>
            <button class="small-chip" data-tab="pictures">Pictures</button>
            <button class="small-chip" data-action="open-files">Open Files</button>
          </div>
        </div>
        <div class="gallery-shell">
          <div class="gallery-grid">
            ${items.length ? items.map((item) => `
              <button class="gallery-card" data-item-id="${item.id}">
                <div class="thumb" style="${item.type === 'wallpaper' ? `background:${item.css}` : `background-image:url(${item.content}); background-size:cover; background-position:center;`}"></div>
                <div class="gallery-meta">
                  <strong>${escapeHtml(item.name)}</strong>
                  <span>${item.type === 'wallpaper' ? 'Preset wallpaper' : escapeHtml(item.mime || 'Image file')}</span>
                </div>
              </button>
            `).join('') : '<div class="empty-state">No images available yet. Import some into Pictures or take a Camera snapshot.</div>'}
          </div>
          <aside class="gallery-viewer">
            ${selected ? renderGalleryViewer(selected) : '<div class="empty-state">Select an image or wallpaper.</div>'}
          </aside>
        </div>
      </div>
    `;
  }

  function renderGalleryViewer(item) {
    if (item.type === 'wallpaper') {
      return `
        <h3>${escapeHtml(item.name)}</h3>
        <div class="large-wallpaper" style="background:${item.css}"></div>
        <p class="muted">Preset wallpaper</p>
        <div class="gallery-actions">
          <button class="secondary-btn" data-action="apply-wallpaper" data-wallpaper-id="${item.wallpaperId}">Set as wallpaper</button>
        </div>
      `;
    }
    return `
      <h3>${escapeHtml(item.name)}</h3>
      <img src="${item.content}" alt="${escapeHtml(item.name)}" />
      <p class="muted">${escapeHtml(item.mime || 'Image file')} • ${escapeHtml(item.path)}</p>
      <div class="gallery-actions">
        <button class="secondary-btn" data-action="download-image" data-path="${escapeHtml(item.path)}">Download</button>
        <button class="secondary-btn" data-action="set-image-wallpaper" data-path="${escapeHtml(item.path)}">Use as wallpaper</button>
      </div>
    `;
  }

  root.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-tab]')?.dataset.tab;
    if (tab) {
      galleryState.tab = tab;
      render();
      return;
    }
    const itemId = event.target.closest('[data-item-id]')?.dataset.itemId;
    if (itemId) {
      galleryState.selected = itemId;
      render();
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'open-files') openApp('files', { path: '/Pictures' });
    if (action === 'apply-wallpaper') {
      const wallpaperId = event.target.closest('[data-wallpaper-id]')?.dataset.wallpaperId;
      setSetting('wallpaper', wallpaperId);
      sendNotification('Wallpaper applied', 'Gallery updated the desktop wallpaper.', 'gallery');
      render();
    }
    if (action === 'download-image') {
      const path = event.target.closest('[data-path]')?.dataset.path;
      downloadFile(getEntry(path));
    }
    if (action === 'set-image-wallpaper') {
      const path = event.target.closest('[data-path]')?.dataset.path;
      setSetting('wallpaper', `custom:${path}`);
      sendNotification('Wallpaper applied', 'Using an imported image as wallpaper.', 'gallery');
      render();
    }
  });

  render();
  return {
    render,
    onReuse(nextOptions) {
      if (nextOptions?.imagePath) {
        galleryState.tab = 'pictures';
        galleryState.selected = `file:${nextOptions.imagePath}`;
      }
      render();
    },
  };
}

function mountCamera(win, root) {
  const cameraState = win.state.camera || {
    stream: null,
    started: false,
    error: '',
  };
  win.state.camera = cameraState;

  function stopCamera() {
    if (cameraState.stream) {
      cameraState.stream.getTracks().forEach((track) => track.stop());
      cameraState.stream = null;
    }
    cameraState.started = false;
    render();
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices?.getUserMedia?.({ video: true, audio: false });
      cameraState.stream = stream;
      cameraState.started = true;
      cameraState.error = '';
      render();
      const video = root.querySelector('video');
      if (video) {
        video.srcObject = stream;
        video.play().catch(() => {});
      }
    } catch (error) {
      cameraState.error = 'Camera access unavailable in this preview. You can still capture a generated demo snapshot.';
      cameraState.started = false;
      render();
    }
  }

  function timestampName() {
    const date = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `Capture-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.png`;
  }

  function generateFallbackSnapshot(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = 1280;
    canvas.height = 720;
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, state.settings.accent);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.arc(270, 160, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 82px Arial';
    ctx.fillText('Camera Demo Snapshot', 90, 610);
    ctx.font = '28px Arial';
    ctx.fillText(new Date().toLocaleString(), 96, 654);
  }

  function capture() {
    const canvas = root.querySelector('canvas');
    const video = root.querySelector('video');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (cameraState.started && video && video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
      generateFallbackSnapshot(canvas);
    }
    const dataUrl = canvas.toDataURL('image/png');
    const targetPath = `/Pictures/${timestampName()}`;
    const existing = getEntry(targetPath);
    if (existing) updateFile(targetPath, dataUrl, 'image/png');
    else createFile(targetPath, dataUrl, 'image/png');
    sendNotification('Snapshot saved', `${baseName(targetPath)} saved to Pictures`, 'camera');
    rerenderAppWindows('gallery');
    rerenderAppWindows('files');
    renderLauncher();
  }

  function render() {
    setWindowTitle(win, 'Camera');
    root.innerHTML = `
      <div class="camera-app">
        <div class="camera-toolbar">
          <div class="camera-actions">
            <button class="toolbar-btn" data-action="start">Start</button>
            <button class="toolbar-btn" data-action="capture">Capture</button>
            <button class="toolbar-btn" data-action="stop">Stop</button>
            <button class="toolbar-btn" data-action="open-gallery">Gallery</button>
          </div>
        </div>
        <div class="camera-shell">
          <div class="camera-view">
            ${cameraState.started ? '<video autoplay playsinline></video>' : `<div class="camera-fallback"><div><h3>${escapeHtml(cameraState.error || 'Camera ready')}</h3><p>${escapeHtml(cameraState.error || 'Start the camera to show a live preview, or capture a generated demo image.')}</p></div></div>`}
            <canvas class="hidden"></canvas>
          </div>
          <aside class="gallery-viewer">
            <h3>Camera</h3>
            <p class="muted">Take real snapshots when permission is available, or generate stylized demo captures when it is not.</p>
            <div class="info-card"><strong>Status</strong><p>${cameraState.started ? 'Live camera active' : cameraState.error || 'Stopped'}</p></div>
          </aside>
        </div>
      </div>
    `;
    if (cameraState.started && cameraState.stream) {
      const video = root.querySelector('video');
      if (video) {
        video.srcObject = cameraState.stream;
        video.play().catch(() => {});
      }
    }
  }

  root.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'start') await startCamera();
    if (action === 'capture') capture();
    if (action === 'stop') stopCamera();
    if (action === 'open-gallery') openApp('gallery', { tab: 'pictures' });
  });

  render();
  startCamera();
  return {
    render,
    onClose: stopCamera,
  };
}

function mountTasks(win, root) {
  const tasksState = win.state.tasksApp || {
    filter: 'all',
    selectedId: state.tasks[0]?.id || null,
  };
  win.state.tasksApp = tasksState;

  function filteredTasks() {
    const today = todayIso();
    return state.tasks.filter((task) => {
      if (tasksState.filter === 'open') return !task.done;
      if (tasksState.filter === 'done') return task.done;
      if (tasksState.filter === 'today') return task.due === today;
      return true;
    });
  }

  async function createTask() {
    const result = await showFormDialog({
      title: 'New task',
      fields: [
        { name: 'title', label: 'Title', value: 'New task' },
        { name: 'list', label: 'List', value: 'Personal' },
        { name: 'due', label: 'Due date', type: 'date', value: todayIso() },
        { name: 'priority', label: 'Priority', type: 'select', value: 'Medium', options: ['Low', 'Medium', 'High'].map((value) => ({ value, label: value })) },
        { name: 'notes', label: 'Notes', type: 'textarea', value: '' },
      ],
      submitLabel: 'Create task',
    });
    if (!result?.title) return;
    const task = {
      id: uid('task'),
      title: result.title,
      done: false,
      due: result.due || '',
      priority: result.priority || 'Medium',
      list: result.list || 'Personal',
      notes: result.notes || '',
    };
    state.tasks.unshift(task);
    tasksState.selectedId = task.id;
    saveState();
    render();
    renderWidgetRail();
    renderLauncher();
  }

  function selectedTask() {
    return state.tasks.find((task) => task.id === tasksState.selectedId) || state.tasks[0] || null;
  }

  function render() {
    const tasks = filteredTasks();
    const selected = selectedTask();
    setWindowTitle(win, 'Tasks');
    root.innerHTML = `
      <div class="tasks-app">
        <div class="task-header-row">
          <button class="toolbar-btn" data-action="new-task">New Task</button>
          ${['all', 'open', 'today', 'done'].map((filter) => `<button class="small-chip ${tasksState.filter === filter ? 'active' : ''}" data-filter="${filter}">${filter[0].toUpperCase() + filter.slice(1)}</button>`).join('')}
        </div>
        <div class="tasks-shell">
          <aside class="tasks-sidebar">
            <div class="info-banner"><strong>${state.tasks.filter((task) => !task.done).length}</strong><div class="muted">Open tasks</div></div>
            <div class="info-card"><strong>${state.tasks.filter((task) => task.due === todayIso() && !task.done).length}</strong><p>Due today</p></div>
            <div class="info-card"><strong>${state.tasks.filter((task) => task.priority === 'High' && !task.done).length}</strong><p>High priority</p></div>
          </aside>
          <section class="tasks-main">
            <div class="tasks-list">
              ${tasks.length ? tasks.map((task) => `
                <button class="task-row ${task.id === tasksState.selectedId ? 'active' : ''}" data-task-id="${task.id}">
                  <div class="setting-row">
                    <strong>${escapeHtml(task.title)}</strong>
                    <input class="task-check" type="checkbox" data-task-toggle="${task.id}" ${task.done ? 'checked' : ''} />
                  </div>
                  <div class="task-meta">${escapeHtml(task.list)}${task.due ? ` • ${escapeHtml(task.due)}` : ''} • ${escapeHtml(task.priority)}</div>
                </button>
              `).join('') : '<div class="empty-state">No tasks in this view.</div>'}
            </div>
            <div class="task-details">
              ${selected ? `
                <div class="setting-row"><h3>${escapeHtml(selected.title)}</h3><button class="secondary-btn" data-action="delete-task">Delete</button></div>
                <div class="task-form">
                  <label class="label-row"><span>Title</span><input class="settings-input" data-task-field="title" value="${escapeHtml(selected.title)}" /></label>
                  <label class="label-row"><span>List</span><input class="settings-input" data-task-field="list" value="${escapeHtml(selected.list)}" /></label>
                  <label class="label-row"><span>Due</span><input class="settings-input" type="date" data-task-field="due" value="${escapeHtml(selected.due || '')}" /></label>
                  <label class="label-row"><span>Priority</span>
                    <select class="settings-select" data-task-field="priority">
                      ${['Low', 'Medium', 'High'].map((value) => `<option value="${value}" ${selected.priority === value ? 'selected' : ''}>${value}</option>`).join('')}
                    </select>
                  </label>
                  <label class="label-row"><span>Notes</span><textarea class="form-control" data-task-field="notes">${escapeHtml(selected.notes || '')}</textarea></label>
                </div>
              ` : '<div class="empty-state">Select a task to edit it.</div>'}
            </div>
          </section>
        </div>
      </div>
    `;
  }

  root.addEventListener('click', async (event) => {
    const filter = event.target.closest('[data-filter]')?.dataset.filter;
    if (filter) {
      tasksState.filter = filter;
      render();
      return;
    }
    const toggleId = event.target.closest('[data-task-toggle]')?.dataset.taskToggle;
    if (toggleId) {
      const task = state.tasks.find((item) => item.id === toggleId);
      if (task) {
        task.done = !task.done;
        saveState();
        render();
        renderWidgetRail();
        rerenderAppWindows('tasks');
      }
      return;
    }
    const taskId = event.target.closest('[data-task-id]')?.dataset.taskId;
    if (taskId) {
      tasksState.selectedId = taskId;
      render();
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'new-task') await createTask();
    if (action === 'delete-task') {
      const selected = selectedTask();
      if (!selected) return;
      state.tasks = state.tasks.filter((task) => task.id !== selected.id);
      tasksState.selectedId = state.tasks[0]?.id || null;
      saveState();
      render();
      renderWidgetRail();
      renderLauncher();
    }
  });

  root.addEventListener('input', (event) => {
    const field = event.target.dataset.taskField;
    if (!field) return;
    const task = selectedTask();
    if (!task) return;
    task[field] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    saveState();
    renderWidgetRail();
    renderLauncher();
  });

  render();
  return {
    render,
    onReuse(nextOptions) {
      if (nextOptions?.tab) settingsState.tab = nextOptions.tab;
      render();
    },
  };
}

function mountMail(win, root, options = {}) {
  const mailState = win.state.mail || {
    folder: 'inbox',
    selectedId: options.mailId || state.mailbox.find((mail) => mail.folder === 'inbox')?.id || null,
    composing: false,
  };
  win.state.mail = mailState;

  function folderCount(folder) {
    if (folder === 'inbox') return state.mailbox.filter((mail) => mail.folder === 'inbox').length;
    if (folder === 'unread') return state.mailbox.filter((mail) => mail.folder === 'inbox' && !mail.read).length;
    return state.mailbox.filter((mail) => mail.folder === folder).length;
  }

  function visibleMail() {
    if (mailState.folder === 'unread') return state.mailbox.filter((mail) => mail.folder === 'inbox' && !mail.read).sort((a, b) => b.time - a.time);
    return state.mailbox.filter((mail) => mail.folder === mailState.folder).sort((a, b) => b.time - a.time);
  }

  function selectedMail() {
    return state.mailbox.find((mail) => mail.id === mailState.selectedId) || visibleMail()[0] || null;
  }

  function openMail(mailId) {
    mailState.composing = false;
    mailState.selectedId = mailId;
    const mail = selectedMail();
    if (mail) mail.read = true;
    saveState();
    render();
    renderWidgetRail();
  }

  async function compose(prefill = {}) {
    mailState.composing = true;
    mailState.compose = {
      to: prefill.to || '',
      subject: prefill.subject || '',
      body: prefill.body || '',
    };
    render();
  }

  function saveDraft() {
    const draft = {
      id: uid('mail'),
      folder: 'drafts',
      from: `${getCurrentProfile().name.toLowerCase().replace(/\s+/g, '.')}@chromeos-web.local`,
      to: mailState.compose.to || '',
      subject: mailState.compose.subject || '(no subject)',
      body: mailState.compose.body || '',
      read: true,
      time: Date.now(),
    };
    state.mailbox.unshift(draft);
    mailState.composing = false;
    saveState();
    render();
    renderLauncher();
  }

  function sendMail() {
    const message = {
      id: uid('mail'),
      folder: 'sent',
      from: `${getCurrentProfile().name.toLowerCase().replace(/\s+/g, '.')}@chromeos-web.local`,
      to: mailState.compose.to || 'unknown@local',
      subject: mailState.compose.subject || '(no subject)',
      body: `${mailState.compose.body || ''}

${state.profileMeta.signature}`,
      read: true,
      time: Date.now(),
    };
    state.mailbox.unshift(message);
    mailState.composing = false;
    mailState.folder = 'sent';
    mailState.selectedId = message.id;
    saveState();
    sendNotification('Mail sent', message.subject, 'mail');
    render();
    renderWidgetRail();
    renderLauncher();
  }

  function renderDetail() {
    if (mailState.composing) {
      const composeState = mailState.compose || { to: '', subject: '', body: '' };
      return `
        <div class="mail-detail">
          <div class="setting-row"><h3>Compose</h3><button class="secondary-btn" data-action="cancel-compose">Cancel</button></div>
          <div class="compose-form">
            <label class="label-row"><span>To</span><input class="settings-input" data-compose-field="to" value="${escapeHtml(composeState.to)}" /></label>
            <label class="label-row"><span>Subject</span><input class="settings-input" data-compose-field="subject" value="${escapeHtml(composeState.subject)}" /></label>
            <label class="label-row"><span>Message</span><textarea class="form-control" data-compose-field="body">${escapeHtml(composeState.body)}</textarea></label>
            <div class="settings-actions">
              <button class="secondary-btn" data-action="save-draft">Save Draft</button>
              <button class="primary-btn" data-action="send-mail">Send</button>
            </div>
          </div>
        </div>
      `;
    }
    const mail = selectedMail();
    if (!mail) return '<div class="mail-detail"><div class="empty-state">No message selected.</div></div>';
    return `
      <div class="mail-detail">
        <div class="setting-row"><h3>${escapeHtml(mail.subject)}</h3><button class="secondary-btn" data-action="reply-mail">Reply</button></div>
        <div class="mail-meta">From ${escapeHtml(mail.from)} • To ${escapeHtml(mail.to)} • ${escapeHtml(formatDateTime(mail.time))}</div>
        <div class="mail-detail-body">${escapeHtml(mail.body)}</div>
      </div>
    `;
  }

  function render() {
    const list = visibleMail();
    if (!mailState.selectedId && list[0]) mailState.selectedId = list[0].id;
    setWindowTitle(win, 'Mail');
    root.innerHTML = `
      <div class="mail-app">
        <div class="mail-shell">
          <aside class="mail-sidebar">
            <button class="toolbar-btn" data-action="compose">Compose</button>
            ${['inbox', 'unread', 'sent', 'drafts'].map((folder) => `
              <button class="mail-folder ${mailState.folder === folder ? 'active' : ''}" data-folder="${folder}">
                <strong>${folder[0].toUpperCase() + folder.slice(1)}</strong>
                <span class="muted">${folderCount(folder)}</span>
              </button>
            `).join('')}
          </aside>
          <section class="mail-main">
            <div class="mail-header-row"><strong>${mailState.folder[0].toUpperCase() + mailState.folder.slice(1)}</strong></div>
            <div class="mail-list">
              ${list.length ? list.map((mail) => `
                <button class="mail-row ${mail.id === mailState.selectedId ? 'active' : ''} ${mail.read ? '' : 'unread'}" data-mail-id="${mail.id}">
                  <strong>${escapeHtml(mail.from)}</strong>
                  <div class="subject-line">${escapeHtml(mail.subject)}</div>
                  <div class="mail-meta">${escapeHtml(formatDateTime(mail.time))}</div>
                </button>
              `).join('') : '<div class="empty-state">This folder is empty.</div>'}
            </div>
          </section>
          ${renderDetail()}
        </div>
      </div>
    `;
  }

  root.addEventListener('click', (event) => {
    const folder = event.target.closest('[data-folder]')?.dataset.folder;
    if (folder) {
      mailState.folder = folder;
      mailState.selectedId = visibleMail()[0]?.id || null;
      mailState.composing = false;
      render();
      return;
    }
    const mailId = event.target.closest('[data-mail-id]')?.dataset.mailId;
    if (mailId) {
      openMail(mailId);
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'compose') compose();
    if (action === 'cancel-compose') { mailState.composing = false; render(); }
    if (action === 'save-draft') saveDraft();
    if (action === 'send-mail') sendMail();
    if (action === 'reply-mail') {
      const mail = selectedMail();
      if (mail) compose({ to: mail.from, subject: `Re: ${mail.subject}`, body: `

----
${mail.body}` });
    }
  });

  root.addEventListener('input', (event) => {
    const field = event.target.dataset.composeField;
    if (!field) return;
    if (!mailState.compose) mailState.compose = { to: '', subject: '', body: '' };
    mailState.compose[field] = event.target.value;
  });

  render();
  return {
    render,
    onReuse(nextOptions) {
      if (nextOptions?.mailId) {
        const mail = state.mailbox.find((item) => item.id === nextOptions.mailId);
        if (mail) {
          mailState.folder = mail.folder;
          mailState.selectedId = mail.id;
          mailState.composing = false;
        }
      }
      render();
    },
  };
}

function formatDurationClock(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value, index) => (index === 0 ? String(value).padStart(2, '0') : String(value).padStart(2, '0'))).join(':');
}

function mountClock(win, root) {
  const clockState = win.state.clock || {
    tab: 'clock',
    timerPresetMinutes: 5,
    timerEnd: null,
    timerDuration: 5 * 60 * 1000,
    stopwatchRunning: false,
    stopwatchStart: 0,
    stopwatchElapsed: 0,
    intervalId: null,
  };
  win.state.clock = clockState;

  function timerRemaining() {
    if (!clockState.timerEnd) return clockState.timerDuration;
    return Math.max(0, clockState.timerEnd - Date.now());
  }

  function syncLive() {
    const display = root.querySelector('[data-clock-display]');
    const dateLabel = root.querySelector('[data-clock-subtitle]');
    const ring = root.querySelector('.clock-ring');
    if (clockState.tab === 'clock' && display) {
      display.textContent = formatTime(new Date());
      if (dateLabel) dateLabel.textContent = formatDateLong(new Date());
    }
    if (clockState.tab === 'timer' && display) {
      const remaining = timerRemaining();
      display.textContent = formatDurationClock(remaining);
      if (dateLabel) dateLabel.textContent = clockState.timerEnd ? (remaining ? 'Timer running' : 'Time is up') : 'Set a timer';
      const progress = clockState.timerDuration ? ((clockState.timerDuration - remaining) / clockState.timerDuration) * 100 : 0;
      if (ring) ring.style.setProperty('--progress', `${Math.min(100, Math.max(0, progress))}%`);
      if (clockState.timerEnd && remaining <= 0) {
        clockState.timerEnd = null;
        sendNotification('Timer complete', 'Your countdown finished.', 'clock');
      }
    }
    if (clockState.tab === 'stopwatch' && display) {
      const elapsed = clockState.stopwatchElapsed + (clockState.stopwatchRunning ? Date.now() - clockState.stopwatchStart : 0);
      display.textContent = formatDurationClock(elapsed);
      if (dateLabel) dateLabel.textContent = clockState.stopwatchRunning ? 'Stopwatch running' : 'Stopwatch paused';
    }
  }

  function render() {
    setWindowTitle(win, 'Clock');
    const remaining = timerRemaining();
    root.innerHTML = `
      <div class="clock-app">
        <div class="clock-shell">
          <aside class="clock-sidebar">
            ${[['clock', 'Clock'], ['timer', 'Timer'], ['stopwatch', 'Stopwatch']].map(([key, label]) => `<button class="clock-segment ${clockState.tab === key ? 'active' : ''}" data-tab="${key}">${label}</button>`).join('')}
          </aside>
          <section class="clock-main">
            <div class="clock-card">
              ${clockState.tab === 'clock' ? `
                <div class="clock-display" data-clock-display>${escapeHtml(formatTime())}</div>
                <div class="clock-meta" data-clock-subtitle>${escapeHtml(formatDateLong())}</div>
                <div class="info-grid" style="margin-top:18px;">
                  <div class="info-card"><strong>Current profile</strong><p>${escapeHtml(getCurrentProfile().name)}</p></div>
                  <div class="info-card"><strong>Current desk</strong><p>${escapeHtml(currentDesk()?.name || 'Desk')}</p></div>
                  <div class="info-card"><strong>Shortcuts</strong><p>Use the timer for focus sessions and the stopwatch for quick tracking.</p></div>
                </div>
              ` : clockState.tab === 'timer' ? `
                <div class="clock-ring" style="--progress:${clockState.timerEnd ? ((clockState.timerDuration - remaining) / clockState.timerDuration) * 100 : 0}%"><div class="inner"></div></div>
                <div class="clock-display" data-clock-display>${escapeHtml(formatDurationClock(remaining))}</div>
                <div class="clock-meta" data-clock-subtitle>${clockState.timerEnd ? 'Timer running' : 'Set a timer'}</div>
                <div class="clock-controls">
                  <div class="setting-row">
                    <label class="label-row" style="flex:1"><span>Minutes</span><input class="settings-input" type="number" min="0" max="180" data-timer-minutes value="${Math.round(clockState.timerDuration / 60000)}" /></label>
                  </div>
                  <div class="settings-actions">
                    <button class="secondary-btn" data-action="start-timer">${clockState.timerEnd ? 'Restart' : 'Start'}</button>
                    <button class="secondary-btn" data-action="pause-timer">Pause</button>
                    <button class="secondary-btn" data-action="reset-timer">Reset</button>
                  </div>
                </div>
              ` : `
                <div class="clock-display" data-clock-display>${escapeHtml(formatDurationClock(clockState.stopwatchElapsed))}</div>
                <div class="clock-meta" data-clock-subtitle>${clockState.stopwatchRunning ? 'Stopwatch running' : 'Ready'}</div>
                <div class="settings-actions" style="margin-top:18px;">
                  <button class="secondary-btn" data-action="start-stopwatch">${clockState.stopwatchRunning ? 'Resume' : 'Start'}</button>
                  <button class="secondary-btn" data-action="pause-stopwatch">Pause</button>
                  <button class="secondary-btn" data-action="reset-stopwatch">Reset</button>
                </div>
              `}
            </div>
          </section>
        </div>
      </div>
    `;
    syncLive();
  }

  function ensureInterval() {
    clearInterval(clockState.intervalId);
    clockState.intervalId = setInterval(syncLive, 250);
  }

  root.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-tab]')?.dataset.tab;
    if (tab) {
      clockState.tab = tab;
      render();
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'start-timer') {
      const minutesInput = root.querySelector('[data-timer-minutes]');
      const minutes = Math.max(0, Number(minutesInput?.value || clockState.timerPresetMinutes || 5));
      clockState.timerPresetMinutes = minutes;
      clockState.timerDuration = minutes * 60 * 1000;
      clockState.timerEnd = Date.now() + clockState.timerDuration;
      render();
    }
    if (action === 'pause-timer') {
      clockState.timerDuration = timerRemaining();
      clockState.timerEnd = null;
      render();
    }
    if (action === 'reset-timer') {
      clockState.timerEnd = null;
      clockState.timerDuration = clockState.timerPresetMinutes * 60 * 1000;
      render();
    }
    if (action === 'start-stopwatch') {
      if (!clockState.stopwatchRunning) {
        clockState.stopwatchRunning = true;
        clockState.stopwatchStart = Date.now();
      }
      render();
    }
    if (action === 'pause-stopwatch') {
      if (clockState.stopwatchRunning) {
        clockState.stopwatchElapsed += Date.now() - clockState.stopwatchStart;
        clockState.stopwatchRunning = false;
      }
      render();
    }
    if (action === 'reset-stopwatch') {
      clockState.stopwatchRunning = false;
      clockState.stopwatchStart = 0;
      clockState.stopwatchElapsed = 0;
      render();
    }
  });

  root.addEventListener('input', (event) => {
    if (event.target.matches('[data-timer-minutes]')) {
      clockState.timerPresetMinutes = Math.max(0, Number(event.target.value || 0));
      if (!clockState.timerEnd) clockState.timerDuration = clockState.timerPresetMinutes * 60 * 1000;
      syncLive();
    }
  });

  ensureInterval();
  render();
  return {
    render,
    onClose() {
      clearInterval(clockState.intervalId);
    },
  };
}

function mountPaint(win, root) {
  const paintState = win.state.paint || {
    color: '#2563eb',
    size: 6,
    tool: 'brush',
    snapshot: '',
  };
  win.state.paint = paintState;

  function restoreCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    if (!canvas.width) {
      canvas.width = canvas.clientWidth || 1200;
      canvas.height = canvas.clientHeight || 720;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (paintState.snapshot) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = paintState.snapshot;
    }
  }

  function saveSnapshot(canvas) {
    paintState.snapshot = canvas.toDataURL('image/png');
  }

  function bindCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    restoreCanvas(canvas);
    let drawing = false;

    const position = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      return { x, y };
    };

    const start = (event) => {
      drawing = true;
      const { x, y } = position(event);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = paintState.size;
      ctx.strokeStyle = paintState.tool === 'eraser' ? '#ffffff' : paintState.color;
    };

    const draw = (event) => {
      if (!drawing) return;
      const { x, y } = position(event);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stop = () => {
      if (!drawing) return;
      drawing = false;
      saveSnapshot(canvas);
    };

    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointerleave', stop);
  }

  function saveImage() {
    const canvas = root.querySelector('canvas');
    if (!canvas) return;
    saveSnapshot(canvas);
    const filename = `/Pictures/Paint-${Date.now()}.png`;
    createFile(filename, paintState.snapshot, 'image/png');
    sendNotification('Painting saved', baseName(filename), 'paint');
    rerenderAppWindows('gallery');
    rerenderAppWindows('files');
    renderLauncher();
  }

  function render() {
    setWindowTitle(win, 'Canvas');
    root.innerHTML = `
      <div class="paint-app">
        <div class="paint-shell">
          <aside class="paint-sidebar">
            <h3>Canvas</h3>
            <div class="paint-controls">
              <button class="paint-tool ${paintState.tool === 'brush' ? 'active' : ''}" data-tool="brush">Brush</button>
              <button class="paint-tool ${paintState.tool === 'eraser' ? 'active' : ''}" data-tool="eraser">Eraser</button>
              <label class="label-row"><span>Color</span><input class="settings-input" type="color" data-paint-color value="${paintState.color}" /></label>
              <label class="label-row"><span>Brush size</span><input class="settings-input" type="range" min="1" max="24" data-paint-size value="${paintState.size}" /></label>
              <button class="secondary-btn" data-action="clear-canvas">Clear</button>
              <button class="primary-btn" data-action="save-canvas">Save to Pictures</button>
            </div>
          </aside>
          <section class="paint-main">
            <div class="paint-header-row"><strong>Draw, annotate, and save images locally</strong></div>
            <div class="paint-stage">
              <div class="paint-canvas-wrap"><canvas class="paint-canvas"></canvas></div>
            </div>
          </section>
        </div>
      </div>
    `;
    bindCanvas(root.querySelector('canvas'));
  }

  root.addEventListener('click', (event) => {
    const tool = event.target.closest('[data-tool]')?.dataset.tool;
    if (tool) {
      paintState.tool = tool;
      render();
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'clear-canvas') {
      paintState.snapshot = '';
      render();
    }
    if (action === 'save-canvas') saveImage();
  });

  root.addEventListener('input', (event) => {
    if (event.target.matches('[data-paint-color]')) paintState.color = event.target.value;
    if (event.target.matches('[data-paint-size]')) paintState.size = Number(event.target.value);
  });

  render();
  return {
    render,
    onReuse(nextOptions) {
      if (nextOptions?.tab) settingsState.tab = nextOptions.tab;
      render();
    },
  };
}

function mountMedia(win, root, options = {}) {
  const mediaState = win.state.mediaApp || {
    path: options.path || state.media.lastPath || '',
  };
  win.state.mediaApp = mediaState;

  function mediaFiles() {
    return state.files.filter((entry) => entry.kind === 'file' && ((entry.mime || '').startsWith('audio/') || (entry.mime || '').startsWith('video/')));
  }

  function selected() {
    return mediaFiles().find((entry) => entry.path === mediaState.path) || mediaFiles()[0] || null;
  }

  function renderPlayer(entry) {
    if (!entry) {
      return `
        <div class="media-player-panel">
          <h3>No media files yet</h3>
          <p class="muted">Import audio or video files through Files, then open them here.</p>
          <div class="settings-actions"><button class="secondary-btn" data-action="open-files">Open Files</button></div>
        </div>
      `;
    }
    return `
      <div class="media-player-panel">
        <h3>${escapeHtml(entry.name)}</h3>
        <div class="media-meta">${escapeHtml(entry.mime || 'media')} • ${escapeHtml(entry.path)}</div>
        <div class="media-player-stage">
          ${(entry.mime || '').startsWith('video/') ? `<video controls autoplay src="${entry.content}"></video>` : `<div class="media-art">♫</div>`}
        </div>
        ${(entry.mime || '').startsWith('audio/') ? `<audio controls autoplay src="${entry.content}" style="width:100%; margin-top:14px;"></audio>` : ''}
        <div class="media-controls">
          <button class="secondary-btn" data-action="download-current">Download</button>
          <button class="secondary-btn" data-action="open-files">Open Files</button>
        </div>
      </div>
    `;
  }

  function render() {
    const files = mediaFiles();
    const entry = selected();
    if (entry) {
      mediaState.path = entry.path;
      state.media.lastPath = entry.path;
      state.media.lastType = entry.mime || '';
      saveState();
    }
    setWindowTitle(win, 'Media');
    root.innerHTML = `
      <div class="media-app">
        <div class="media-shell">
          <aside class="media-sidebar">
            <button class="toolbar-btn" data-action="open-files">Import / Browse Files</button>
            <div class="info-card"><strong>${files.length}</strong><p>Audio and video files</p></div>
          </aside>
          <section class="media-main">
            <div class="media-header-row"><strong>Library</strong></div>
            <div class="media-library">
              ${files.length ? files.map((item) => `
                <button class="media-item ${item.path === mediaState.path ? 'active' : ''}" data-media-path="${item.path}">
                  <strong>${escapeHtml(item.name)}</strong>
                  <div class="media-meta">${escapeHtml(item.mime || 'media')}</div>
                </button>
              `).join('') : '<div class="empty-state">No media files available.</div>'}
            </div>
          </section>
          ${renderPlayer(entry)}
        </div>
      </div>
    `;
  }

  root.addEventListener('click', (event) => {
    const mediaPath = event.target.closest('[data-media-path]')?.dataset.mediaPath;
    if (mediaPath) {
      mediaState.path = mediaPath;
      render();
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'open-files') openApp('files', { path: '/Downloads' });
    if (action === 'download-current') {
      const entry = selected();
      if (entry) downloadFile(entry);
    }
  });

  render();
  return {
    render,
    onReuse(nextOptions) {
      if (nextOptions?.path) mediaState.path = nextOptions.path;
      render();
    },
  };
}

const APPS = {
  browser: {
    id: 'browser',
    title: 'Browser',
    description: 'Tabbed browser for local pages, file previews, and external links',
    glyph: '◎',
    iconClass: 'icon-browser',
    defaultSize: { width: 980, height: 700 },
    mount: mountBrowser,
  },
  files: {
    id: 'files',
    title: 'Files',
    description: 'Manage folders, previews, imports, and downloads',
    glyph: '▤',
    iconClass: 'icon-files',
    defaultSize: { width: 1040, height: 700 },
    mount: mountFiles,
  },
  text: {
    id: 'text',
    title: 'Text',
    description: 'Edit and save text files',
    glyph: '✎',
    iconClass: 'icon-text',
    defaultSize: { width: 920, height: 640 },
    mount: mountText,
  },
  notes: {
    id: 'notes',
    title: 'Notes',
    description: 'Sticky notes board with autosave',
    glyph: '✦',
    iconClass: 'icon-notes',
    defaultSize: { width: 900, height: 620 },
    mount: mountNotes,
  },
  calculator: {
    id: 'calculator',
    title: 'Calculator',
    description: 'Fast calculator with history',
    glyph: '±',
    iconClass: 'icon-calculator',
    defaultSize: { width: 760, height: 560 },
    mount: mountCalculator,
  },
  calendar: {
    id: 'calendar',
    title: 'Calendar',
    description: 'Monthly calendar with events',
    glyph: '31',
    iconClass: 'icon-calendar',
    defaultSize: { width: 1040, height: 700 },
    mount: mountCalendar,
  },
  camera: {
    id: 'camera',
    title: 'Camera',
    description: 'Live preview and snapshot capture',
    glyph: '◉',
    iconClass: 'icon-camera',
    defaultSize: { width: 980, height: 640 },
    mount: mountCamera,
  },
  gallery: {
    id: 'gallery',
    title: 'Gallery',
    description: 'View wallpapers and imported pictures',
    glyph: '▧',
    iconClass: 'icon-gallery',
    defaultSize: { width: 1000, height: 680 },
    mount: mountGallery,
  },
  terminal: {
    id: 'terminal',
    title: 'Terminal',
    description: 'Command-line shell for local actions',
    glyph: '>_',
    iconClass: 'icon-terminal',
    defaultSize: { width: 900, height: 560 },
    mount: mountTerminal,
  },
  tasks: {
    id: 'tasks',
    title: 'Tasks',
    description: 'Plan work, due dates, and priorities',
    glyph: '✓',
    iconClass: 'icon-tasks',
    defaultSize: { width: 980, height: 680 },
    mount: mountTasks,
  },
  mail: {
    id: 'mail',
    title: 'Mail',
    description: 'Local inbox, drafts, and compose window',
    glyph: '✉',
    iconClass: 'icon-mail',
    defaultSize: { width: 1160, height: 720 },
    mount: mountMail,
  },
  clock: {
    id: 'clock',
    title: 'Clock',
    description: 'World clock, timer, and stopwatch',
    glyph: '◴',
    iconClass: 'icon-clock',
    defaultSize: { width: 900, height: 620 },
    mount: mountClock,
  },
  paint: {
    id: 'paint',
    title: 'Canvas',
    description: 'Draw and save sketches locally',
    glyph: '🖌',
    iconClass: 'icon-paint',
    defaultSize: { width: 1100, height: 760 },
    mount: mountPaint,
  },
  media: {
    id: 'media',
    title: 'Media',
    description: 'Play imported audio and video files',
    glyph: '▶',
    iconClass: 'icon-media',
    defaultSize: { width: 1080, height: 720 },
    mount: mountMedia,
  },
  settings: {
    id: 'settings',
    title: 'Settings',
    description: 'Personalize the desktop and system behavior',
    glyph: '⚙',
    iconClass: 'icon-settings',
    defaultSize: { width: 980, height: 680 },
    singleInstance: true,
    mount: mountSettings,
  },
};

function setupEvents() {
  dom.desktopIcons.addEventListener('dblclick', (event) => {
    const appId = event.target.closest('[data-app]')?.dataset.app;
    if (appId) openApp(appId);
  });

  dom.desktopIcons.addEventListener('click', (event) => {
    const button = event.target.closest('[data-app]');
    if (!button) return;
    document.querySelectorAll('.desktop-shortcut').forEach((item) => item.style.background = 'rgba(255,255,255,0.08)');
    button.style.background = 'rgba(255,255,255,0.18)';
  });

  dom.launcherButton.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleLauncher();
  });

  dom.desksButton.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleOverview();
  });

  dom.profileButton.addEventListener('click', (event) => {
    event.stopPropagation();
    showLockScreen('signin');
  });

  dom.systemStatus.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleQuickSettings();
  });

  dom.notificationsButton.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleNotifications();
  });

  dom.launcherSearch.addEventListener('input', renderLauncher);
  dom.launcherSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const payload = JSON.parse(dom.launcherResults.dataset.serializedResults || '[]');
      executeLauncherResult(payload[0]);
    }
  });

  dom.launcher.addEventListener('click', (event) => {
    const appId = event.target.closest('[data-open-app]')?.dataset.openApp;
    if (appId) {
      openApp(appId);
      toggleLauncher(false);
      return;
    }
    const resultIndex = event.target.closest('[data-launch-result]')?.dataset.launchResult;
    if (resultIndex != null) {
      const payload = JSON.parse(dom.launcherResults.dataset.serializedResults || '[]');
      executeLauncherResult(payload[Number(resultIndex)]);
    }
  });

  dom.shelfApps.addEventListener('click', (event) => {
    const appId = event.target.closest('[data-app]')?.dataset.app;
    if (!appId) return;
    const wins = appWindowInstances(appId).filter((win) => win.deskId === state.currentDeskId);
    const visible = wins.find((win) => !win.minimized);
    if (visible && activeWindowId === visible.id) {
      minimizeWindow(visible);
      return;
    }
    if (wins.length) {
      focusWindow(wins[wins.length - 1]);
      wins[wins.length - 1].minimized = false;
      syncWindowVisibility(wins[wins.length - 1]);
      return;
    }
    openApp(appId);
  });

  dom.deskStrip.addEventListener('click', async (event) => {
    const deskId = event.target.closest('[data-desk-id]')?.dataset.deskId;
    if (deskId) {
      switchDesk(deskId);
      return;
    }
    const action = event.target.closest('[data-desk-action]')?.dataset.deskAction;
    if (action === 'add') await createDeskPrompt();
    if (action === 'rename') await renameCurrentDeskPrompt();
    if (action === 'remove') removeCurrentDesk();
  });

  dom.overviewLayer.addEventListener('click', async (event) => {
    if (event.target === dom.overviewLayer) {
      toggleOverview(false);
      return;
    }
    const deskId = event.target.closest('[data-overview-desk]')?.dataset.overviewDesk;
    if (deskId) {
      switchDesk(deskId);
      return;
    }
    const deskAction = event.target.closest('[data-overview-desk-action]')?.dataset.overviewDeskAction;
    if (deskAction === 'add') {
      await createDeskPrompt();
      return;
    }
    const closeWindowId = event.target.closest('[data-overview-close]')?.dataset.overviewClose;
    if (closeWindowId) {
      const win = windows.find((item) => item.id === closeWindowId);
      if (win) closeWindow(win);
      return;
    }
    const overviewWindowId = event.target.closest('[data-overview-window]')?.dataset.overviewWindow;
    if (overviewWindowId) {
      const win = windows.find((item) => item.id === overviewWindowId);
      if (win) {
        focusWindow(win);
        toggleOverview(false);
      }
    }
  });

  dom.widgetRail.addEventListener('click', (event) => {
    const action = event.target.closest('[data-widget-action]')?.dataset.widgetAction;
    if (action === 'open-calendar') openApp('calendar');
    if (action === 'open-settings') openApp('settings', { tab: 'desktop' });
    if (action === 'open-tasks') openApp('tasks');
    if (action === 'open-mail') openApp('mail');
    if (action === 'open-media') openApp('media');
    if (action === 'lock') lockSystem();
    if (action === 'cycle-desk') cycleDesk();
    const eventDate = event.target.closest('[data-widget-open-event]')?.dataset.widgetOpenEvent;
    if (eventDate) openApp('calendar', { date: eventDate });
    const mailId = event.target.closest('[data-widget-mail]')?.dataset.widgetMail;
    if (mailId) openApp('mail', { mailId });
  });

  dom.widgetRail.addEventListener('input', (event) => {
    const taskId = event.target.dataset.widgetTask;
    if (!taskId) return;
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;
    task.done = event.target.checked;
    saveState();
    renderWidgetRail();
    rerenderAppWindows('tasks');
  });

  dom.quickSettings.addEventListener('click', (event) => {
    const toggleKey = event.target.closest('[data-toggle]')?.dataset.toggle;
    if (toggleKey) {
      setSetting(toggleKey, !state.settings[toggleKey]);
      renderQuickSettings();
      sendNotification('Quick settings', `${toggleKey} ${state.settings[toggleKey] ? 'enabled' : 'disabled'}`, 'system', false);
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'open-settings') openApp('settings');
    if (action === 'lock-screen') lockSystem();
    if (action === 'open-calendar') openApp('calendar');
    if (action === 'open-media') openApp('media');
    if (action === 'toggle-overview') toggleOverview();
  });

  dom.quickSettings.addEventListener('input', (event) => {
    const slider = event.target.dataset.slider;
    if (!slider) return;
    setSetting(slider, Number(event.target.value));
    renderQuickSettings();
  });

  dom.notificationsPanel.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'clear-notifications') {
      state.notifications = [];
      saveState();
      renderNotificationsPanel();
    }
  });

  dom.contextMenu.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'open-launcher') toggleLauncher(true);
    if (action === 'new-note') openApp('notes');
    if (action === 'new-task') openApp('tasks');
    if (action === 'open-files') openApp('files');
    if (action === 'change-wallpaper') openApp('settings');
    if (action === 'switch-user') showLockScreen('signin');
    if (action === 'lock') lockSystem();
    dom.contextMenu.classList.add('hidden');
  });

  dom.lockScreen.addEventListener('click', async (event) => {
    const profileId = event.target.closest('[data-profile-select]')?.dataset.profileSelect;
    if (profileId) {
      session.selectedProfileId = profileId;
      session.error = '';
      renderLockScreen();
      return;
    }
    const action = event.target.closest('[data-lock-action]')?.dataset.lockAction;
    if (!action) return;
    if (action === 'submit') {
      attemptProfileUnlock(document.getElementById('profile-pin-input')?.value || '');
    }
    if (action === 'new-profile') await createProfilePrompt();
    if (action === 'guest') {
      const guest = store.profiles.find((profile) => profile.name.toLowerCase() === 'guest') || store.profiles[0];
      session.selectedProfileId = guest.id;
      attemptProfileUnlock(document.getElementById('profile-pin-input')?.value || '');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePanels();
      if (!dom.modalLayer.classList.contains('hidden')) closeModal(null);
      if (overviewOpen) toggleOverview(false);
    }
    if ((event.ctrlKey || event.metaKey) && event.code === 'Space') {
      event.preventDefault();
      toggleLauncher();
    }
    if (event.altKey && event.key === 'Tab') {
      event.preventDefault();
      cycleWindows();
    }
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      lockSystem();
    }
    if (!dom.lockScreen.classList.contains('hidden') && event.key === 'Enter') {
      attemptProfileUnlock(document.getElementById('profile-pin-input')?.value || '');
    }
  });

  document.addEventListener('pointerdown', (event) => {
    const clickedPanel = event.target.closest('.panel, .shelf, .window, .modal-card, .context-menu, .widget-rail, .desk-strip, .lock-auth-panel, .overview-shell, .overview-layer');
    if (!clickedPanel) closePanels();
  });

  document.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.window, .panel, input, textarea')) return;
    event.preventDefault();
    showContextMenu(event.clientX, event.clientY);
  });

  window.addEventListener('resize', () => {
    windows.forEach((win) => {
      if (!win.maximized) return;
      win.el.classList.add('maximized');
    });
  });
}

function cycleWindows() {
  const available = windows.filter((win) => !win.minimized && win.deskId === state.currentDeskId);
  if (!available.length) return;
  const index = available.findIndex((win) => win.id === activeWindowId);
  const next = available[(index + 1) % available.length] || available[0];
  focusWindow(next);
  showToast('Window switcher', next.title);
}

function init() {
  updateNetworkState();
  applySettings();
  renderNotificationsPanel();
  renderQuickSettings();
  renderLauncher();
  renderDeskStrip();
  renderWidgetRail();
  renderProfileButton();
  setupEvents();
  initializeBattery();
  startRuntimeStatsPolling();
  window.addEventListener('online', updateNetworkState);
  window.addEventListener('offline', updateNetworkState);
  navigator.connection?.addEventListener?.('change', updateNetworkState);
  updateClockLoop();
  setInterval(updateClockLoop, 1000);
  startBootSequence();
}

init();
