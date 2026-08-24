import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { pedidosService, pagosService, PAGOS_HABILITADOS } from '@/services';
import type { Pedido, MetodoEntrega } from '@/types/models';
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCart } from '@/context/CartContext';
import { useSession } from '@/context/SessionContext';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import { formatARS } from '@/utils/format';

export default function CarritoScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useSession();
  const router = useRouter();
  const cart = useCart();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [pagando, setPagando] = useState(false);
  const [metodoSel, setMetodoSel] = useState<Record<string, MetodoEntrega>>({});

  // Proveedores presentes en el carrito y qué entrega ofrece cada uno.
  const proveedoresCarrito = useMemo(() => {
    const map = new Map<string, { nombre: string; envio: boolean; retiro: boolean }>();
    for (const it of cart.items) {
      const p = it.producto;
      if (!map.has(p.proveedorId)) {
        map.set(p.proveedorId, {
          nombre: p.proveedorNombre ?? t('profesional.carrito.proveedor'),
          envio: !!p.entregaEnvio,
          retiro: !!p.entregaRetiro,
        });
      }
    }
    return Array.from(map.entries()).map(([id, info]) => ({ id, ...info }));
  }, [cart.items]);

  useEffect(() => {
    setMetodoSel((prev) => {
      const next: Record<string, MetodoEntrega> = {};
      for (const p of proveedoresCarrito) {
        next[p.id] = prev[p.id] ?? (p.envio ? 'envio' : p.retiro ? 'retiro' : 'envio');
      }
      return next;
    });
  }, [proveedoresCarrito]);

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
      creados = await pedidosService.crearDesdeCarrito({
        comprador: { id: user.id, nombre: user.nombre, rol: user.rol },
        items,
        metodoPorProveedor: metodoSel,
      });
      const orderIds = creados.map((p) => p.id);

      const exito = () => {
        cart.clear();
        Alert.alert(t('profesional.carrito.pedidoConfirmadoTitulo'), t('profesional.carrito.pedidoConfirmadoMsg'), [
          { text: t('profesional.carrito.verMisPedidos'), onPress: () => router.replace('/(profesional)/mis-pedidos') },
          { text: t('profesional.carrito.seguirComprando'), style: 'cancel', onPress: () => router.back() },
        ]);
      };

      // Modo pruebas sin MP: confirmamos directo sin pasar por el checkout.
      if (!PAGOS_HABILITADOS) {
        await pedidosService.marcarPagados(orderIds);
        exito();
        return;
      }

      // Split: un checkout por proveedor (cada pago va a su cuenta de MP).
      const restantes = [...creados];
      let huboPendiente = false;
      let fallo = false;
      while (restantes.length) {
        const pedido = restantes.shift()!;
        const { initPoint } = await pagosService.crearPreferenciaPedidoSplit(pedido.id);
        const estado = await pagosService.abrirCheckout(initPoint);
        if (estado === 'approved') {
          await pedidosService.marcarPagados([pedido.id]);
        } else if (estado === 'pending') {
          huboPendiente = true;
        } else {
          // Cancelamos el pedido actual y los que faltaban pagar.
          await pedidosService.cancelarImpagos([pedido.id, ...restantes.map((p) => p.id)]);
          fallo = true;
          break;
        }
      }

      if (fallo) {
        cart.clear();
        Alert.alert(
          t('profesional.carrito.pagoNoCompletadoTitulo'),
          t('profesional.carrito.pagoNoCompletadoMsg'),
          [{ text: t('profesional.carrito.verMisPedidos'), onPress: () => router.replace('/(profesional)/mis-pedidos') }],
        );
      } else if (huboPendiente) {
        cart.clear();
        Alert.alert(
          t('profesional.carrito.pagoPendienteTitulo'),
          t('profesional.carrito.pagoPendienteMsg'),
          [{ text: t('profesional.carrito.verMisPedidos'), onPress: () => router.replace('/(profesional)/mis-pedidos') }],
        );
      } else {
        exito();
      }
    } catch (e: any) {
      if (creados.length) {
        await pedidosService.cancelarImpagos(creados.map((p) => p.id)).catch(() => {});
      }
      Alert.alert(t('profesional.carrito.pagoErrorTitulo'), e?.message ?? t('profesional.carrito.pagoErrorMsg'));
    } finally {
      setPagando(false);
    }
  };

  const vacio = cart.items.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.headerWrap}>
        <ScreenHeader eyebrow={t('profesional.carrito.eyebrow')} title={t('profesional.carrito.titulo')} />
      </View>

      {vacio ? (
        <View style={styles.empty}>
          <Ionicons name="bag-handle-outline" size={40} color={colors.muted} />
          <Text style={styles.emptyTitle}>{t('profesional.carrito.vacioTitulo')}</Text>
          <Text style={styles.emptyText}>{t('profesional.carrito.vacioMsg')}</Text>
          <Button label={t('profesional.carrito.irTienda')} onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: spacing.xxl, paddingBottom: 160 }}>
            {/* Ítems */}
            {cart.items.map((it) => (
              <View key={it.producto.id} style={styles.itemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={2}>{it.producto.nombre}</Text>
                  <Text style={styles.itemUnit}>{t('profesional.carrito.cadaUno', { precio: formatARS(it.producto.precio) })}</Text>
                </View>
                <View style={styles.itemRight}>
                  <View style={styles.qtyRow}>
                    <Pressable
                      onPress={() => cart.setQty(it.producto.id, it.cantidad - 1)}
                      style={styles.qtyBtn}
                    >
                      <Ionicons name="remove" size={16} color={colors.ink} />
                    </Pressable>
                    <Text style={styles.qtyText}>{it.cantidad}</Text>
                    <Pressable
                      onPress={() => cart.setQty(it.producto.id, it.cantidad + 1)}
                      style={styles.qtyBtn}
                    >
                      <Ionicons name="add" size={16} color={colors.ink} />
                    </Pressable>
                  </View>
                  <Text style={styles.itemTotal}>{formatARS(it.producto.precio * it.cantidad)}</Text>
                </View>
              </View>
            ))}

            {/* Entrega */}
            <Text style={styles.sectionTitle}>{t('profesional.carrito.entrega')}</Text>
            {proveedoresCarrito.map((p) => {
              const disponibles: MetodoEntrega[] = [
                ...(p.envio ? (['envio'] as MetodoEntrega[]) : []),
                ...(p.retiro ? (['retiro'] as MetodoEntrega[]) : []),
              ];
              return (
                <View key={p.id} style={styles.entregaBlock}>
                  {proveedoresCarrito.length > 1 ? (
                    <Text style={styles.entregaProv}>{p.nombre}</Text>
                  ) : null}
                  {disponibles.length === 0 ? (
                    <Text style={styles.entregaNota}>{t('profesional.carrito.proveedorCoordina')}</Text>
                  ) : (
                    <View style={styles.entregaChips}>
                      {disponibles.map((m) => {
                        const active = metodoSel[p.id] === m;
                        return (
                          <Pressable
                            key={m}
                            onPress={() => setMetodoSel((s) => ({ ...s, [p.id]: m }))}
                            style={[styles.entregaChip, active && styles.entregaChipActive]}
                          >
                            <Ionicons
                              name={m === 'envio' ? 'bicycle-outline' : 'storefront-outline'}
                              size={15}
                              color={active ? colors.white : colors.muted}
                            />
                            <Text
                              style={[styles.entregaChipText, active && styles.entregaChipTextActive]}
                            >
                              {m === 'envio' ? t('profesional.carrito.envioDomicilio') : t('profesional.carrito.retiroLocal')}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Barra inferior */}
          <View style={styles.bottomBar}>
            <View>
              <Text style={styles.totalLbl}>{t('profesional.carrito.total')}</Text>
              <Text style={styles.totalVal}>{formatARS(cart.total)}</Text>
            </View>
            <Button
              label={pagando ? t('profesional.carrito.procesando') : PAGOS_HABILITADOS ? t('profesional.carrito.pagarConfirmar') : t('profesional.carrito.confirmarPedido')}
              onPress={checkout}
              loading={pagando}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    headerRow: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md },
    headerWrap: { paddingHorizontal: spacing.xxl, paddingTop: spacing.sm },

    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
      marginBottom: spacing.sm,
    },
    itemName: { fontSize: 14, fontWeight: '600', color: c.ink, lineHeight: 18 },
    itemUnit: { fontSize: 12, color: c.muted, marginTop: 2 },
    itemRight: { alignItems: 'flex-end', gap: spacing.sm },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    qtyBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: c.bone,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.bone3,
    },
    qtyText: { fontSize: 14, fontWeight: '700', color: c.ink, minWidth: 18, textAlign: 'center' },
    itemTotal: { fontSize: 14, fontWeight: '700', color: c.primary },

    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.muted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    entregaBlock: { marginBottom: spacing.sm },
    entregaProv: { fontSize: 13, fontWeight: '600', color: c.ink, marginBottom: spacing.xs },
    entregaNota: { fontSize: 13, color: c.muted },
    entregaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    entregaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.bone3,
      backgroundColor: c.surface,
    },
    entregaChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    entregaChipText: { fontSize: 13, fontWeight: '600', color: c.muted },
    entregaChipTextActive: { color: c.white },

    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    totalLbl: { fontSize: 12, color: c.muted },
    totalVal: { fontSize: 22, fontWeight: '800', color: c.ink },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xxl },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: c.ink },
    emptyText: { fontSize: 14, color: c.muted, textAlign: 'center', lineHeight: 20 },
  });
