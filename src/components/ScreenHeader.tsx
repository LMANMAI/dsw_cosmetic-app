import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme';

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  variant?: 'light' | 'dark';
  right?: React.ReactNode;
}

export function ScreenHeader({ eyebrow, title, subtitle, variant = 'light', right }: ScreenHeaderProps) {
  const isDark = variant === 'dark';
  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: isDark ? colors.roseLight : colors.rose }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={[styles.title, { color: isDark ? colors.white : colors.ink }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: isDark ? colors.mutedDark : colors.muted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '300',
    lineHeight: 22,
    marginTop: 6,
  },
});
