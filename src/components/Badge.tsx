import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'rose';

interface BadgeProps {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
}

const tones: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: 'rgba(59, 161, 116, 0.15)', fg: colors.success },
  warning: { bg: 'rgba(224, 164, 88, 0.18)', fg: colors.warning },
  danger: { bg: 'rgba(201, 75, 75, 0.15)', fg: colors.danger },
  info: { bg: 'rgba(63, 124, 172, 0.15)', fg: colors.info },
  neutral: { bg: colors.bone2, fg: colors.muted },
  rose: { bg: colors.roseTint, fg: colors.rose },
};

export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
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
