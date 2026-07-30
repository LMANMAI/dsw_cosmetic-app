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
 * Pantalla de retorno del checkout de la tarifa de servicio (deep link
 * beautyapp://comision-pago?status=...). La confirmación real la hace el
 * webhook; acá solo mostramos el resultado del checkout y volvemos a la caja.
 */
export default function ComisionPagoScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string; collection_status?: string }>();
  const raw = params.collection_status ?? params.status ?? '';
  const estado =
    raw === 'approved' ? 'approved' : raw === 'pending' || raw === 'in_process' ? 'pending' : 'otro';
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const icono =
    estado === 'approved' ? 'checkmark-circle' : estado === 'pending' ? 'time' : 'close-circle';
  const color =
    estado === 'approved' ? colors.success : estado === 'pending' ? colors.warning : colors.danger;
  const titulo =
    estado === 'approved'
      ? t('pagos.comision.pagadaTitulo')
      : estado === 'pending'
        ? t('pagos.comision.pendienteTitulo')
        : t('pagos.comision.noCompletadoTitulo');
  const sub =
    estado === 'approved'
      ? t('pagos.comision.pagadaSub')
      : estado === 'pending'
        ? t('pagos.comision.pendienteSub')
        : t('pagos.comision.noCompletadoSub');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { borderColor: color }]}>
          <Ionicons name={icono} size={76} color={color} />
        </View>

        <Text style={styles.title}>{titulo}</Text>
        <Text style={styles.sub}>{sub}</Text>

        <Button
          label={t('pagos.comision.volverCaja')}
          onPress={() => router.replace('/(profesional)/caja')}
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
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
    },
    iconWrap: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      backgroundColor: c.surface,
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: c.ink,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    sub: {
      fontSize: 15,
      lineHeight: 22,
      color: c.muted,
      textAlign: 'center',
    },
  });
