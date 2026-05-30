import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useFocusEffect } from '@react-navigation/native';
import { turnosService } from '@/services';
import { disponibilidadService } from '@/services/disponibilidad.service';
import type { EstadoTurno, MetodoPago, Turno } from '@/types/models';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { useTheme, radius, spacing, shadow } from '@/theme';
import type { ThemeColors } from '@/theme';
import { formatARS, metodoPagoLabel } from '@/utils/format';

const ESTADO_TONE: Record<EstadoTurno, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  confirmado: 'success',
  pendiente: 'warning',
  completado: 'info',
  cancelado: 'danger',
  no_asistio: 'danger',
};

export default function AgendaScreen() {
  const { colors } = useTheme();
  const { user } = useSession();
  const router = useRouter();
  const profesionalId = user?.id ?? '';
  const [items, setItems] = useState<Turno[]>([]);
  const [pendientesFuturos, setPendientesFuturos] = useState<Turno[]>([]);
  const [proximosTurnos, setProximosTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [tieneAgenda, setTieneAgenda] = useState<boolean | null>(null);
  const todayISO = new Date().toISOString().slice(0, 10);

  const cargar = useCallback(() => {
    if (!profesionalId) return;
    setLoading(true);
    Promise.all([
      turnosService.listarDelProfesional(profesionalId, todayISO),
      turnosService.listarDelProfesional(profesionalId),
      disponibilidadService.tieneAgenda(profesionalId),
    ])
      .then(([turnos, todos, tiene]) => {
        setItems(turnos);
        const futuros = todos.filter((t) => t.fecha > todayISO);
        setPendientesFuturos(
          futuros.filter((t) => t.estado === 'pendiente')
                 .sort((a, b) => (a.fecha + a.hora < b.fecha + b.hora ? -1 : 1)),
        );
        setProximosTurnos(
          futuros.filter((t) => t.estado === 'confirmado')
                 .sort((a, b) => (a.fecha + a.hora < b.fecha + b.hora ? -1 : 1)),
        );
        setTieneAgenda(tiene);
      })
      .catch((err) => {
        console.error('[agenda] error al cargar:', err?.message ?? err);
      })
      .finally(() => setLoading(false));
  }, [profesionalId, todayISO]);

  // Cargar cuando profesionalId esté disponible (por si el contexto carga tarde)
  useEffect(() => {
    if (profesionalId) cargar();
  }, [profesionalId]);

  // Recargar cada vez que la pantalla gana foco (ej. al volver de configurar horarios)
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  // Ingresos: turnos confirmados + completados (hoy + futuros)
  const turnosConIngreso = useMemo(
    () => [
      ...items.filter((t) => t.estado === 'confirmado' || t.estado === 'completado'),
      ...proximosTurnos, // futuros confirmados
    ],
    [items, proximosTurnos],
  );
  const ingresos = useMemo(
    () => turnosConIngreso.reduce((acc, t) => acc + t.monto, 0),
    [turnosConIngreso],
  );
  // Desglose: cobrado (completados con método de pago) vs por cobrar (confirmados sin pago)
  const ingresoPorMetodo = useMemo(() => {
    const desglose: Record<string, number> = {
      efectivo: 0, transferencia: 0, mercado_pago: 0, mixto: 0, por_cobrar: 0,
    };
    turnosConIngreso.forEach((t) => {
      if (t.estado === 'completado' && t.metodoPago) {
        desglose[t.metodoPago] += t.monto;
      } else {
        desglose.por_cobrar += t.monto;
      }
    });
    return desglose;
  }, [turnosConIngreso]);
  // Contadores: incluyen hoy + futuros
  const totalTurnos = items.length + proximosTurnos.length + pendientesFuturos.length;
  const totalPendientes = items.filter((t) => t.estado === 'pendiente').length + pendientesFuturos.length;
  const confirmados = items.filter((t) => t.estado === 'confirmado').length;

  const accionarTurno = (turno: Turno) => {
    if (turno.estado === 'pendiente') {
      Alert.alert('Confirmar turno', `¿Confirmar el turno de ${turno.clienteNombre}?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            await turnosService.actualizarEstado(turno.id, 'confirmado');
            cargar();
          },
        },
      ]);
      return;
    }
    if (turno.estado === 'confirmado') {
      Alert.alert(
        'Registrar pago',
        `Cliente: ${turno.clienteNombre}\nMonto: ${formatARS(turno.monto)}`,
        [
          { text: 'Efectivo', onPress: () => completar(turno, 'efectivo') },
          { text: 'Transferencia', onPress: () => completar(turno, 'transferencia') },
          { text: 'Mercado Pago', onPress: () => completar(turno, 'mercado_pago') },
          { text: 'Cancelar', style: 'cancel' },
        ],
      );
    }
  };

  const completar = async (turno: Turno, metodo: MetodoPago) => {
    await turnosService.actualizarEstado(turno.id, 'completado', metodo);
    cargar();
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.huge }}>
        <View style={styles.headerWrap}>
          <ScreenHeader
            eyebrow="Hoy"
            title={new Date().toLocaleDateString('es-AR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            })}
            subtitle={user?.nombre}
            right={
              <Pressable
                onPress={() => router.push('/(profesional)/horarios')}
                style={({ pressed }) => [styles.editAgendaBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="settings-outline" size={18} color={colors.primary} />
                <Text style={[styles.editAgendaLabel, { color: colors.primary }]}>
                  {tieneAgenda ? 'Editar horarios' : 'Configurar'}
                </Text>
              </Pressable>
            }
          />
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.statLabelLight}>Ingresos</Text>
            <Text style={styles.statValueLight}>{formatARS(ingresos)}</Text>
            {ingresos > 0 && (
              <View style={styles.desgloseWrap}>
                {ingresoPorMetodo.efectivo > 0 && (
                  <Text style={styles.desgloseLine}>💵 Efectivo: {formatARS(ingresoPorMetodo.efectivo)}</Text>
                )}
                {ingresoPorMetodo.transferencia > 0 && (
                  <Text style={styles.desgloseLine}>🏦 Transferencia: {formatARS(ingresoPorMetodo.transferencia)}</Text>
                )}
                {ingresoPorMetodo.mercado_pago > 0 && (
                  <Text style={styles.desgloseLine}>🟢 Mercado Pago: {formatARS(ingresoPorMetodo.mercado_pago)}</Text>
                )}
                {ingresoPorMetodo.mixto > 0 && (
                  <Text style={styles.desgloseLine}>⚖️ Mixto: {formatARS(ingresoPorMetodo.mixto)}</Text>
                )}
                {ingresoPorMetodo.por_cobrar > 0 && (
                  <Text style={styles.desgloseLine}>🕐 Por cobrar: {formatARS(ingresoPorMetodo.por_cobrar)}</Text>
                )}
              </View>
            )}
          </View>
          <View style={styles.statSmallCol}>
            <View style={styles.statSmall}>
              <Text style={styles.statSmallVal}>{totalTurnos}</Text>
              <Text style={styles.statSmallLbl}>Turnos</Text>
            </View>
            <View style={styles.statSmall}>
              <Text style={[styles.statSmallVal, { color: colors.warning }]}>{totalPendientes}</Text>
              <Text style={styles.statSmallLbl}>Pendientes</Text>
            </View>
          </View>
        </View>

        {/* Estado: sin agenda configurada → CTA para crear */}
        {!loading && tieneAgenda === false && (
          <View style={styles.setupCard}>
            <View style={styles.setupIconWrap}>
              <Ionicons name="calendar-outline" size={48} color={colors.primary} />
            </View>
            <Text style={styles.setupTitle}>Configurá tu agenda</Text>
            <Text style={styles.setupDesc}>
              Elegí los días y horarios en los que atendés para que tus clientes puedan reservar turnos con vos.
            </Text>
            <Button
              label="Crear mi agenda"
              onPress={() => router.push('/(profesional)/horarios')}
              fullWidth
              style={{ marginTop: spacing.lg }}
            />
            <Button
              label="Lo hago después"
              variant="ghost"
              onPress={() => setTieneAgenda(true)}
              style={{ marginTop: spacing.xs }}
            />
          </View>
        )}

        {/* ── Agenda diaria (hoy) ── */}
        {(tieneAgenda === true || tieneAgenda === null) && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Hoy</Text>
              <Text style={styles.sectionMeta}>
                {confirmados} confirmados · {items.filter((t) => t.estado === 'pendiente').length} pendientes
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
            ) : items.length === 0 ? (
              <View style={[styles.emptySmall, { backgroundColor: colors.surfaceAlt, borderRadius: 12 }]}>
                <Text style={[styles.emptySmallTxt, { color: colors.muted }]}>
                  Sin turnos para hoy 💆‍♀️
                </Text>
              </View>
            ) : (
              items.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => accionarTurno(t)}
                  style={({ pressed }) => [styles.turnoCard, pressed && { opacity: 0.92 }]}
                >
                  <View style={styles.horaCol}>
                    <Text style={styles.hora}>{t.hora}</Text>
                    <Text style={styles.dur}>{t.duracionMin}'</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.rowSpace}>
                      <Text style={styles.cliente}>{t.clienteNombre}</Text>
                      <Badge label={t.estado} tone={ESTADO_TONE[t.estado]} />
                    </View>
                    <Text style={styles.servicio}>{t.servicioNombre}</Text>
                    <View style={styles.rowSpace}>
                      <Text style={styles.monto}>{formatARS(t.monto)}</Text>
                      <Text style={styles.pago}>
                        {t.metodoPago ? `💳 ${metodoPagoLabel(t.metodoPago)}` : 'Sin cobrar'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        )}

        {/* ── Pendientes de confirmación ── */}
        {pendientesFuturos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Pendientes de confirmación</Text>
              <Badge label={`${pendientesFuturos.length}`} tone="warning" />
            </View>
            {pendientesFuturos.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => accionarTurno(t)}
                style={({ pressed }) => [styles.turnoCard, pressed && { opacity: 0.92 }]}
              >
                <View style={styles.horaCol}>
                  <Text style={styles.hora}>{t.hora}</Text>
                  <Text style={styles.dur}>{t.duracionMin}'</Text>
                </View>
                <View style={styles.divider} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.rowSpace}>
                    <Text style={styles.cliente}>{t.clienteNombre}</Text>
                    <Badge label={t.estado} tone={ESTADO_TONE[t.estado]} />
                  </View>
                  <Text style={styles.servicio}>{t.servicioNombre}</Text>
                  <Text style={[styles.pago, { color: colors.muted }]}>
                    📅 {new Date(t.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                      weekday: 'long', day: '2-digit', month: 'long',
                    })}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Próximos turnos confirmados ── */}
        {proximosTurnos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Próximos turnos</Text>
              <Badge label={`${proximosTurnos.length}`} tone="success" />
            </View>
            {proximosTurnos.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => accionarTurno(t)}
                style={({ pressed }) => [styles.turnoCard, pressed && { opacity: 0.92 }]}
              >
                <View style={styles.horaCol}>
                  <Text style={styles.hora}>{t.hora}</Text>
                  <Text style={styles.dur}>{t.duracionMin}'</Text>
                </View>
                <View style={styles.divider} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.rowSpace}>
                    <Text style={styles.cliente}>{t.clienteNombre}</Text>
                    <Badge label={t.estado} tone={ESTADO_TONE[t.estado]} />
                  </View>
                  <Text style={styles.servicio}>{t.servicioNombre}</Text>
                  <Text style={[styles.pago, { color: colors.muted }]}>
                    📅 {new Date(t.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                      weekday: 'long', day: '2-digit', month: 'long',
                    })}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Tip: solo cuando hay turnos de hoy que gestionar */}
        {items.length > 0 && (
          <View style={styles.tip}>
            <Ionicons name="bulb-outline" size={18} color={colors.primary} />
            <Text style={styles.tipText}>
              Tocá un turno para confirmarlo o registrar el cobro al finalizar.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  headerWrap: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  statCard: {
    flex: 1.4,
    borderRadius: radius.xl,
    padding: spacing.xl,
    justifyContent: 'space-between',
    minHeight: 130,
    ...shadow.card,
  },
  desgloseWrap: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    gap: 2,
  },
  desgloseLine: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '500',
  },
  statSmallCol: { flex: 1, gap: spacing.md },
  statSmall: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
    justifyContent: 'center',
  },
  statLabelLight: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },
  statValueLight: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statSmallVal: { fontSize: 22, fontWeight: '700', color: c.ink },
  statSmallLbl: { fontSize: 11, color: c.muted, marginTop: 2 },
  section: { paddingHorizontal: spacing.xxl, marginTop: spacing.xxl },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: c.ink },
  sectionMeta: { fontSize: 12, color: c.muted },
  turnoCard: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: spacing.sm,
  },
  horaCol: {
    width: 56,
    alignItems: 'flex-start',
  },
  hora: { fontSize: 18, fontWeight: '700', color: c.ink },
  dur: { fontSize: 11, color: c.muted, marginTop: 2 },
  divider: {
    width: 1,
    backgroundColor: c.border,
    marginHorizontal: spacing.md,
  },
  rowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cliente: { fontSize: 15, fontWeight: '600', color: c.ink },
  servicio: { fontSize: 13, color: c.muted },
  monto: { fontSize: 14, fontWeight: '700', color: c.primary },
  pago: { fontSize: 12, color: c.muted },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: c.ink },
  emptyText: { fontSize: 14, color: c.muted, marginTop: 6 },
  emptySmall: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  emptySmallTxt: { fontSize: 14, fontWeight: '500' },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.primaryTint,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.xxl,
    marginHorizontal: spacing.xxl,
  },
  tipText: { fontSize: 13, color: c.primary, fontWeight: '500', flex: 1 },
  editAgendaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.primaryTint,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  editAgendaLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  setupCard: {
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    padding: spacing.xxxl,
    marginHorizontal: spacing.xxl,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: c.border,
  },
  setupIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: c.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  setupDesc: {
    fontSize: 14,
    color: c.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
