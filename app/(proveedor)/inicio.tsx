import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { pedidosService } from '@/services';
import { useTranslation, type TranslateFn } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import { formatARS } from '@/utils/format';
import { ESTADO_PEDIDO, ESTADOS_ABIERTOS, type EstadoTone } from '@/utils/pedidos';
import type { Pedido } from '@/types/models';

export default function ProveedorInicioScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useSession();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const proveedorId = user?.id ?? '';

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    if (!proveedorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await pedidosService.pedidosDelProveedor(proveedorId);
      setPedidos(list);
    } finally {
      setLoading(false);
    }
  }, [proveedorId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const resumen = useMemo(() => {
    const pendientes = pedidos.filter((p) => p.estado === 'pendiente').length;
    const enCurso = pedidos.filter(
      (p) => p.estado === 'confirmado' || p.estado === 'enviado',
    ).length;
    const entregados = pedidos.filter((p) => p.estado === 'entregado').length;
    const aCobrar = pedidos
      .filter((p) => ESTADOS_ABIERTOS.includes(p.estado))
      .reduce((acc, p) => acc + p.total, 0);
    return { pendientes, enCurso, entregados, aCobrar };
  }, [pedidos]);

  const ultimos = pedidos.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xxl, paddingBottom: spacing.huge }}>
        <ScreenHeader eyebrow={t('proveedor.inicio.eyebrow')} title={t('proveedor.inicio.hola', { nombre: user?.nombre ?? '' })} />

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.huge }} />
        ) : pedidos.length === 0 ? (
          <>
            <View style={styles.heroCard}>
              <View style={styles.iconWrap}>
                <Ionicons name="receipt-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.heroTitle}>{t('proveedor.inicio.sinPedidosTitulo')}</Text>
              <Text style={styles.heroBody}>{t('proveedor.inicio.sinPedidosMsg')}</Text>
              <Pressable
                style={styles.heroBtn}
                onPress={() => router.navigate('/(proveedor)/productos')}
              >
                <Ionicons name="cube-outline" size={16} color={colors.white} />
                <Text style={styles.heroBtnText}>{t('proveedor.inicio.cargarProductos')}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {/* A cobrar */}
            <View style={styles.cobrarCard}>
              <Text style={styles.cobrarLabel}>{t('proveedor.inicio.aCobrar')}</Text>
              <Text style={styles.cobrarValue}>{formatARS(resumen.aCobrar)}</Text>
            </View>

            {/* Contadores por estado */}
            <View style={styles.statsRow}>
              <StatCard label={t('proveedor.inicio.pendientes')} value={resumen.pendientes} tone="warning" colors={colors} styles={styles} />
              <StatCard label={t('proveedor.inicio.enCurso')} value={resumen.enCurso} tone="info" colors={colors} styles={styles} />
              <StatCard label={t('proveedor.inicio.entregados')} value={resumen.entregados} tone="success" colors={colors} styles={styles} />
            </View>

            {/* Últimos pedidos */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('proveedor.inicio.ultimosPedidos')}</Text>
              <Pressable onPress={() => router.navigate('/(proveedor)/pedidos')} hitSlop={6}>
                <Text style={styles.verTodos}>{t('proveedor.inicio.verTodos')}</Text>
              </Pressable>
            </View>

            <View style={{ gap: spacing.sm }}>
              {ultimos.map((p) => (
                <PedidoMiniRow
                  key={p.id}
                  pedido={p}
                  colors={colors}
                  styles={styles}
                  t={t}
                  onPress={() => router.navigate('/(proveedor)/pedidos')}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  tone,
  colors,
  styles,
}: {
  label: string;
  value: number;
  tone: EstadoTone;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const color = colors[tone];
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PedidoMiniRow({
  pedido,
  colors,
  styles,
  t,
  onPress,
}: {
  pedido: Pedido;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  t: TranslateFn;
  onPress: () => void;
}) {
  const meta = ESTADO_PEDIDO[pedido.estado];
  const tone = colors[meta.tone];
  const cantidad = pedido.items.reduce((acc, it) => acc + it.cantidad, 0);
  return (
    <Pressable onPress={onPress} style={styles.pedidoRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.pedidoNombre} numberOfLines={1}>
          {pedido.compradorNombre ?? t('proveedor.inicio.pedido')}
        </Text>
        <Text style={styles.pedidoMeta}>
          {cantidad} {cantidad === 1 ? t('proveedor.inicio.producto') : t('proveedor.inicio.productos')} · {formatARS(pedido.total)}
        </Text>
      </View>
      <View style={[styles.estadoChip, { backgroundColor: `${tone}1A` }]}>
        <Text style={[styles.estadoChipText, { color: tone }]}>{t(`estadosPedido.${pedido.estado}`)}</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bone },

    // Empty / hero
    heroCard: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    heroTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, textAlign: 'center' },
    heroBody: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 19,
    },
    heroBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      marginTop: spacing.lg,
    },
    heroBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },

    // A cobrar
    cobrarCard: {
      backgroundColor: colors.navy,
      borderRadius: radius.xl,
      padding: spacing.xl,
      marginTop: spacing.lg,
    },
    cobrarLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
    cobrarValue: { fontSize: 30, fontWeight: '800', color: colors.white, marginTop: 4 },

    // Stats
    statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    statCard: {
      flex: 1,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    statValue: { fontSize: 24, fontWeight: '800' },
    statLabel: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: '600' },

    // Section
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
    verTodos: { fontSize: 13, color: colors.primary, fontWeight: '600' },

    // Pedido row
    pedidoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.white,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    pedidoNombre: { fontSize: 14, fontWeight: '700', color: colors.ink },
    pedidoMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
    estadoChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    estadoChipText: { fontSize: 11, fontWeight: '700' },
  });
