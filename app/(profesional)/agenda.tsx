import React, { useEffect, useMemo, useState } from 'react';
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
import { turnosService } from '@/services';
import type { EstadoTurno, MetodoPago, Turno } from '@/types/models';
import { Badge } from '@/components/Badge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { colors, radius, spacing, shadow } from '@/theme';
import { formatARS, metodoPagoLabel } from '@/utils/format';

const ESTADO_TONE: Record<EstadoTurno, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  confirmado: 'success',
  pendiente: 'warning',
  completado: 'info',
  cancelado: 'danger',
  no_asistio: 'danger',
};

export default function AgendaScreen() {
  const { user } = useSession();
  const profesionalId = user?.id === 'u-pro-1' ? 'pro-1' : 'pro-1'; // demo
  const [items, setItems] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const todayISO = new Date().toISOString().slice(0, 10);

  const cargar = () => {
    setLoading(true);
    turnosService
      .listarDelProfesional(profesionalId, todayISO)
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, [profesionalId]);

  const ingresos = useMemo(
    () =>
      items
        .filter((t) => t.estado === 'completado' || t.estado === 'confirmado')
        .reduce((acc, t) => acc + t.monto, 0),
    [items],
  );
  const confirmados = items.filter((t) => t.estado === 'confirmado').length;
  const pendientes = items.filter((t) => t.estado === 'pendiente').length;

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
          />
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.rose }]}>
            <Text style={styles.statLabelLight}>Ingresos del día</Text>
            <Text style={styles.statValueLight}>{formatARS(ingresos)}</Text>
          </View>
          <View style={styles.statSmallCol}>
            <View style={styles.statSmall}>
              <Text style={styles.statSmallVal}>{items.length}</Text>
              <Text style={styles.statSmallLbl}>Turnos</Text>
            </View>
            <View style={styles.statSmall}>
              <Text style={[styles.statSmallVal, { color: colors.warning }]}>{pendientes}</Text>
              <Text style={styles.statSmallLbl}>Pendientes</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Agenda diaria</Text>
            <Text style={styles.sectionMeta}>
              {confirmados} confirmados · {pendientes} pendientes
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.rose} style={{ marginTop: spacing.xxl }} />
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Sin turnos para hoy</Text>
              <Text style={styles.emptyText}>Disfrutá tu día libre 💆‍♀️</Text>
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

        <View style={styles.tip}>
          <Ionicons name="bulb-outline" size={18} color={colors.rose} />
          <Text style={styles.tipText}>
            Tocá un turno para confirmarlo o registrar el cobro al finalizar.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bone },
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
  statSmallCol: { flex: 1, gap: spacing.md },
  statSmall: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  statLabelLight: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },
  statValueLight: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statSmallVal: { fontSize: 22, fontWeight: '700', color: colors.ink },
  statSmallLbl: { fontSize: 11, color: colors.muted, marginTop: 2 },
  section: { paddingHorizontal: spacing.xxl, marginTop: spacing.xxl },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  sectionMeta: { fontSize: 12, color: colors.muted },
  turnoCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  horaCol: {
    width: 56,
    alignItems: 'flex-start',
  },
  hora: { fontSize: 18, fontWeight: '700', color: colors.ink },
  dur: { fontSize: 11, color: colors.muted, marginTop: 2 },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  rowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cliente: { fontSize: 15, fontWeight: '600', color: colors.ink },
  servicio: { fontSize: 13, color: colors.muted },
  monto: { fontSize: 14, fontWeight: '700', color: colors.rose },
  pago: { fontSize: 12, color: colors.muted },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  emptyText: { fontSize: 14, color: colors.muted, marginTop: 6 },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.roseTint,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.xxl,
    marginHorizontal: spacing.xxl,
  },
  tipText: { fontSize: 13, color: colors.rose, fontWeight: '500', flex: 1 },
});
