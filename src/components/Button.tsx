import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

function buildVariants(c: ThemeColors): Record<Variant, { container: ViewStyle; label: { color: string } }> {
  return {
    primary: {
      container: { backgroundColor: c.primary },
      label: { color: c.white },
    },
    secondary: {
      container: {
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.bone3,
      },
      label: { color: c.ink },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      label: { color: c.primary },
    },
    dark: {
      container: { backgroundColor: c.navy },
      label: { color: '#F3F4F6' },
    },
  };
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  fullWidth,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const variantStyles = useMemo(() => buildVariants(colors), [colors]);

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant].container,
        fullWidth && { alignSelf: 'stretch' as const },
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.4 },
        style,
      ]}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].label.color} />
      ) : (
        <Text style={[styles.label, variantStyles[variant].label]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
