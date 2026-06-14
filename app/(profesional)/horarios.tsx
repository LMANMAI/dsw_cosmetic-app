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
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { disponibilidadService } from '@/services/disponibilidad.service';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import type { Franja } from '@/types/models';

/* ─── Constantes ─── */

const DIAS_SEMANA = [
  { valor: 1, nombre: 'Lunes',     corto: 'Lun' },
  { valor: 2, nombre: 'Martes',    corto: 'Mar' },
  { valor: 3, nombre: 'Miércoles', corto: 'Mié' },
  { valor: 4, nombre: 'Jueves',    corto: 'Jue' },
  { valor: 5, nombre: 'Viernes',   corto: 'Vie' },
  { valor: 6, nombre: 'Sábado',    corto: 'Sáb' },
  { valor: 0, nombre: 'Domingo',   corto: 'Dom' },
] as const;

// Todas las medias horas del día: 00:00 a 23:30
const HORAS_OPCIONES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

// Grupos de 6 horas para que el selector sea navegable
const GRUPOS_HORARIOS = [
  { label: 'Madrugada (00 a 06)', desde: 0, hasta: 6 },
  { label: 'Mañana (06 a 12)', desde: 6, hasta: 12 },
  { label: 'Tarde (12 a 18)', desde: 12, hasta: 18 },
  { label: 'Noche (18 a 24)', desde: 18, hasta: 24 },
] as const;

const FRANJA_DEFAULT: Franja = { horaInicio: '09:00', horaFin: '18:00' };

interface DiaConfig {
  activo: boolean;
  franjas: Franja[];
}

type AgendaState = Record<number, DiaConfig>;

const buildInitialState = (): AgendaState => {
  const state: AgendaState = {};
  DIAS_SEMANA.forEach((d) => {
    state[d.valor] = { activo: false, franjas: [{ ...FRANJA_DEFAULT }] };
  });
  return state;
};

/* ─── Selector de hora ─── */

