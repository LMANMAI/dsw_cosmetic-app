/**
 * YOFI — Paleta de marca (violeta índigo)
 * Sistema de temas con soporte light / dark.
 */

/* ─── Paleta base ─── */
const palette = {
  // Índigo de marca
  indigo50: '#EEF2FF',
  indigo100: '#E0E7FF',
  indigo200: '#C7D2FE',
  indigo300: '#A5B4FC',
  indigo400: '#818CF8',
  indigo500: '#6366F1',
  indigo600: '#4F46E5',
  indigo700: '#4338CA',
  indigo800: '#3730A3',
  indigo900: '#312E81',

  // Neutros cálidos (se mantienen)
  bone: '#F9F5F2',
  bone2: '#EEE8E3',
  bone3: '#DDD4CB',
  white: '#FFFFFF',
  ink: '#1C1812',

  // Neutros oscuros
  navy: '#0F1724',
  navyAlt: '#1A2540',
  gray800: '#1F2937',
  gray700: '#374151',
  gray600: '#4B5563',
  gray400: '#9CA3AF',
  gray300: '#D1D5DB',

  // Estados
  success: '#3BA174',
  warning: '#E0A458',
  danger: '#C94B4B',
  info: '#3F7CAC',
} as const;

/* ─── Tipo semántico de colores ─── */
export interface ThemeColors {
  // Marca
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryTint: string;

  // Neutros oscuros
  ink: string;
  navy: string;
  navyAlt: string;

  // Neutros claros / fondos
  bone: string;
  bone2: string;
  bone3: string;
  white: string;

  // Texto
  muted: string;
  mutedDark: string;

  // Estados
  success: string;
  warning: string;
  danger: string;
  info: string;

  // Utilitarios
  border: string;
  borderDark: string;
  overlay: string;

  // Superficies (para dark mode)
  background: string;
  surface: string;
  surfaceAlt: string;
}

/* ─── Tema claro ─── */
export const lightColors: ThemeColors = {
  primary: palette.indigo500,       // #6366F1
  primaryLight: palette.indigo300,  // #A5B4FC
  primaryDark: palette.indigo700,   // #4338CA
  primaryTint: 'rgba(99, 102, 241, 0.08)',

  ink: palette.ink,
  navy: palette.navy,
  navyAlt: palette.navyAlt,

  bone: palette.bone,
  bone2: palette.bone2,
  bone3: palette.bone3,
  white: palette.white,

  muted: '#8A7A73',
  mutedDark: 'rgba(255, 255, 255, 0.5)',

  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  info: palette.info,

  border: palette.bone2,
  borderDark: 'rgba(255, 255, 255, 0.07)',
  overlay: 'rgba(15, 23, 36, 0.55)',

  background: palette.bone,
  surface: palette.white,
  surfaceAlt: palette.bone2,
};

/* ─── Tema oscuro ─── */
export const darkColors: ThemeColors = {
  primary: palette.indigo400,       // #818CF8 (más claro para contraste)
  primaryLight: palette.indigo300,  // #A5B4FC
  primaryDark: palette.indigo600,   // #4F46E5
  primaryTint: 'rgba(129, 140, 248, 0.12)',

  ink: '#F3F4F6',
  navy: palette.navy,
  navyAlt: palette.navyAlt,

  bone: '#1A1A2E',
  bone2: '#25253D',
  bone3: '#35355A',
  white: '#0F0F1A',

  muted: palette.gray400,
  mutedDark: 'rgba(255, 255, 255, 0.5)',

  success: '#4ADE80',
  warning: '#FCD34D',
  danger: '#F87171',
  info: '#60A5FA',

  border: '#25253D',
  borderDark: 'rgba(255, 255, 255, 0.12)',
  overlay: 'rgba(0, 0, 0, 0.65)',

  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceAlt: '#25253D',
};

/* ─── Compat: export estático para migración gradual ─── */
export const colors = {
  rose: lightColors.primary,
  roseLight: lightColors.primaryLight,
  roseDark: lightColors.primaryDark,
  roseTint: lightColors.primaryTint,
  ink: lightColors.ink,
  navy: lightColors.navy,
  navyAlt: lightColors.navyAlt,
  bone: lightColors.bone,
  bone2: lightColors.bone2,
  bone3: lightColors.bone3,
  white: lightColors.white,
  muted: lightColors.muted,
  mutedDark: lightColors.mutedDark,
  success: lightColors.success,
  warning: lightColors.warning,
  danger: lightColors.danger,
  info: lightColors.info,
  border: lightColors.border,
  borderDark: lightColors.borderDark,
  overlay: lightColors.overlay,
} as const;

export type ColorKey = keyof typeof colors;
