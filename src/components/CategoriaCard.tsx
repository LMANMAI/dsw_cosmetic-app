import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Categoria } from '@/types/models';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';

/**
 * Card de categoría del home: foto grande (cargada desde el panel admin) con
 * el nombre debajo. Si la categoría todavía no tiene foto, se muestra el
 * emoji sobre un fondo suave, así nunca queda un hueco vacío.
 */
export function CategoriaCard({
  categoria,
  nombre,
  activa,
  ancho,
  onPress,
}: {
  categoria: Categoria;
  /** Nombre ya traducido. */
  nombre: string;
  activa?: boolean;
  /** Ancho calculado por la grilla del home. */
  ancho: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width: ancho }, pressed && { opacity: 0.9 }]}
    >
      <View style={[styles.foto, { height: ancho }, activa && styles.fotoActiva]}>
        {categoria.imagenUrl ? (
          <Image
            source={{ uri: categoria.imagenUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.emoji}>{categoria.emoji}</Text>
        )}
      </View>
      <Text style={[styles.nombre, activa && styles.nombreActivo]} numberOfLines={2}>
        {nombre}
      </Text>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: { gap: spacing.sm },
  /** La foto es un cuadrado que ocupa todo el ancho de la celda: sin marco
   *  alrededor, para que no se vea "una caja dentro de otra". */
  foto: {
    width: '100%',
    borderRadius: radius.xl,
    backgroundColor: c.bone2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoActiva: { borderWidth: 2, borderColor: c.primary },
  emoji: { fontSize: 32 },
  nombre: {
    fontSize: 12,
    fontWeight: '600',
    color: c.ink,
    textAlign: 'center',
    lineHeight: 15,
    // Dos líneas fijas para que las celdas de la grilla queden alineadas
    // aunque unos nombres sean más largos que otros.
    minHeight: 30,
  },
  nombreActivo: { color: c.primary },
});