function HoraPicker({
  label,
  value,
  opciones,
  onSelect,
  colors,
}: {
  label: string;
  value: string;
  opciones: string[];
  onSelect: (h: string) => void;
  colors: ThemeColors;
}) {
  const mostrarHorasDelGrupo = (desde: number, hasta: number) => {
    const horas = opciones.filter((h) => {
      const [hh] = h.split(':').map(Number);
      return hh >= desde && hh < hasta;
    });
    Alert.alert(label, 'Seleccioná el horario', [
      ...horas.map((h) => ({ text: h, onPress: () => onSelect(h) })),
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const mostrarOpciones = () => {
    Alert.alert(label, 'Elegí la franja del día', [
      ...GRUPOS_HORARIOS.map((g) => ({
        text: g.label,
        onPress: () => mostrarHorasDelGrupo(g.desde, g.hasta),
      })),
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <Pressable
      onPress={mostrarOpciones}
      style={[
        pickerStyles.picker,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
      ]}
    >
      <Text style={[pickerStyles.label, { color: colors.muted }]}>{label}</Text>
      <Text style={[pickerStyles.value, { color: colors.ink }]}>{value}</Text>
      <Ionicons name="chevron-down" size={14} color={colors.muted} />
    </Pressable>
  );
}

const pickerStyles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  label: { fontSize: 12, fontWeight: '600' },
  value: { fontSize: 16, fontWeight: '700' },
});

/* ─── Pantalla principal ─── */

export default function HorariosScreen() {
  const { colors } = useTheme();
  const { user } = useSession();
  const router = useRouter();
  const profesionalId = user?.id ?? '';

  const [agenda, setAgenda] = useState<AgendaState>(buildInitialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cargar disponibilidad existente
  useEffect(() => {
    disponibilidadService.listar(profesionalId).then((dias) => {
      if (dias.length > 0) {
        const state = buildInitialState();
        dias.forEach((d) => {
          state[d.diaSemana] = { activo: true, franjas: d.franjas };
        });
        setAgenda(state);
      }
      setLoading(false);
    });
  }, [profesionalId]);

  /* ── Handlers ── */

  const toggleDia = useCallback((dia: number) => {
    setAgenda((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], activo: !prev[dia].activo },
    }));
  }, []);

  const setFranja = useCallback(
    (dia: number, idx: number, campo: keyof Franja, valor: string) => {
      setAgenda((prev) => {
        const franjas = prev[dia].franjas.map((f, i) =>
          i === idx ? { ...f, [campo]: valor } : f,
        );
        return { ...prev, [dia]: { ...prev[dia], franjas } };
      });
    },
    [],
  );

  const agregarFranja = useCallback((dia: number) => {
    setAgenda((prev) => {
      const ultima = prev[dia].franjas[prev[dia].franjas.length - 1];
      // Sugerir inicio 2 h después del fin de la última franja
      const [hh, mm] = ultima.horaFin.split(':').map(Number);
      const nuevaInicio = Math.min(hh + 2, 21);
      const nuevaFin = Math.min(nuevaInicio + 2, 23);
      const pad = (n: number) => String(n).padStart(2, '0');
      const nueva: Franja = {
        horaInicio: `${pad(nuevaInicio)}:${pad(mm)}`,
        horaFin: `${pad(nuevaFin)}:${pad(mm)}`,
      };
      return {
        ...prev,
        [dia]: { ...prev[dia], franjas: [...prev[dia].franjas, nueva] },
      };
    });
  }, []);

  const eliminarFranja = useCallback((dia: number, idx: number) => {
    setAgenda((prev) => {
      const franjas = prev[dia].franjas.filter((_, i) => i !== idx);
      return { ...prev, [dia]: { ...prev[dia], franjas } };
    });
  }, []);

  /* ── Validación ── */

  const diasActivos = useMemo(
    () => Object.values(agenda).filter((d) => d.activo).length,
    [agenda],
  );

  const validar = (): boolean => {
    if (diasActivos === 0) {
      Alert.alert('Sin días', 'Activá al menos un día de la semana para guardar tu agenda.');
      return false;
    }
    for (const d of DIAS_SEMANA) {
      const config = agenda[d.valor];
      if (!config.activo) continue;
      for (let i = 0; i < config.franjas.length; i++) {
        const f = config.franjas[i];
        if (f.horaInicio >= f.horaFin) {
          Alert.alert(
            'Horario inválido',
            `La franja ${i + 1} del ${d.nombre} tiene el cierre antes de la apertura.`,
          );
          return false;
        }
        // Verificar que no se solapen con la franja anterior
        if (i > 0 && f.horaInicio < config.franjas[i - 1].horaFin) {
          Alert.alert(
            'Franjas solapadas',
            `Las franjas ${i} y ${i + 1} del ${d.nombre} se superponen.`,
          );
          return false;
        }
      }
    }
    return true;
  };

  /* ── Guardar ── */

  const guardar = async () => {
    if (!validar()) return;
    setSaving(true);
    const slots = DIAS_SEMANA.filter((d) => agenda[d.valor].activo).map((d) => ({
      diaSemana: d.valor as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      franjas: agenda[d.valor].franjas,
    }));
    await disponibilidadService.guardar(profesionalId, slots);
    setSaving(false);
    Alert.alert('Agenda guardada', 'Tus horarios ya están disponibles para tus clientes.', [
      { text: 'Genial', onPress: () => router.navigate('/(profesional)/perfil') },
    ]);
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.huge }}>
        {/* Header con botón atrás */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.navigate('/(profesional)/perfil')} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <ScreenHeader
            eyebrow="Configuración"
            title="Horarios laborales"
            subtitle="Elegí los días y franjas en los que atendés. Podés tener más de una franja por día."
          />

          {/* Resumen */}
          <View style={styles.summaryCard}>
            <Ionicons name="calendar" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>
                {diasActivos === 0
                  ? 'Ningún día seleccionado'
                  : `${diasActivos} ${diasActivos === 1 ? 'día' : 'días'} de atención`}
              </Text>
              <Text style={styles.summaryDesc}>
                {diasActivos === 0
                  ? 'Activá los días en los que trabajás'
                  : 'Tocá cada día para ajustar los horarios'}
              </Text>
            </View>
          </View>

          {/* Lista de días */}
          <View style={styles.diasContainer}>
            {DIAS_SEMANA.map((dia) => {
              const config = agenda[dia.valor];
              return (
                <View key={dia.valor} style={styles.diaCard}>
                  {/* Toggle del día */}
                  <Pressable
                    onPress={() => toggleDia(dia.valor)}
                    style={[
                      styles.diaHeader,
                      config.activo && { backgroundColor: colors.primaryTint },
                    ]}
                  >
                    <View
                      style={[
                        styles.diaCheck,
                        {
                          backgroundColor: config.activo ? colors.primary : colors.surfaceAlt,
                          borderColor: config.activo ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {config.activo && (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.diaNombre,
                        { color: config.activo ? colors.ink : colors.muted },
                      ]}
                    >
                      {dia.nombre}
                    </Text>
                    {config.activo && (
                      <Text style={[styles.diaResumen, { color: colors.primary }]}>
                        {config.franjas.length} {config.franjas.length === 1 ? 'franja' : 'franjas'}
                      </Text>
                    )}
                  </Pressable>

                  {/* Franjas (solo si el día está activo) */}
                  {config.activo && (
                    <View style={styles.franjasWrap}>
                      {config.franjas.map((franja, idx) => (
                        <View key={idx} style={styles.franjaRow}>
                          {/* Número de franja */}
                          <View style={[styles.franjaNum, { backgroundColor: colors.primaryTint }]}>
                            <Text style={[styles.franjaNumTxt, { color: colors.primary }]}>
                              {idx + 1}
                            </Text>
                          </View>

                          {/* Pickers */}
                          <View style={{ flex: 1 }}>
                            <View style={styles.pickersRow}>
                              <View style={{ flex: 1 }}>
                                <HoraPicker
                                  label="Desde"
                                  value={franja.horaInicio}
                                  opciones={HORAS_OPCIONES}
                                  onSelect={(h) => setFranja(dia.valor, idx, 'horaInicio', h)}
                                  colors={colors}
                                />
                              </View>
                              <Ionicons name="arrow-forward" size={16} color={colors.muted} />
                              <View style={{ flex: 1 }}>
                                <HoraPicker
                                  label="Hasta"
                                  value={franja.horaFin}
                                  opciones={HORAS_OPCIONES}
                                  onSelect={(h) => setFranja(dia.valor, idx, 'horaFin', h)}
                                  colors={colors}
                                />
                              </View>
                            </View>
                          </View>

                          {/* Botón eliminar franja (solo si hay más de una) */}
                          {config.franjas.length > 1 && (
                            <Pressable
                              onPress={() => eliminarFranja(dia.valor, idx)}
                              hitSlop={8}
                              style={[styles.deleteBtn, { borderColor: colors.border }]}
                            >
                              <Ionicons name="trash-outline" size={16} color={colors.danger} />
                            </Pressable>
                          )}
                        </View>
                      ))}

                      {/* Botón agregar franja */}
                      <Pressable
                        onPress={() => agregarFranja(dia.valor)}
                        style={[styles.addFranjaBtn, { borderColor: colors.primary }]}
                      >
                        <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                        <Text style={[styles.addFranjaTxt, { color: colors.primary }]}>
                          Agregar franja
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Tip */}
          <View style={styles.tip}>
            <Ionicons name="bulb-outline" size={18} color={colors.primary} />
            <Text style={styles.tipText}>
              Útil si hacés un descanso al mediodía. Podés agregar tantas franjas como necesites por día.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Botón guardar fijo abajo */}
      <View style={styles.bottomBar}>
        <Button
          label={saving ? 'Guardando...' : 'Guardar agenda'}
          onPress={guardar}
          loading={saving}
          disabled={diasActivos === 0}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

/* ─── Estilos ─── */

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    content: { paddingHorizontal: spacing.xxl },

    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.xxl,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: spacing.xxl,
    },
    summaryTitle: { fontSize: 16, fontWeight: '700', color: c.ink },
    summaryDesc: { fontSize: 13, color: c.muted, marginTop: 4 },

    diasContainer: { gap: spacing.md },

    diaCard: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    diaHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
    },
    diaCheck: {
      width: 28,
      height: 28,
      borderRadius: 8,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    diaNombre: { fontSize: 16, fontWeight: '600', flex: 1 },
    diaResumen: { fontSize: 13, fontWeight: '600' },

    franjasWrap: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xl,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.border,
      gap: spacing.md,
    },

    franjaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    franjaNum: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    franjaNumTxt: { fontSize: 12, fontWeight: '700' },

    pickersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },

    deleteBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    addFranjaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      alignSelf: 'flex-start',
      marginTop: spacing.xs,
    },
    addFranjaTxt: { fontSize: 13, fontWeight: '600' },

    tip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.primaryTint,
      padding: spacing.lg,
      borderRadius: radius.lg,
      marginTop: spacing.xxl,
    },
    tipText: { fontSize: 13, color: c.primary, fontWeight: '500', flex: 1 },

    bottomBar: {
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.background,
    },
  });
