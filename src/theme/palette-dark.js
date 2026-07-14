// Dark theme palette (night). Tonal variants — not inverted light colors.
// Deep blue-black base is easier on the eyes for an alarm app used at night / dawn.
// Keep token keys identical to palette-light.js.
const paletteDark = {
  // Surfaces
  background: '#0E0F1A', // deep night, not pure black
  surface: '#181A29', // primary card / sheet
  surfaceAlt: '#21243A', // elevated card, input background
  // Brand
  primary: '#7C80FF', // lighter indigo for sufficient contrast on dark
  primaryPressed: '#6A6EF0',
  primaryMuted: '#262A47', // subtle tinted background (badges, selected chips)
  onPrimary: '#0E0F1A', // dark text on the light indigo primary (verified readable)
  // Text
  textPrimary: '#F2F3F9', // >=4.5:1 on dark surfaces
  textSecondary: '#A9AEC4', // >=4.5:1 on background
  textTertiary: '#7E8399', // meta, hints (>=3:1)
  // Lines
  border: '#2C2F48', // visible dividers in dark (dark leans on borders over shadow)
  // Semantic status (brightened for dark backgrounds)
  danger: '#F87171',
  success: '#4ADE80',
  info: '#60A5FA',
  warning: '#FB923C',
  premium: '#FBBF24',
  // Overlays
  overlay: 'rgba(0,0,0,0.66)', // stronger scrim over dark UI
  // Legacy alias
  white: '#FFFFFF',
};

export default paletteDark;
