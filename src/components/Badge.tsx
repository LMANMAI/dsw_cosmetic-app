import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
}

function buildTones(c: ThemeColors): Record<Tone, { bg: string; fg: string }> {
  return {
    success: { bg: 'rgba(59, 161, 116, 0.15)', fg: c.success },
    warning: { bg: 'rgba(224, 164, 88, 0.18)', fg: c.warning },
    danger: { bg: 'rgba(201, 75, 75, 0.15)', fg: c.danger },
    info: { bg: 'rgba(63, 124, 172, 0.15)', fg: c.info },
    neutral: { bg: c.surfaceAlt, fg: c.muted },
    primary: { bg: c.primaryTint, fg: c.primary },
  };
}

export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  const { colors } = useTheme();
  const tones = useMemo(() => buildTones(colors), [colors]);
  const palette = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, style]}>
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
