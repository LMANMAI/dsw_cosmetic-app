import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { productosService } from '@/services';
import type { Producto } from '@/types/models';
import { CATEGORIAS } from '@/data/categorias';
import { Chip } from '@/components/Chip';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import { formatARS } from '@/utils/format';

/**
 * Tienda de insumos: exclusiva del profesional (el cliente que solo saca
 * turnos no compra mercadería). El profesional compra a los proveedores y
 * ve el estado de sus compras en "Mis pedidos".
 */
export default function InsumosScreen() {
  const { colors } = useTheme();
  const { user } = useSession();
  const router = useRouter();
  const cart = useCart();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const cargar = useCallback(() => {
    setLoading(true);
    productosService
      .listar(categoria ?? undefined, query || undefined)
      .then(setProductos)
      .finally(() => setLoading(false));
  }, [categoria, query]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Refrescar stock al volver a la tienda (p. ej. tras comprar en el carrito).
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          eyebrow="Tienda integrada"
          title="Insumos para tu trabajo"
          subtitle="Comprá a proveedores · seguí el estado en Mis pedidos"
          right={
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.navigate('/(profesional)/mis-pedidos')}
                style={styles.pedidosBtn}
              >
                <Ionicons name="receipt-outline" size={20} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => router.navigate('/(profesional)/carrito')}
                style={styles.cartBtn}
              >
                <Ionicons name="bag" size={20} color="#FFFFFF" />
                {cart.items.length > 0 ? (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cart.items.length}</Text>
                  </View>
                ) : null}
              </Pressable>
            </View>
          }
        />
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar producto…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        <Chip label="Todos" active={!categoria} onPress={() => setCategoria(null)} />
        {CATEGORIAS.map((c) => (
          <Chip
            key={c.slug}
            label={`${c.emoji}  ${c.nombre}`}
            active={categoria === c.slug}
            onPress={() => setCategoria(c.slug)}
          />
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={productos}
          extraData={cart.items}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.xxl }}
          contentContainerStyle={{ paddingBottom: spacing.huge, paddingTop: spacing.xs }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={36} color={colors.muted} />
              <Text style={styles.emptyTitle}>Todavía no hay productos</Text>
              <Text style={styles.emptyText}>
                Cuando los proveedores carguen su catálogo, vas a poder comprar acá.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const enCarrito = cart.items.find((it) => it.producto.id === item.id);
            const cantidad = enCarrito?.cantidad ?? 0;
            return (
            <View style={styles.productCard}>
              <View style={styles.productThumb}>
                {item.imagenUrl ? (
                  <Image source={{ uri: item.imagenUrl }} style={styles.productImg} resizeMode="cover" />
                ) : (
                  <Text style={styles.productThumbEmoji}>📦</Text>
                )}
              </View>
              <Text style={styles.productName} numberOfLines={2}>
                {item.nombre}
              </Text>
              <Text style={styles.productStock}>
                {item.stock > 0 ? `${item.stock} en stock` : 'Sin stock'}
              </Text>
              {item.entregaEnvio || item.entregaRetiro ? (
                <View style={styles.entregaRow}>
                  {item.entregaEnvio ? (
                    <View style={styles.entregaBadge}>
                      <Ionicons name="bicycle-outline" size={11} color={colors.primary} />
                      <Text style={styles.entregaBadgeText}>Envío</Text>
                    </View>
                  ) : null}
                  {item.entregaRetiro ? (
                    <View style={styles.entregaBadge}>
                      <Ionicons name="storefront-outline" size={11} color={colors.primary} />
                      <Text style={styles.entregaBadgeText}>Retiro</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              <View style={styles.productFooter}>
                <Text style={styles.productPrice}>{formatARS(item.precio)}</Text>
                {cantidad > 0 ? (
                  <View style={styles.cardStepper}>
                    <Pressable
                      onPress={() => cart.setQty(item.id, cantidad - 1)}
                      style={styles.cardStepBtn}
                      hitSlop={4}
                    >
                      <Ionicons name="remove" size={16} color={colors.primary} />
                    </Pressable>
                    <Text style={styles.cardStepQty}>{cantidad}</Text>
                    <Pressable
                      onPress={() => cart.setQty(item.id, cantidad + 1)}
                      disabled={cantidad >= item.stock}
                      style={[styles.cardStepBtn, cantidad >= item.stock && { opacity: 0.35 }]}
                      hitSlop={4}
                    >
                      <Ionicons name="add" size={16} color={colors.primary} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    disabled={item.stock === 0}
                    onPress={() => cart.add(item)}
                    style={[styles.addBtn, item.stock === 0 && { opacity: 0.4 }]}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>
            </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  headerWrap: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    backgroundColor: c.background,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pedidosBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.navy,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.lg,
    fontSize: 15,
    color: c.ink,
  },
  chipsScroll: { flexGrow: 0 },
  chipsRow: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  cartPanel: {
    marginHorizontal: spacing.xxl,
    backgroundColor: c.navy,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  cartTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  cartItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  cartItemName: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 6,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtySign: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  qtyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  cartItemPrice: {
    color: c.primaryLight,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  cartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  cartTotalLbl: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  cartTotalVal: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  productCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  productThumb: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: radius.md,
    backgroundColor: c.bone2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  productImg: { width: '100%', height: '100%' },
  productThumbEmoji: { fontSize: 32 },
  productName: { fontSize: 14, fontWeight: '600', color: c.ink, lineHeight: 18 },
  productStock: { fontSize: 11, color: c.muted, marginTop: 4 },
  entregaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  entregaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: c.primaryTint,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  entregaBadgeText: { fontSize: 10, fontWeight: '700', color: c.primary },

  // Selección de entrega en el carrito (sobre fondo navy)
  entregaSelTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  entregaSelBlock: { marginBottom: spacing.sm },
  entregaSelProv: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  entregaSelNota: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  entregaSelChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  entregaSelChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  entregaSelChipActive: { backgroundColor: c.primary, borderColor: c.primary },
  entregaSelChipText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  entregaSelChipTextActive: { color: '#FFFFFF' },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  productPrice: { fontSize: 15, fontWeight: '700', color: c.primary },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: c.primaryTint,
    borderRadius: radius.pill,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  cardStepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStepQty: { fontSize: 14, fontWeight: '700', color: c.ink, minWidth: 20, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: spacing.huge, gap: spacing.sm, paddingHorizontal: spacing.xxl },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: c.ink, textAlign: 'center' },
  emptyText: { fontSize: 13, color: c.muted, textAlign: 'center', lineHeight: 19 },
});
