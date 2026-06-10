import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { turnosService, valoracionesService, notificacionesService } from '@/services';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import { formatARS, formatFecha } from '@/utils/format';
import type { EstadoTurno, MetodoPago, Turno } from '@/types/models';

export default function MisTurnosScreen() {
  const { colors } = useTheme();
  const { user } = useSession();
  const [items, setItems] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<{ turno: Turno; stars: number } | null>(null);
  const [turnosValorados, setTurnosValorados] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [list, valorados] = await Promise.all([
        turnosService.listarDelCliente(user.id),
        valoracionesService.turnosValoradosPorCliente(user.id).catch(() => new Set<string>()),
      ]);
      // Ordenar: pendiente_pago > pendiente > confirmado > completado > cancelado/no_asistio
      const prioridad: Record<string, number> = {
        pendiente_pago: 0,
        pendiente: 1,
        confirmado: 2,
        completado: 3,
        cancelado: 4,
        no_asistio: 5,
      };
      list.sort((a, b) => (prioridad[a.estado] ?? 9) - (prioridad[b.estado] ?? 9));
      setItems(list);
      setTurnosValorados(valorados);
      // Reprogramar recordatorios locales según los turnos vigentes (no bloquea la UI)
      notificacionesService.sincronizarRecordatorios(list, user.preferencias).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onPagar = (t: Turno) => {
    Alert.alert(
      'Pagar turno',
      `Elegí cómo pagar ${formatARS(t.monto)}`,
      [
        { text: 'Efectivo', onPress: () => marcarPagado(t, 'efectivo') },
        { text: 'Transferencia', onPress: () => marcarPagado(t, 'transferencia') },
        { text: 'MercadoPago', onPress: () => marcarPagado(t, 'mercado_pago') },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  };

  const marcarPagado = async (t: Turno, metodo: MetodoPago) => {
    await turnosService.actualizarEstado(t.id, 'completado', metodo);
    Alert.alert('¡Listo!', 'Pago registrado correctamente.');
    refresh();
  };

  const onCancelar = (t: Turno) => {
    Alert.alert(
      'Cancelar turno',
      `¿Cancelar el turno de ${t.servicioNombre} el ${formatFecha(t.fecha)}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            await turnosService.cancelar(t.id);
            refresh();
          },
        },
      ],
    );
  };

  const onReprogramar = (_t: Turno) => {
    Alert.alert(
      'Reprogramar turno',
      'Pronto vas a poder elegir un nuevo horario sin necesidad de cancelar y reservar de nuevo.',
    );
  };

  const onPagarSena = (t: Turno) => {
    Alert.alert(
      'Pagar seña',
      `Abonar ${formatARS(t.montoSena ?? 0)} con MercadoPago para confirmar tu turno.`,
      [
        {
          text: 'Pagar con MercadoPago',
          onPress: async () => {
            // TODO: Integrar MercadoPago Checkout Pro
            await turnosService.confirmarPagoSena(t.id);
            Alert.alert('¡Seña pagada!', 'Tu turno fue confirmado.');
            refresh();
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  };

  const onPuntuar = (t: Turno) => {
    setRating({ turno: t, stars: 5 });
  };

  const guardarRating = async () => {
    if (!rating || !user) return;
    try {
      await valoracionesService.crear({
        profesionalId: rating.turno.profesionalId,
        clienteId: user.id,
        clienteNombre: user.nombre ?? '',
        turnoId: rating.turno.id,
        puntuacion: rating.stars as 1 | 2 | 3 | 4 | 5,
        fecha: new Date().toISOString().slice(0, 10),
      });
      Alert.alert('¡Gracias!', `Calificaste con ${rating.stars} estrellas.`);
      setTurnosValorados((prev) => new Set(prev).add(rating.turno.id));
    } catch (e: any) {
      Alert.alert('Aviso', e.message ?? 'No se pudo guardar la valoración.');
    } finally {
      setRating(null);
    }
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          eyebrow="Tu agenda personal"
          title="Mis turnos"
          subtitle="Recordatorios automáticos · 24h y 2h antes"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: spacing.xxl, gap: spacing.md }}
          renderItem={({ item }) => (
            <TurnoCard
              turno={item}
              yaValorado={turnosValorados.has(item.id)}
              onPagar={() => onPagar(item)}
              onPagarSena={() => onPagarSena(item)}
              onCancelar={() => onCancelar(item)}
              onReprogramar={() => onReprogramar(item)}
              onPuntuar={() => onPuntuar(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Todavía no reservaste turnos</Text>
              <Text style={styles.emptyText}>
                Buscá una profesional cerca tuyo y reservá en un toque.
              </Text>
            </View>
          }
        />
      )}

      <RatingModal
        visible={!!rating}
        stars={rating?.stars ?? 5}
        onChange={(s) => rating && setRating({ ...rating, stars: s })}
        onClose={() => setRating(null)}
        onSubmit={guardarRating}
        servicio={rating?.turno.servicioNombre ?? ''}
      />
    </SafeAreaView>
  );
}

/* ───────────── Card con acciones por estado ───────────── */

function TurnoCard({
  turno,
  yaValorado,
  onPagar,
  onPagarSena,
  onCancelar,
  onReprogramar,
  onPuntuar,
}: {
  turno: Turno;
  yaValorado: boolean;
  onPagar: () => void;
  onPagarSena: () => void;
  onCancelar: () => void;
  onReprogramar: () => void;
  onPuntuar: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const ya_pagado = turno.estado === 'completado';

  const renderAcciones = () => {
    if (turno.estado === 'pendiente_pago') {
      return (
        <>
          <ActionBtn icon="card-outline" label={`Pagar seña ${formatARS(turno.montoSena ?? 0)}`} onPress={onPagarSena} primary />
          <ActionBtn icon="close-outline" label="Cancelar" onPress={onCancelar} danger />
        </>
      );
    }
    if (ya_pagado) {
      return yaValorado ? (
        <View style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.bone3 }]}>
          <Ionicons name="star" size={14} color={colors.warning} />
          <Text style={[styles.actionLabel, { color: colors.muted }]}>Ya valorado</Text>
        </View>
      ) : (
        <ActionBtn icon="star-outline" label="Puntuar" onPress={onPuntuar} primary />
      );
    }
    if (turno.estado === 'cancelado' || turno.estado === 'no_asistio') return null;
    // Si tiene seña pendiente de pago, mostrar "Pagar seña"
    const senaPendiente = (turno.montoSena ?? 0) > 0 && !turno.senaPagada;
    return (
      <>
        {senaPendiente ? (
          <ActionBtn icon="card-outline" label={`Pagar seña ${formatARS(turno.montoSena ?? 0)}`} onPress={onPagarSena} primary />
        ) : (
          <ActionBtn icon="card-outline" label="Pagar" onPress={onPagar} primary />
        )}
        <ActionBtn icon="calendar-outline" label="Reprogramar" onPress={onReprogramar} />
        <ActionBtn icon="close-outline" label="Cancelar" onPress={onCancelar} danger />
      </>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{turno.servicioNombre}</Text>
        <Badge label={badgeLabel(turno.estado)} tone={badgeTone(turno.estado)} />
      </View>
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={16} color={colors.muted} />
        <Text style={styles.meta}>
          {formatFecha(turno.fecha)} · {turno.hora}
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="cash-outline" size={16} color={colors.muted} />
        <Text style={styles.meta}>
          {formatARS(turno.monto)}
          {turno.metodoPago ? ` · ${turno.metodoPago.replace('_', ' ')}` : ''}
        </Text>
      </View>

      {/* Acciones */}
      <View style={styles.actionsRow}>
        {renderAcciones()}
      </View>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
  primary,
  danger,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const bg = primary ? colors.ink : danger ? 'transparent' : colors.background;
  const fg = primary ? colors.surface : danger ? colors.danger : colors.ink;
  const border = primary ? colors.ink : danger ? colors.danger : colors.bone3;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: bg, borderColor: border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons name={icon} size={14} color={fg} />
      <Text style={[styles.actionLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

function badgeLabel(estado: EstadoTurno): string {
  if (estado === 'pendiente_pago') return 'Pendiente de pago';
  return estado;
}

function badgeTone(estado: EstadoTurno) {
  switch (estado) {
    case 'confirmado':
      return 'success' as const;
    case 'pendiente':
      return 'warning' as const;
    case 'pendiente_pago':
      return 'warning' as const;
    case 'completado':
      return 'info' as const;
    case 'cancelado':
    case 'no_asistio':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
}

/* ───────────── Modal de rating ───────────── */

function RatingModal({
  visible,
  stars,
  onChange,
  onClose,
  onSubmit,
  servicio,
}: {
  visible: boolean;
  stars: number;
  onChange: (s: number) => void;
  onClose: () => void;
  onSubmit: () => void;
  servicio: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.ratingWrap} pointerEvents="box-none">
        <View style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>¿Cómo estuvo tu experiencia?</Text>
          <Text style={styles.ratingSub}>{servicio}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
                <Ionicons
                  name={n <= stars ? 'star' : 'star-outline'}
                  size={36}
                  color={colors.warning}
                />
              </Pressable>
            ))}
          </View>
          <View style={{ height: spacing.md }} />
          <Button variant="dark" label="Enviar reseña" fullWidth onPress={onSubmit} />
          <Pressable onPress={onClose} style={{ alignItems: 'center', paddingVertical: spacing.md }}>
            <Text style={{ color: colors.muted, fontSize: 14 }}>Más tarde</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  headerWrap: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: c.border,
    gap: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: c.ink, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { fontSize: 14, color: c.muted, textTransform: 'capitalize' },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: c.ink },
  emptyText: { fontSize: 14, color: c.muted, marginTop: 6, textAlign: 'center' },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  actionLabel: { fontSize: 13, fontWeight: '600' },
  // rating modal
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 36, 0.5)',
  },
  ratingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  ratingCard: {
    width: '100%',
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  ratingTitle: { fontSize: 18, fontWeight: '700', color: c.ink, textAlign: 'center' },
  ratingSub: { fontSize: 13, color: c.muted, marginTop: 6, textAlign: 'center' },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
