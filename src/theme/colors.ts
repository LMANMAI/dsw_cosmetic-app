/**
 * BeautyApp — Paleta de marca
 * Basada en el sistema visual de la presentación de validación.
 */
export const colors = {
  // Rosa de marca
  rose: '#B84968',
  roseLight: '#D47A93',
  roseDark: '#7D2D47',
  roseTint: 'rgba(184, 73, 104, 0.08)',

  // Neutros oscuros
  ink: '#1C1812',
  navy: '#0F1724',
  navyAlt: '#1A2540',

  // Neutros claros
  bone: '#F9F5F2',
  bone2: '#EEE8E3',
  bone3: '#DDD4CB',
  white: '#FFFFFF',

  // Texto
  muted: '#8A7A73',
  mutedDark: 'rgba(255, 255, 255, 0.5)',

  // Estados
  success: '#3BA174',
  warning: '#E0A458',
  danger: '#C94B4B',
  info: '#3F7CAC',

  // Utilitarios
  border: '#EEE8E3',
  borderDark: 'rgba(255, 255, 255, 0.07)',
  overlay: 'rgba(15, 23, 36, 0.55)',
} as const;

export type ColorKey = keyof typeof colors;
