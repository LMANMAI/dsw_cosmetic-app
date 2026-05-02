/**
 * Sistema tipográfico — DM Sans
 * Si no hay fuentes cargadas, RN cae al system font.
 */
export const typography = {
  family: {
    regular: 'DMSans_400Regular',
    medium: 'DMSans_500Medium',
    semibold: 'DMSans_600SemiBold',
    bold: 'DMSans_700Bold',
  },
  size: {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    display: 32,
    hero: 40,
  },
  weight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  letterSpacing: {
    tight: -0.4,
    normal: 0,
    wide: 1.2,
  },
};
