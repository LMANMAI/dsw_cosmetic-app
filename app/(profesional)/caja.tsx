import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable as RNPressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { turnosService, comisionesService } from '@/services';
import type { CierreCaja, ComisionMensual } from '@/types/models';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing, shadow } from '@/theme';
import type { ThemeColors } from '@/theme';
import { formatARS, metodoPagoLabel, nombreMes } from '@/utils/format';

export default function CierreCajaScreen() {
  const { colors } = useTheme();
  const { t, locale } = useTranslation();
  const { user } = useSession();
  const profesionalId = user?.id ?? '';
  const [data, setData] = useState<CierreCaja | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagando, setPagando] = useState(false);
  const [comisionMes, setComisionMes] = useState<ComisionMensual | null>(null);
  const [comisionesVencidas, setComisionesVencidas] = useState<ComisionMensual[]>([]);
  const [mes, setMes] = useState(new Date().getMonth());
  const anio = new Date().getFullYear();

  useEffect(() => {
    setLoading(true);
    const cargarDatos = async () => {
      const caja = await turnosService.cierreCajaMensual(profesionalId, mes, anio);
      setData(caja);
      // Las consultas a comisiones pueden fallar si las reglas de Firestore
      // aún no incluyen la colección "comisiones". No bloquear la carga.
      try {
        const [comision, vencidas] = await Promise.all([
          comisionesService.obtener(profesionalId, mes, anio),
          comisionesService.obtenerVencidas(profesionalId),
        ]);
        setComisionMes(comision);
        setComisionesVencidas(vencidas);
      } catch {
        // Permisos insuficientes — se muestra la caja sin info de comisiones
      }
    };
    cargarDatos().finally(() => setLoading(false));
  }, [mes]);

  const handlePagarComision = async (comision: ComisionMensual) => {
    setPagando(true);
    try {
      // Si no existe registro de comisión aún, crearlo
      let com = comision;
      if (!com.id) {
        com = await comisionesService.generarOActualizar(
          profesionalId, com.mes, com.anio, com.montoTotal,
        );
      }
      await comisionesService.pagarComision(com);
    } catch (e) {
      Alert.alert(t('comun.error'), t('profesional.caja.errorLinkPago'));
    } finally {
      setPagando(false);
    }
  };

  const cambiarMes = (delta: number) => {
    setMes((m) => Math.max(0, Math.min(11, m + delta)));
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const metodos = [
    { key: 'efectivo', label: t('comun.metodosPago.efectivo'), emoji: '💵', color: colors.success },
    { key: 'transferencia', label: t('comun.metodosPago.transferencia'), emoji: '🏦', color: colors.info },
    { key: 'mercado_pago', label: t('comun.metodosPago.mercadoPago'), emoji: '🟢', color: '#00B1EA' },
    { key: 'mixto', label: t('profesional.caja.pagosMixtos'), emoji: '⚖️', color: colors.warning },
  ] as const;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xxl, paddingBottom: spacing.huge }}>
        <ScreenHeader
          eyebrow={t('profesional.caja.eyebrow')}
          title={t('profesional.caja.titulo')}
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
          <Text style={styles.heroLabel}>{t('profesional.caja.totalCobradoMes')}</Text>
          <Text style={styles.heroValue}>{formatARS(data.totalCobrado)}</Text>
          <View style={styles.heroDivider} />
          <View style={styles.heroFooter}>
            <View>
              <Text style={styles.heroFooterLbl}>{t('profesional.caja.turnosCompletados')}</Text>
              <Text style={styles.heroFooterVal}>{data.cantidadTurnos}</Text>
            </View>
            <View>
              <Text style={styles.heroFooterLbl}>{t('profesional.caja.promedioPorTurno')}</Text>
              <Text style={styles.heroFooterVal}>
                {data.cantidadTurnos
                  ? formatARS(Math.round(data.totalCobrado / data.cantidadTurnos))
                  : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Desglose por método de pago */}
        <Text style={styles.sectionTitle}>{t('profesional.caja.desgloseTitulo')}</Text>
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
              <Text style={styles.metodoPct}>{t('profesional.caja.pctDelTotal', { pct: porc })}</Text>
            </View>
          );
        })}

        {/* Detalle de cobros individuales */}
        <Text style={styles.sectionTitle}>{t('profesional.caja.detalleCobros')}</Text>
        {data.detalleCobros.length === 0 ? (
          <View style={styles.emptyDetail}>
            <Text style={styles.emptyDetailText}>{t('profesional.caja.sinCobros')}</Text>
          </View>
        ) : (
          data.detalleCobros.map((cobro, idx) => {
            const metodoInfo = {
              efectivo: { emoji: '💵', color: colors.success },
              transferencia: { emoji: '🏦', color: colors.info },
              mercado_pago: { emoji: '🟢', color: '#00B1EA' },
              mixto: { emoji: '⚖️', color: colors.warning },
            }[cobro.metodoPago] ?? { emoji: '💳', color: colors.muted };

            return (
              <View key={cobro.turnoId ?? idx} style={styles.cobroCard}>
                <View style={styles.cobroTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cobroCliente}>{cobro.clienteNombre}</Text>
                    <Text style={styles.cobroServicio}>{cobro.servicioNombre}</Text>
                  </View>
                  <Text style={styles.cobroMonto}>{formatARS(cobro.monto)}</Text>
                </View>
                <View style={styles.cobroBottom}>
                  <Text style={styles.cobroFecha}>
                    {new Date(cobro.fecha + 'T00:00:00').toLocaleDateString(locale, {
                      day: '2-digit', month: 'short',
                    })}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text style={[styles.cobroComision, { color: colors.danger }]}>
                      {t('profesional.caja.comisionAbrev', { monto: formatARS(cobro.comision) })}
                    </Text>
                    <View style={[styles.cobroMetodoBadge, { backgroundColor: metodoInfo.color + '18' }]}>
                      <Text style={styles.cobroMetodoEmoji}>{metodoInfo.emoji}</Text>
                      <Text style={[styles.cobroMetodoText, { color: metodoInfo.color }]}>
                        {metodoPagoLabel(cobro.metodoPago)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* Insumos descontados */}
        <View style={styles.netCard}>
          <View style={styles.netRow}>
            <Text style={styles.netLbl}>{t('profesional.caja.totalCobrado')}</Text>
            <Text style={styles.netVal}>{formatARS(data.totalCobrado)}</Text>
          </View>
          <View style={styles.netRow}>
            <Text style={styles.netLbl}>{t('profesional.caja.comisionPlataforma')}</Text>
            <Text style={[styles.netVal, { color: colors.danger }]}>
              − {formatARS(data.totalComisionPlataforma)}
            </Text>
          </View>
          <View style={styles.netRow}>
            <Text style={styles.netLbl}>{t('profesional.caja.insumosComprados')}</Text>
            <Text style={[styles.netVal, { color: colors.danger }]}>
              − {formatARS(data.insumosComprados)}
            </Text>
          </View>
          <View style={styles.netDivider} />
          <View style={styles.netRow}>
            <Text style={styles.netLblBold}>{t('profesional.caja.gananciaNeta')}</Text>
            <Text style={styles.netValBold}>{formatARS(data.gananciaNeta)}</Text>
          </View>
        </View>

        {/* Banner de comisiones vencidas */}
        {comisionesVencidas.length > 0 && (
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Ionicons name="warning" size={20} color="#D32F2F" />
              <Text style={styles.alertTitle}>{t('profesional.caja.comisionVencida')}</Text>
            </View>
            <Text style={styles.alertText}>{t('profesional.caja.comisionVencidaMsg')}</Text>
            {comisionesVencidas.map((cv) => (
              <View key={cv.id} style={styles.alertRow}>
                <Text style={styles.alertMes}>
                  {nombreMes(cv.mes)} {cv.anio}
                </Text>
                <Text style={styles.alertMonto}>{formatARS(cv.montoTotal)}</Text>
              </View>
            ))}
            <RNPressable
              style={[styles.pagarBtn, { backgroundColor: '#D32F2F' }]}
              onPress={() => {
                // Pagar todas las vencidas: sumamos montos en una sola
                const totalVencido = comisionesVencidas.reduce((s, c) => s + c.montoTotal, 0);
                handlePagarComision({
                  ...comisionesVencidas[0],
                  montoTotal: totalVencido,
                });
              }}
              disabled={pagando}
            >
              {pagando ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={18} color="#FFF" />
                  <Text style={styles.pagarBtnText}>
                    {t('profesional.caja.pagarMonto', { monto: formatARS(comisionesVencidas.reduce((s, c) => s + c.montoTotal, 0)) })}
                  </Text>
                </>
              )}
            </RNPressable>
          </View>
        )}

        {/* Botón para pagar comisión del mes actual */}
        {data.totalComisionPlataforma > 0 && (!comisionMes || comisionMes.estado !== 'pagada') && (
          <View style={styles.comisionCard}>
            <View style={styles.comisionHeader}>
              <Ionicons name="cash-outline" size={20} color={colors.primary} />
              <Text style={styles.comisionTitle}>{t('profesional.caja.comisionDelMes')}</Text>
            </View>
            <Text style={styles.comisionSubtitle}>
              {comisionMes?.estado === 'vencida'
                ? t('profesional.caja.comisionVencidaSub')
                : t('profesional.caja.comisionPendienteSub')}
            </Text>
            <View style={styles.comisionMontoRow}>
              <Text style={styles.comisionMontoLabel}>{t('profesional.caja.totalAPagar')}</Text>
              <Text style={styles.comisionMontoValue}>
                {formatARS(data.totalComisionPlataforma)}
              </Text>
            </View>
            <RNPressable
              style={[styles.pagarBtn, { backgroundColor: colors.primary }]}
              onPress={() =>
                handlePagarComision({
                  id: comisionMes?.id ?? '',
                  profesionalId,
                  mes,
                  anio,
                  montoTotal: data.totalComisionPlataforma,
                  estado: comisionMes?.estado ?? 'pendiente',
                  creadoEn: comisionMes?.creadoEn ?? new Date().toISOString(),
                })
              }
              disabled={pagando}
            >
              {pagando ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-usd" size={18} color="#FFF" />
                  <Text style={styles.pagarBtnText}>{t('profesional.caja.pagarComisionMP')}</Text>
                </>
              )}
            </RNPressable>
          </View>
        )}

        {/* Comisión ya pagada */}
        {comisionMes?.estado === 'pagada' && (
          <View style={[styles.comisionCard, { borderColor: colors.success }]}>
            <View style={styles.comisionHeader}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.comisionTitle, { color: colors.success }]}>
                {t('profesional.caja.comisionPagada')}
              </Text>
            </View>
            <Text style={styles.comisionSubtitle}>
              {t('profesional.caja.comisionPagadaMsg', {
                monto: formatARS(comisionMes.montoTotal),
                fecha: comisionMes.fechaPago
                  ? new Date(comisionMes.fechaPago).toLocaleDateString(locale)
                  : '—',
              })}
            </Text>
          </View>
        )}

        <View style={styles.tip}>
          <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
          <Text style={styles.tipText}>{t('profesional.caja.tip')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: spacing.xl,
  },
  monthName: {
    fontSize: 13,
    fontWeight: '700',
    color: c.ink,
    letterSpacing: 1.6,
  },
  monthBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
  },
  monthBtnText: { fontSize: 18, fontWeight: '700', color: c.ink },
  heroCard: {
    backgroundColor: c.navy,
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
    color: '#FFFFFF',
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
  heroFooterVal: { color: c.primaryLight, fontSize: 18, fontWeight: '700', marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.ink,
    marginTop: spacing.xxxl,
    marginBottom: spacing.lg,
  },
  metodoCard: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
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
  metodoLabel: { fontSize: 14, fontWeight: '600', color: c.ink },
  metodoMonto: { fontSize: 15, fontWeight: '700', color: c.ink },
  barTrack: {
    height: 6,
    backgroundColor: c.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  metodoPct: {
    fontSize: 11,
    color: c.muted,
    marginTop: 6,
    fontWeight: '500',
  },
  emptyDetail: {
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyDetailText: { fontSize: 13, color: c.muted, fontWeight: '500' },
  cobroCard: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cobroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cobroCliente: { fontSize: 14, fontWeight: '600', color: c.ink },
  cobroServicio: { fontSize: 12, color: c.muted, marginTop: 2 },
  cobroMonto: { fontSize: 15, fontWeight: '700', color: c.ink },
  cobroBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cobroFecha: { fontSize: 11, color: c.muted },
  cobroMetodoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  cobroComision: { fontSize: 11, fontWeight: '500' },
  cobroMetodoEmoji: { fontSize: 12 },
  cobroMetodoText: { fontSize: 11, fontWeight: '600' },
  netCard: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: c.border,
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netLbl: { fontSize: 14, color: c.muted },
  netVal: { fontSize: 15, fontWeight: '600', color: c.ink },
  netDivider: { height: 1, backgroundColor: c.border },
  netLblBold: { fontSize: 15, fontWeight: '700', color: c.ink },
  netValBold: { fontSize: 22, fontWeight: '700', color: c.primary },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  tipText: { flex: 1, fontSize: 12, color: c.muted, lineHeight: 18 },
  /* ── Alerta de comisión vencida ── */
  alertCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertTitle: { fontSize: 16, fontWeight: '700', color: '#D32F2F' },
  alertText: { fontSize: 13, color: '#B71C1C', lineHeight: 20 },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  alertMes: { fontSize: 14, color: '#D32F2F', fontWeight: '500' },
  alertMonto: { fontSize: 15, fontWeight: '700', color: '#D32F2F' },
  /* ── Comisión del mes ── */
  comisionCard: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: c.border,
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  comisionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  comisionTitle: { fontSize: 16, fontWeight: '700', color: c.ink },
  comisionSubtitle: { fontSize: 13, color: c.muted, lineHeight: 20 },
  comisionMontoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  comisionMontoLabel: { fontSize: 14, fontWeight: '600', color: c.ink },
  comisionMontoValue: { fontSize: 18, fontWeight: '700', color: c.primary },
  /* ── Botón pagar ── */
  pagarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  pagarBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
