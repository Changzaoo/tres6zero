export type OperatorPreferences = {
  defaultDuration: 5 | 15 | 25 | 35 | 45;
  defaultMusicTheme: 'none' | 'ambient' | 'party' | 'luxury' | 'wedding' | 'corporate';
};

const OPERATOR_PREFS_KEY = 'six3.operatorPreferences';
const allowedDurations = [5, 15, 25, 35, 45] as const;
const allowedMusicThemes = ['none', 'ambient', 'party', 'luxury', 'wedding', 'corporate'] as const;

export const defaultOperatorPreferences: OperatorPreferences = {
  defaultDuration: 15,
  defaultMusicTheme: 'none',
};

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getOperatorPreferences(): OperatorPreferences {
  if (!isBrowser()) return defaultOperatorPreferences;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(OPERATOR_PREFS_KEY) || '{}') as Partial<OperatorPreferences>;
    return {
      defaultDuration: allowedDurations.includes(parsed.defaultDuration as OperatorPreferences['defaultDuration'])
        ? parsed.defaultDuration as OperatorPreferences['defaultDuration']
        : defaultOperatorPreferences.defaultDuration,
      defaultMusicTheme: allowedMusicThemes.includes(parsed.defaultMusicTheme as OperatorPreferences['defaultMusicTheme'])
        ? parsed.defaultMusicTheme as OperatorPreferences['defaultMusicTheme']
        : defaultOperatorPreferences.defaultMusicTheme,
    };
  } catch {
    return defaultOperatorPreferences;
  }
}

export function setOperatorPreferences(preferences: OperatorPreferences) {
  if (!isBrowser()) return;
  window.localStorage.setItem(OPERATOR_PREFS_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent('six3-operator-preferences-change', { detail: preferences }));
}
