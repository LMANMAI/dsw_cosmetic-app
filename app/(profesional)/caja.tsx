import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable as RNPressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { turnosService } from '@/services';
import type { CierreCaja } from '@/types/models';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { colors, radius, spacing, shadow } from '@/theme';
import { formatARS, nombreMes } from '@/utils/format';

export default function CierreCajaScreen() {
  const { user } = useSession();
  const profesionalId = 'pro-1';
  const [data, setData] = useState<CierreCaja | null>(null);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth());
  const anio = new Date().getFullYear();

  useEffect(() => {
    setLoading(true);
    turnosService
      .cierreCajaMensual(profesionalId, mes, anio)
      .then((d) =>
        // datos demo: si el mes actual no tiene cierres aún, usamos un escenario realista
        d.cantidadTurnos > 0
          ? d
          : {
              ...d,
              totalCobrado: 387500,
              cantidadTurnos: 34,
              insumosComprados: 45200,
              gananciaNeta: 342300,
              porMetodo: {
                efectivo: 152000,
                transferencia: 128500,
                mercado_pago: 95000,
                mixto: 12000,
              },
            },
      )
      .then(setData)
      .finally(() => setLoading(false));
  }, [mes]);

  const cambiarMes = (delta: number) => {
    setMes((m) => Math.max(0, Math.min(11, m + delta)));
  };

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.rose} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const metodos = [
    { key: 'efectivo', label: 'Efectivo', emoji: '💵', color: colors.success },
    { key: 'transferencia', label: 'Transferencia', emoji: '🏦', color: colors.info },
    { key: 'mercado_pago', label: 'Mercado Pago', emoji: '🟢', color: '#00B1EA' },
    { key: 'mixto', label: 'Pagos mixtos', emoji: '⚖️', color: colors.warning },
  ] as const;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xxl, paddingBottom: spacing.huge }}>
        <ScreenHeader
          eyebrow="Tu negocio"
          title="Cierre de caja"
          subtitle={`${user?.nombre ?? ''} · ${nombreMes(mes)} ${anio}`}
        />

        {/* Selector de mes */}
        <View style={styles.monthSelector}>
          <RNPressable onPress={() => cambiarMes(-1)} style={styles.monthBtn}>
            <Text style={styles.monthBtnText}>‹</Text>
          </RNPressable>
          <Text style={styles.monthName}>{nombreMes(mes).toUpperCase()}</Text>
          <RNPressable onPress={() => cambiarMes(1)} style={styles.monthBtn}>
            <Text style={styles.monthBtnText}>›</Text>
          </RNPressable>
        </View>

        {/* Hero card — total cobrado */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total cobrado este mes</Text>
          <Text style={styles.heroValue}>{formatARS(data.totalCobrado)}</Text>
          <View style={styles.heroDivider} />
          <View style={styles.heroFooter}>
            <View>
              <Text style={styles.heroFooterLbl}>Turnos completados</Text>
              <Text style={styles.heroFooterVal}>{data.cantidadTurnos}</Text>
            </View>
            <View>
              <Text style={styles.heroFooterLbl}>Promedio por turno</Text>
              <Text style={styles.heroFooterVal}>
                {data.cantidadTurnos
                  ? formatARS(Math.round(data.totalCobrado / data.cantidadTurnos))
                  : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Desglose por método de pago */}
        <Text style={styles.sectionTitle}>Desglose por método de pago</Text>
        {metodos.map((m) => {
          const monto = data.porMetodo[m.key];
          const porc = data.totalCobrado > 0 ? Math.round((monto / data.totalCobrado) * 100) : 0;
          return (
            <View key={m.key} style={styles.metodoCard}>
              <View style={styles.metodoHead}>
                <View style={styles.metodoTitle}>
                  <Text style={styles.metodoEmoji}>{m.emoji}</Text>
                  <Text style={styles.metodoLabel}>{m.label}</Text>
                </View>
                <Text style={styles.metodoMonto}>{formatARS(monto)}</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${porc}%`, backgroundColor: m.color },
                  ]}
                />
              </View>
              <Text style={styles.metodoPct}>{porc}% del total</Text>
            </View>
          );
        })}

        {/* Insumos descontados */}
        <View style={styles.netCard}>
          <View style={styles.netRow}>
            <Text style={styles.netLbl}>Total cobrado</Text>
            <Text style={styles.netVal}>{formatARS(data.totalCobrado)}</Text>
          </View>
          <View style={styles.netRow}>
            <Text style={styles.netLbl}>Insumos comprados en el mes</Text>
            <Text style={[styles.netVal, { color: colors.danger }]}>
              − {formatARS(data.insumosComprados)}
            </Text>
          </View>
          <View style={styles.netDivider} />
          <View style={styles.netRow}>
            <Text style={styles.netLblBold}>Ganancia neta estimada</Text>
            <Text style={styles.netValBold}>{formatARS(data.gananciaNeta)}</Text>
          </View>
        </View>

        <View style={styles.tip}>
          <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
          <Text style={styles.tipText}>
            Estos datos se generan automáticamente con cada turno completado y compra de insumos.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bone },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  monthName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: 1.6,
  },
  monthBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bone2,
  },
  monthBtnText: { fontSize: 18, fontWeight: '700', color: colors.ink },
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    ...shadow.raised,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroValue: {
    color: colors.white,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    marginTop: spacing.sm,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: spacing.lg,
  },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  heroFooterLbl: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  heroFooterVal: { color: colors.roseLight, fontSize: 18, fontWeight: '700', marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.xxxl,
    marginBottom: spacing.lg,
  },
  metodoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  metodoHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metodoTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metodoEmoji: { fontSize: 18 },
  metodoLabel: { fontSize: 14, fontWeight: '600', color: colors.ink },
  metodoMonto: { fontSize: 15, fontWeight: '700', color: colors.ink },
  barTrack: {
    height: 6,
    backgroundColor: colors.bone2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  metodoPct: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 6,
    fontWeight: '500',
  },
  netCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netLbl: { fontSize: 14, color: colors.muted },
  netVal: { fontSize: 15, fontWeight: '600', color: colors.ink },
  netDivider: { height: 1, backgroundColor: colors.border },
  netLblBold: { fontSize: 15, fontWeight: '700', color: colors.ink },
  netValBold: { fontSize: 22, fontWeight: '700', color: colors.rose },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  tipText: { flex: 1, fontSize: 12, color: colors.muted, lineHeight: 18 },
});
