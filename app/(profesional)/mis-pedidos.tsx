import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { pedidosService } from '@/services';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import { formatARS } from '@/utils/format';
import { ESTADO_PEDIDO } from '@/utils/pedidos';
import type { Pedido } from '@/types/models';

export default function MisPedidosScreen() {
  const { colors } = useTheme();
  const { user } = useSession();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const compradorId = user?.id ?? '';

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    if (!compradorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setPedidos(await pedidosService.pedidosDelComprador(compradorId));
    } finally {
      setLoading(false);
    }
  }, [compradorId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.headerWrap}>
        <ScreenHeader
          eyebrow="Tus compras"
          title="Mis pedidos"
          subtitle="Seguí el estado de los insumos que compraste"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing.xxl, paddingBottom: 120, gap: spacing.md }}
          renderItem={({ item }) => <PedidoCard pedido={item} colors={colors} styles={styles} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bag-handle-outline" size={36} color={colors.muted} />
              <Text style={styles.emptyTitle}>Todavía no hiciste compras</Text>
              <Text style={styles.emptyText}>
                Cuando compres insumos en la tienda, vas a ver acá cada pedido y su estado.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function PedidoCard({
  pedido,
  colors,
  styles,
}: {
  pedido: Pedido;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const meta = ESTADO_PEDIDO[pedido.estado];
  const tone = colors[meta.tone];
  const fecha = new Date(pedido.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardNombre} numberOfLines={1}>
            {pedido.proveedorNombre ?? 'Proveedor'}
          </Text>
          <Text style={styles.cardFecha}>{fecha}</Text>
        </View>
        <View style={[styles.estadoChip, { backgroundColor: `${tone}1A` }]}>
          <Text style={[styles.estadoChipText, { color: tone }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.itemsBox}>
        {pedido.items.map((it) => (
          <View key={it.productoId} style={styles.itemRow}>
            <Text style={styles.itemNombre} numberOfLines={1}>
              {it.cantidad}× {it.productoNombre}
            </Text>
            <Text style={styles.itemPrecio}>{formatARS(it.precioUnitario * it.cantidad)}</Text>
          </View>
        ))}
      </View>

      {pedido.envio ? (
        <View style={styles.envioBox}>
          <View style={styles.envioBoxRow}>
            <Ionicons
              name={pedido.envio.metodo === 'correo' ? 'cube-outline' : 'bicycle-outline'}
              size={15}
              color={colors.primary}
            />
            <Text style={styles.envioBoxTitle}>
              {pedido.envio.metodo === 'correo'
                ? `Viaja por ${pedido.envio.correo ?? 'correo'}`
                : 'Envío propio del proveedor'}
            </Text>
          </View>
          {pedido.envio.nroSeguimiento ? (
            <Text style={styles.envioBoxText}>Seguimiento: {pedido.envio.nroSeguimiento}</Text>
          ) : null}
          {pedido.envio.mensaje ? (
            <Text style={styles.envioBoxMsg}>“{pedido.envio.mensaje}”</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.cardBottom}>
        <Text style={styles.totalLbl}>Total</Text>
        <Text style={styles.total}>{formatARS(pedido.total)}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bone },
    headerRow: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md },
    headerWrap: { paddingHorizontal: spacing.xxl, paddingTop: spacing.sm },

    card: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    cardNombre: { fontSize: 15, fontWeight: '700', color: colors.ink },
    cardFecha: { fontSize: 12, color: colors.muted, marginTop: 2 },
    estadoChip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
    estadoChipText: { fontSize: 11, fontWeight: '700' },

    itemsBox: {
      marginTop: spacing.md,
      gap: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.bone2,
      paddingTop: spacing.md,
    },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
    itemNombre: { flex: 1, fontSize: 13, color: colors.ink },
    itemPrecio: { fontSize: 13, color: colors.muted, fontWeight: '600' },

    envioBox: {
      marginTop: spacing.md,
      backgroundColor: colors.primaryTint,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: 4,
    },
    envioBoxRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    envioBoxTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
    envioBoxText: { fontSize: 12, color: colors.muted },
    envioBoxMsg: { fontSize: 12, color: colors.ink, fontStyle: 'italic', lineHeight: 17 },

    cardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
    },
    totalLbl: { fontSize: 13, color: colors.muted },
    total: { fontSize: 16, fontWeight: '800', color: colors.ink },

    empty: { alignItems: 'center', paddingVertical: spacing.huge, gap: spacing.sm, paddingHorizontal: spacing.xl },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, textAlign: 'center' },
    emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 },
  });
