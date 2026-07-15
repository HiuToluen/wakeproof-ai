import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getPalette, spacing, typography, radius, shadow } from '../theme';

// Persisted user preference: 'system' follows the OS, 'light'/'dark' override it.
export const THEME_MODES = { SYSTEM: 'system', LIGHT: 'light', DARK: 'dark' };
const STORAGE_KEY = '@wakeproof/theme-mode';
const THEME_MODE_VALUES = new Set(Object.values(THEME_MODES));

export const ThemeContext = createContext(null);

function resolveScheme(mode, systemScheme) {
  if (mode === THEME_MODES.LIGHT) return 'light';
  if (mode === THEME_MODES.DARK) return 'dark';
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(THEME_MODES.SYSTEM);
  const [systemScheme, setSystemScheme] = useState(Appearance.getColorScheme() || 'light');
  const hydrated = useRef(false);

  // Load saved preference once on mount.
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (active && saved && THEME_MODE_VALUES.has(saved)) setModeState(saved);
      })
      .catch(() => {})
      .finally(() => { hydrated.current = true; });
    return () => { active = false; };
  }, []);

  // Track OS scheme changes (only affects UI while mode === 'system').
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme || 'light');
    });
    return () => subscription.remove();
  }, []);

  const setMode = useCallback((nextMode) => {
    setModeState(nextMode);
    AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => {});
  }, []);

  const resolvedScheme = resolveScheme(mode, systemScheme);

  const value = useMemo(() => ({
    mode,
    setMode,
    resolvedScheme,
    colors: getPalette(resolvedScheme),
    spacing,
    typography,
    radius,
    shadow: (level) => shadow(resolvedScheme, level),
  }), [mode, setMode, resolvedScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
