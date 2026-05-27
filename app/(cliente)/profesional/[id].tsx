import React, { useEffect, useState, useMemo } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { profesionalesService, turnosService } from '@/services';
import { disponibilidadService } from '@/services/disponibilidad.service';
import type { Disponibilidad, PerfilProfesional, Servicio } from '@/types/models';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { useSession } from '@/context/SessionContext';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import { formatARS } from '@/utils/format';

const NOMBRE_DIA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const NOMBRE_DIA_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Genera las próximas N fechas que coinciden con los días de disponibilidad. */
function generarProximasFechas(disponibilidad: Disponibilidad[], cantidad = 7): { fecha: Date; diaSemana: number }[] {
  if (disponibilidad.length === 0) return [];

  const fechas: { fecha: Date; diaSemana: number }[] = [];
  const diasDisponibles = new Set(disponibilidad.map((d) => d.diaSemana));
  const hoy = new Date();
  let cursor = new Date(hoy);
  cursor.setDate(cursor.getDate() + 1); // empezamos desde mañana

  const MAX_ITER = 90; // seguridad: nunca más de 90 días hacia adelante
  let iter = 0;
  while (fechas.length < cantidad && iter < MAX_ITER) {
    const dia = cursor.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    if (diasDisponibles.has(dia)) {
      fechas.push({ fecha: new Date(cursor), diaSemana: dia });
    }
    cursor.setDate(cursor.getDate() + 1);
    iter++;
  }
  return fechas;
}

