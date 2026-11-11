import { useCallback, useSyncExternalStore } from 'react';
import {
  getThemePreference,
  getThemeSnapshot,
  resolveTheme,
  setThemePreference,
  subscribeTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@lib/theme';

export function useTheme() {
  const snapshot = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeSnapshot);
  const [preference, resolvedTheme] = snapshot.split('|') as [ThemePreference, ResolvedTheme];

  const toggleTheme = useCallback(() => {
    const next: ThemePreference = resolveTheme(getThemePreference()) === 'dark' ? 'light' : 'dark';
    setThemePreference(next);
  }, []);

  return { preference, resolvedTheme, setTheme: setThemePreference, toggleTheme };
}
