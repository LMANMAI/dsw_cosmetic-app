import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useTheme, radius, spacing, shadow } from '@/theme';

export function Card({ style, children, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    ...shadow.card,
  },
});
