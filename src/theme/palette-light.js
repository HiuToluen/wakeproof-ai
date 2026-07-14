// Light theme palette. All UI color decisions reference these semantic tokens.
// Paired with palette-dark.js — keep token keys identical across both.
const paletteLight = {
  // Surfaces
  background: '#F4F5FB', // app background (soft blue-gray)
  surface: '#FFFFFF', // primary card / sheet
  surfaceAlt: '#EEF0F8', // secondary card, input background
  // Brand
  primary: '#5457E6', // indigo accent
  primaryPressed: '#4346C4', // pressed state of primary surfaces
  primaryMuted: '#E4E5FB', // subtle tinted background (badges, selected chips)
  onPrimary: '#FFFFFF', // text/icon on top of primary
  // Text
  textPrimary: '#14161F', // headings, body (>=4.5:1 on surfaces)
  textSecondary: '#5A6072', // supporting text
  textTertiary: '#8B90A0', // meta, hints, disabled labels
  // Lines
  border: '#E2E4EE',
  // Semantic status
  danger: '#DC2626',
  success: '#16A34A',
  info: '#3B82F6',
  warning: '#F97316',
  premium: '#F59E0B',
  // Overlays
  overlay: 'rgba(20,22,31,0.55)', // modal / sheet scrim
  // Legacy alias (kept so pre-refactor imports of `white` do not break)
  white: '#FFFFFF',
};

export default paletteLight;
