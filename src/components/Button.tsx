import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from '@/theme';

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

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  fullWidth,
  style,
}: ButtonProps) {
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant].container,
        fullWidth && { alignSelf: 'stretch' },
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

const variantStyles: Record<Variant, { container: ViewStyle; label: { color: string } }> = {
  primary: {
    container: { backgroundColor: colors.rose },
    label: { color: colors.white },
  },
  secondary: {
    container: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.bone3,
    },
    label: { color: colors.ink },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    label: { color: colors.rose },
  },
  dark: {
    container: { backgroundColor: colors.navy },
    label: { color: colors.white },
  },
};
