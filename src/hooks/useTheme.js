import { useContext } from 'react';

import { ThemeContext } from '../contexts/ThemeContext';

// Access the active theme: { colors, spacing, typography, radius, shadow,
// mode, resolvedScheme, setMode }. Must be used under <ThemeProvider>.
export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used within a ThemeProvider');
  return theme;
}

export default useTheme;
