import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

interface AvatarProps {
  nombre: string;
  size?: number;
}

export function Avatar({ nombre, size = 48 }: AvatarProps) {
  const initials = nombre
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.roseTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.rose,
    fontWeight: '700',
  },
});
