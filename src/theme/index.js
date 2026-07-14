import paletteLight from './palette-light';
import paletteDark from './palette-dark';
import spacing from './spacing';
import typography from './typography';
import radius from './radius';

// Returns the color palette for a given color scheme ('light' | 'dark').
export function getPalette(scheme) {
  return scheme === 'dark' ? paletteDark : paletteLight;
}

// Elevation helper: light mode uses tinted drop shadows; dark mode leans on a
// visible border + a faint shadow (drop shadows read poorly on dark surfaces).
export function shadow(scheme, level = 'md') {
  if (scheme === 'dark') {
    return {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: level === 'lg' ? 8 : 4 },
      shadowOpacity: 0.35,
      shadowRadius: level === 'lg' ? 16 : 10,
      elevation: level === 'lg' ? 8 : 4,
    };
  }
  return {
    shadowColor: '#14161F',
    shadowOffset: { width: 0, height: level === 'lg' ? 8 : 4 },
    shadowOpacity: level === 'lg' ? 0.12 : 0.08,
    shadowRadius: level === 'lg' ? 16 : 10,
    elevation: level === 'lg' ? 6 : 3,
  };
}

// Static exports for spacing / typography / radius (scheme-independent tokens).
export { spacing, typography, radius, paletteLight, paletteDark };
