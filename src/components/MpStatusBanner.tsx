import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';

interface MpStatusBannerProps {
  /** true si la cuenta de Mercado Pago ya está vinculada. */
  conectado: boolean;
  /** Acción para iniciar la vinculación (solo se usa cuando NO está conectada). */
  onConnect?: () => void;
}

/**
 * Banner de estado de la cuenta de Mercado Pago.
 * - Conectada  → verde, informativo (no accionable).
 * - Pendiente  → amarillo, accionable: al tocarlo dispara la vinculación.
 */
export function MpStatusBanner({ conectado, onConnect }: MpStatusBannerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const color = conectado ? colors.success : colors.warning;
  const icon = conectado ? 'checkmark-circle' : 'alert-circle';
  const titulo = conectado
    ? t('perfil.compartido.mpBannerConectadoTitulo')
    : t('perfil.compartido.mpBannerPendienteTitulo');
  const mensaje = conectado
    ? t('perfil.compartido.mpBannerConectadoMsg')
    : t('perfil.compartido.mpBannerPendienteMsg');

  return (
    <Pressable
      onPress={conectado ? undefined : onConnect}
      disabled={conectado}
      style={[styles.box, { backgroundColor: color + '1A', borderColor: color }]}
    >
      <Ionicons name={icon} size={22} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.titulo, { color: colors.ink }]}>{titulo}</Text>
        <Text style={[styles.mensaje, { color: colors.muted }]}>{mensaje}</Text>
      </View>
      {!conectado ? <Ionicons name="chevron-forward" size={18} color={color} /> : null}
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
