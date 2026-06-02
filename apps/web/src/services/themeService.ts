export type ThemeMode = 'dark' | 'light' | 'system';

const THEME_KEY = 'six3.themeMode';
const modes: ThemeMode[] = ['dark', 'light', 'system'];

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function systemPrefersDark() {
  return !isBrowser() || window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getStoredThemeMode(): ThemeMode {
  if (!isBrowser()) return 'dark';
  const stored = window.localStorage.getItem(THEME_KEY);
  return modes.includes(stored as ThemeMode) ? stored as ThemeMode : 'dark';
}

export function resolveThemeMode(mode: ThemeMode) {
  return mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode;
}

export function applyThemeMode(mode = getStoredThemeMode()) {
  if (!isBrowser()) return;
  const resolved = resolveThemeMode(mode);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themeMode = mode;
  root.classList.toggle('dark', resolved === 'dark');
  root.classList.toggle('light', resolved === 'light');

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = resolved === 'dark' ? '#08090c' : '#f5f7fb';
}

export function setThemeMode(mode: ThemeMode) {
  if (!isBrowser()) return;
  window.localStorage.setItem(THEME_KEY, mode);
  applyThemeMode(mode);
  window.dispatchEvent(new CustomEvent('six3-theme-change', { detail: mode }));
}

export function startThemeWatcher() {
  if (!isBrowser()) return;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = () => {
    if (getStoredThemeMode() === 'system') applyThemeMode('system');
  };
  media.addEventListener?.('change', listener);
}
