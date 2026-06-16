import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { useTheme, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';

/**
 * Retorno del checkout de un PEDIDO de insumos (deep link
 * beautyapp://pedido-pago). La confirmación real la hace el webhook; acá
 * mostramos el estado y mandamos a "Mis pedidos".
 */
export default function PedidoPagoScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string; collection_status?: string }>();
  const estado = params.collection_status ?? params.status ?? '';
  const aprobado = estado === 'approved';
  const pendiente = estado === 'pending' || estado === 'in_process';
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const icon = aprobado ? 'checkmark-circle' : pendiente ? 'time' : 'close-circle';
  const color = aprobado ? colors.success : pendiente ? colors.warning : colors.danger;
  const title = aprobado ? '¡Pago confirmado!' : pendiente ? 'Pago pendiente' : 'Pago no completado';
  const sub = aprobado
    ? 'Tu compra fue registrada. Seguí el estado en "Mis pedidos".'
    : pendiente
    ? 'Tu pago quedó pendiente de acreditación. Cuando se confirme, el pedido se procesa.'
    : 'No se completó el pago. Podés volver a intentarlo desde la tienda.';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Ionicons name={icon} size={84} color={color} style={{ marginBottom: spacing.lg }} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{sub}</Text>
        <Button
          label="Ver mis pedidos"
          onPress={() => router.replace('/(profesional)/mis-pedidos')}
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
