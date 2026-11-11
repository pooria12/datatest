export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Reads the saved preference. Storage can throw (privacy modes), so it is always guarded. */
export function getThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // Storage unavailable: fall back to the system preference.
  }
  return 'system';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
  }
  return preference;
}

/** Applies the theme by toggling the `dark` class on <html>. */
export function applyTheme(preference: ThemePreference): void {
  document.documentElement.classList.toggle('dark', resolveTheme(preference) === 'dark');
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // The theme still applies for this session even if it cannot be saved.
  }
  applyTheme(preference);
  notify();
}

/** Snapshot string for useSyncExternalStore: "<preference>|<resolved>". */
export function getThemeSnapshot(): string {
  const preference = getThemePreference();
  return `${preference}|${resolveTheme(preference)}`;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);

  const mediaQuery = window.matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    if (getThemePreference() === 'system') {
      applyTheme('system');
      listener();
    }
  };
  mediaQuery.addEventListener('change', onSystemChange);

  return () => {
    listeners.delete(listener);
    mediaQuery.removeEventListener('change', onSystemChange);
  };
}