export default function PerfilProfesionalScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user } = useSession();
  const { colors } = useTheme();
  const [profesional, setProfesional] = useState<PerfilProfesional | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([]);
  const [servicioElegido, setServicioElegido] = useState<Servicio | null>(null);
  const [fechaElegida, setFechaElegida] = useState<{ fecha: Date; diaSemana: number } | null>(null);
  const [horarioElegido, setHorarioElegido] = useState<string | null>(null);
  const [slotsDisponibles, setSlotsDisponibles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reservando, setReservando] = useState(false);

  // Cargar profesional, servicios y disponibilidad
  useEffect(() => {
    if (!id) {
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      profesionalesService.obtenerPorId(id),
      profesionalesService.listarServiciosDe(id),
      disponibilidadService.listar(id),
    ])
      .then(([p, s, d]) => {
        setProfesional(p);
        setServicios(s);
        setDisponibilidad(d);
        setServicioElegido(s[0] ?? null);
        if (d.length > 0) {
          const proximas = generarProximasFechas(d, 7);
          if (proximas.length > 0) setFechaElegida(proximas[0]);
        }
      })
      .catch((err) => {
        console.log('Error cargando profesional:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Calcular slots cuando cambia el servicio o el día elegido
  useEffect(() => {
    if (!id || !servicioElegido || !fechaElegida) {
      setSlotsDisponibles([]);
      return;
    }
    const fechaISO = fechaElegida.fecha.toISOString().slice(0, 10);
    disponibilidadService
      .horariosDisponibles(id, fechaElegida.diaSemana, servicioElegido.duracionMin, fechaISO)
      .then(setSlotsDisponibles)
      .catch(() => setSlotsDisponibles([]));
    setHorarioElegido(null); // resetear horario al cambiar día/servicio
  }, [id, servicioElegido?.id, fechaElegida?.diaSemana]);

  // Próximas fechas disponibles
  const proximasFechas = useMemo(
    () => disponibilidad.length === 0 ? [] : generarProximasFechas(disponibilidad, 7),
    [disponibilidad],
  );

  // Cálculo de seña (20% del servicio)
  const porcentajeAnticipo = 0.2;
  const montoSena = servicioElegido ? Math.round(servicioElegido.precio * porcentajeAnticipo) : 0;

  const reservar = async () => {
    if (!profesional || !servicioElegido || !horarioElegido || !fechaElegida || !user) return;
    setReservando(true);
    try {
      const fechaISO = fechaElegida.fecha.toISOString().slice(0, 10);
      await turnosService.reservar({
        clienteId: user.id,
        clienteNombre: user.nombre,
        profesionalId: profesional.id,
        servicioId: servicioElegido.id,
        servicioNombre: servicioElegido.nombre,
        fecha: fechaISO,
        hora: horarioElegido,
        duracionMin: servicioElegido.duracionMin,
        monto: servicioElegido.precio,
      });
      Alert.alert(
        '¡Turno reservado!',
        `${servicioElegido.nombre} el ${NOMBRE_DIA_LARGO[fechaElegida.diaSemana]} ${fechaElegida.fecha.getDate()}/${fechaElegida.fecha.getMonth() + 1} a las ${horarioElegido}.\n\nSeña: ${formatARS(montoSena)}`,
        [{ text: 'Ver mis turnos', onPress: () => router.replace('/(cliente)/turnos') }],
      );
    } finally {
      setReservando(false);
    }
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (error || !profesional) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.empty}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.ink }]}>Profesional no encontrado</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            No pudimos cargar este perfil. Intentá de nuevo.
          </Text>
          <Button label="Volver" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={'#FFFFFF'} />
          </Pressable>
          <View style={styles.heroBg} />
          <View style={styles.heroContent}>
            <Avatar nombre={profesional.nombre} size={88} />
            <Text style={styles.heroName}>{profesional.nombre}</Text>
            <Text style={styles.heroZona}>📍 {profesional.zona}{profesional.distanciaKm != null ? ` · ${profesional.distanciaKm}km` : ''}</Text>
            <View style={styles.heroStats}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>⭐ {profesional.rating}</Text>
                <Text style={styles.statLabel}>{profesional.reviews} reseñas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{servicios.length}</Text>
                <Text style={styles.statLabel}>servicios</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Badge label="Verificada" tone="success" />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre {profesional.nombre.split(' ')[0]}</Text>
          <Text style={styles.descripcion}>{profesional.descripcion}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servicios y precios</Text>
          {servicios.map((s) => {
            const elegido = servicioElegido?.id === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setServicioElegido(s)}
                style={[styles.servicio, elegido && styles.servicioActivo]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.servicioNombre}>{s.nombre}</Text>
                  <Text style={styles.servicioMeta}>{s.duracionMin} min</Text>
                </View>
                <Text style={styles.servicioPrecio}>{formatARS(s.precio)}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Selección de día */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Elegí un día</Text>
          {disponibilidad.length === 0 ? (
            <View style={styles.sinDisponibilidad}>
              <Ionicons name="calendar-outline" size={28} color={colors.muted} />
              <Text style={styles.sinDisponibilidadTxt}>
                Esta profesional aún no configuró sus horarios de atención.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.xxl, paddingHorizontal: spacing.xxl }}>
              <View style={styles.diasRow}>
                {proximasFechas.map((item, idx) => {
                  const elegido = fechaElegida?.fecha.toISOString().slice(0, 10) === item.fecha.toISOString().slice(0, 10);
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => setFechaElegida(item)}
                      style={[styles.diaChip, elegido && styles.diaChipActivo]}
                    >
                      <Text style={[styles.diaChipDia, elegido && styles.diaChipTxtActivo]}>
                        {NOMBRE_DIA_CORTO[item.diaSemana]}
                      </Text>
                      <Text style={[styles.diaChipFecha, elegido && styles.diaChipTxtActivo]}>
                        {item.fecha.getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Selección de horario */}
        {fechaElegida && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Horarios disponibles — {NOMBRE_DIA_LARGO[fechaElegida.diaSemana]} {fechaElegida.fecha.getDate()}/{fechaElegida.fecha.getMonth() + 1}
            </Text>
            {slotsDisponibles.length === 0 ? (
              <Text style={styles.sinSlots}>No hay horarios disponibles para este día.</Text>
            ) : (
              <View style={styles.horariosGrid}>
                {slotsDisponibles.map((h) => {
                  const elegido = horarioElegido === h;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => setHorarioElegido(h)}
                      style={[styles.hora, elegido && styles.horaActiva]}
                    >
                      <Text style={[styles.horaTxt, elegido && styles.horaTxtActiva]}>{h}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.footerLabel}>Servicio: {servicioElegido ? formatARS(servicioElegido.precio) : '—'}</Text>
          <View style={styles.footerRow}>
            <Text style={styles.footerTotal}>
              Seña: {montoSena > 0 ? formatARS(montoSena) : '—'}
            </Text>
            {montoSena > 0 && (
              <Text style={styles.footerPct}>(20%)</Text>
            )}
          </View>
        </View>
        <Button
          label={horarioElegido ? `Reservar ${horarioElegido}` : 'Elegí un horario'}
          onPress={reservar}
          loading={reservando}
          disabled={!horarioElegido || !servicioElegido || !fechaElegida}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  header: {
    backgroundColor: c.navy,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    overflow: 'hidden',
  },
  heroBg: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(184, 73, 104, 0.18)',
    right: -200,
    top: -150,
  },
  heroContent: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  heroName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: spacing.md,
  },
  heroZona: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
  },
  statBox: { alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.15)' },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.ink,
    marginBottom: spacing.lg,
  },
  descripcion: {
    fontSize: 15,
    color: c.muted,
    lineHeight: 22,
  },
  servicio: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: spacing.sm,
  },
  servicioActivo: {
    borderColor: c.primary,
    backgroundColor: c.primaryTint,
  },
  servicioNombre: { fontSize: 15, fontWeight: '600', color: c.ink },
  servicioMeta: { fontSize: 12, color: c.muted, marginTop: 2 },
  servicioPrecio: { fontSize: 16, fontWeight: '700', color: c.primary },
  sinDisponibilidad: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
  },
  sinDisponibilidadTxt: {
    fontSize: 14,
    color: c.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  diasRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  diaChip: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    minWidth: 60,
  },
  diaChipActivo: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  diaChipDia: {
    fontSize: 12,
    fontWeight: '600',
    color: c.muted,
  },
  diaChipFecha: {
    fontSize: 18,
    fontWeight: '700',
    color: c.ink,
    marginTop: 2,
  },
  diaChipTxtActivo: {
    color: '#FFFFFF',
  },
  sinSlots: {
    fontSize: 14,
    color: c.muted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  horariosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hora: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    minWidth: 84,
    alignItems: 'center',
  },
  horaActiva: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  horaTxt: { fontSize: 14, fontWeight: '600', color: c.ink },
  horaTxtActiva: { color: '#FFFFFF' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: c.surface,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  footerLabel: { fontSize: 12, color: c.muted, fontWeight: '500' },
  footerRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  footerTotal: { fontSize: 22, fontWeight: '700', color: c.ink },
  footerPct: { fontSize: 12, color: c.muted, fontWeight: '500' },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
