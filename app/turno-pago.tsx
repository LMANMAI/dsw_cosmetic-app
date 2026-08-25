import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { useTranslation } from '@/i18n';
import { useTheme, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';

/**
 * Retorno del checkout de la SEÑA (deep link beautyapp://turno-pago).
 * Mercado Pago agrega ?status / ?collection_status con el resultado.
 * La confirmación real la hace el webhook; acá solo mostramos el estado y
 * mandamos al cliente a "Mis turnos".
 */
export default function TurnoPagoScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string; collection_status?: string }>();
  const estado = params.collection_status ?? params.status ?? '';
  const aprobado = estado === 'approved';
  const pendiente = estado === 'pending' || estado === 'in_process';
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const icon = aprobado ? 'checkmark-circle' : pendiente ? 'time' : 'close-circle';
  const color = aprobado ? colors.success : pendiente ? colors.warning : colors.danger;
  const title = aprobado
    ? t('pagos.turno.acreditadaTitulo')
    : pendiente
    ? t('pagos.turno.pendienteTitulo')
    : t('pagos.turno.noCompletadoTitulo');
  const sub = aprobado
    ? t('pagos.turno.acreditadaSub')
    : pendiente
    ? t('pagos.turno.pendienteSub')
    : t('pagos.turno.noCompletadoSub');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Ionicons name={icon} size={84} color={color} style={{ marginBottom: spacing.lg }} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{sub}</Text>
        <Button
          label={t('pagos.turno.verMisTurnos')}
          onPress={() => router.replace('/(cliente)/(tabs)/turnos')}
          fullWidth
          style={{ marginTop: spacing.xxl }}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
    title: { fontSize: 23, fontWeight: '800', color: c.ink, textAlign: 'center', marginBottom: spacing.sm },
    sub: { fontSize: 15, lineHeight: 22, color: c.muted, textAlign: 'center' },
  });
