import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';

interface ServiciosStatusBannerProps {
  /** Acción al tocar el banner (navegar a la pantalla de servicios). */
  onPress: () => void;
  /** Margen superior opcional (por defecto usa spacing.xl como MpStatusBanner). */
  style?: object;
}

/**
 * Banner de advertencia: el profesional no tiene servicios cargados y por lo
 * tanto no puede recibir turnos. Accionable: al tocarlo lleva a "Servicios".
 * Renderizarlo solo cuando la cantidad de servicios sea 0.
 */
export function ServiciosStatusBanner({ onPress, style }: ServiciosStatusBannerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const color = colors.warning;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.box, { backgroundColor: color + '1A', borderColor: color }, style]}
    >
      <Ionicons name="alert-circle" size={22} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.titulo, { color: colors.ink }]}>
          {t('perfil.profesional.sinServiciosBannerTitulo')}
        </Text>
        <Text style={[styles.mensaje, { color: colors.muted }]}>
          {t('perfil.profesional.sinServiciosBannerMsg')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={color} />
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    box: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.lg,
      marginTop: spacing.xl,
    },
    titulo: { fontSize: 14, fontWeight: '700' },
    mensaje: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  });
