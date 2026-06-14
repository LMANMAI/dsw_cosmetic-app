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
import { productosService, pedidosService, pagosService, PAGOS_HABILITADOS } from '@/services';
import type { Producto, Pedido } from '@/types/models';
import { CATEGORIAS } from '@/data/categorias';
import { Button } from '@/components/Button';
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
  const [carritoVisible, setCarritoVisible] = useState(false);
  const [pagando, setPagando] = useState(false);

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

  const checkout = async () => {
    if (!user || cart.items.length === 0) return;
    const items = cart.items.map((it) => ({
      productoId: it.producto.id,
      productoNombre: it.producto.nombre,
      cantidad: it.cantidad,
      precioUnitario: it.producto.precio,
      proveedorId: it.producto.proveedorId,
      proveedorNombre: it.producto.proveedorNombre,
    }));

    setPagando(true);
    let creados: Pedido[] = [];
    try {
      // 1) Crear los pedidos en espera de pago (todavía no se descuenta stock).
      creados = await pedidosService.crearDesdeCarrito({
        comprador: { id: user.id, nombre: user.nombre, rol: user.rol },
        items,
      });
      const orderIds = creados.map((p) => p.id);

      // Pago desactivado (modo pruebas): confirmamos directo sin pasar por MP.
      if (!PAGOS_HABILITADOS) {
        await pedidosService.marcarPagados(orderIds);
        cart.clear();
        setCarritoVisible(false);
        cargar();
        Alert.alert('Pedido confirmado', 'Tu compra fue registrada. Seguí el estado en Mis pedidos.');
        return;
      }

      // 2) Crear la preferencia de Mercado Pago por el total del carrito.
      const pedidoItems = items.map((it) => ({
        productoId: it.productoId,
        productoNombre: it.productoNombre,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
      }));
      const { initPoint } = await pagosService.crearPreferenciaPedido({
        orderIds,
        items: pedidoItems,
        email: user.email,
      });

      // 3) Abrir el checkout y esperar el resultado del pago.
      const estado = await pagosService.abrirCheckout(initPoint);

      if (estado === 'approved') {
        await pedidosService.marcarPagados(orderIds);
        cart.clear();
        setCarritoVisible(false);
        cargar();
        Alert.alert('Pago aprobado', 'Tu compra fue registrada. Seguí el estado en Mis pedidos.');
      } else if (estado === 'pending') {
        Alert.alert(
          'Pago pendiente',
          'Tu pago quedó pendiente de acreditación. Cuando se confirme, el pedido se procesa. Lo ves en Mis pedidos.',
        );
      } else {
        await pedidosService.cancelarImpagos(orderIds);
        Alert.alert(
          'Pago no completado',
          'No se completó el pago, así que cancelamos el pedido. Podés intentarlo otra vez.',
        );
      }
    } catch (e: any) {
      if (creados.length) {
        await pedidosService.cancelarImpagos(creados.map((p) => p.id)).catch(() => {});
      }
      Alert.alert('No pudimos procesar el pago', e?.message ?? 'Probá de nuevo en unos minutos.');
    } finally {
      setPagando(false);
    }
  };

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
              <Pressable onPress={() => setCarritoVisible((v) => !v)} style={styles.cartBtn}>
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

      {carritoVisible && cart.items.length > 0 ? (
        <View style={styles.cartPanel}>
          <Text style={styles.cartTitle}>Tu carrito</Text>
          {cart.items.map((it) => (
            <View key={it.producto.id} style={styles.cartItem}>
              <Text style={styles.cartItemName}>{it.producto.nombre}</Text>
              <View style={styles.qtyRow}>
                <Pressable
                  onPress={() => cart.setQty(it.producto.id, it.cantidad - 1)}
                  style={styles.qtyBtn}
                >
                  <Text style={styles.qtySign}>−</Text>
                </Pressable>
                <Text style={styles.qtyText}>{it.cantidad}</Text>
                <Pressable
                  onPress={() => cart.setQty(it.producto.id, it.cantidad + 1)}
                  style={styles.qtyBtn}
                >
                  <Text style={styles.qtySign}>+</Text>
                </Pressable>
                <Text style={styles.cartItemPrice}>
                  {formatARS(it.producto.precio * it.cantidad)}
                </Text>
              </View>
            </View>
          ))}
          <View style={styles.cartFooter}>
            <View>
              <Text style={styles.cartTotalLbl}>Total</Text>
              <Text style={styles.cartTotalVal}>{formatARS(cart.total)}</Text>
            </View>
            <Button
              label={
                pagando
                  ? 'Procesando…'
                  : PAGOS_HABILITADOS
                    ? 'Pagar y confirmar'
                    : 'Confirmar pedido'
              }
              onPress={checkout}
              loading={pagando}
            />
          </View>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={productos}
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
          renderItem={({ item }) => (
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
              <View style={styles.productFooter}>
                <Text style={styles.productPrice}>{formatARS(item.precio)}</Text>
                <Pressable
                  disabled={item.stock === 0}
                  onPress={() => cart.add(item)}
                  style={[styles.addBtn, item.stock === 0 && { opacity: 0.4 }]}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}
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
  empty: { alignItems: 'center', paddingVertical: spacing.huge, gap: spacing.sm, paddingHorizontal: spacing.xxl },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: c.ink, textAlign: 'center' },
  emptyText: { fontSize: 13, color: c.muted, textAlign: 'center', lineHeight: 19 },
});
