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
import { useTheme, radius, spacing, shadow } from '@/theme';
import type { ThemeColors } from '@/theme';

/* ─── Constantes ─── */

const DIAS_SEMANA = [
  { valor: 1, nombre: 'Lunes', corto: 'Lun' },
  { valor: 2, nombre: 'Martes', corto: 'Mar' },
  { valor: 3, nombre: 'Miércoles', corto: 'Mié' },
  { valor: 4, nombre: 'Jueves', corto: 'Jue' },
  { valor: 5, nombre: 'Viernes', corto: 'Vie' },
  { valor: 6, nombre: 'Sábado', corto: 'Sáb' },
  { valor: 0, nombre: 'Domingo', corto: 'Dom' },
] as const;

const HORAS_OPCIONES = Array.from({ length: 30 }, (_, i) => {
  const totalMin = 7 * 60 + i * 30; // desde 07:00 cada 30 min
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}).filter((h) => {
  const [hh] = h.split(':').map(Number);
  return hh <= 22; // hasta 22:00
});

interface DiaConfig {
  activo: boolean;
  horaInicio: string;
  horaFin: string;
}

type AgendaState = Record<number, DiaConfig>;

const defaultDia = (): DiaConfig => ({
  activo: false,
  horaInicio: '09:00',
  horaFin: '18:00',
});

const buildInitialState = (): AgendaState => {
  const state: AgendaState = {};
  DIAS_SEMANA.forEach((d) => {
    state[d.valor] = defaultDia();
  });
  return state;
};

/* ─── Componente selector de hora ─── */

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
  const mostrarOpciones = () => {
    const buttons = opciones.map((h) => ({
      text: h,
      onPress: () => onSelect(h),
    }));
    // Dividir en grupos para que no sea un alert gigante
    Alert.alert(label, 'Seleccioná el horario', [
      ...buttons.slice(0, 8),
      { text: 'Más...', onPress: () => mostrarMas() },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const mostrarMas = () => {
    Alert.alert(label, 'Más horarios', [
      ...opciones.slice(8).map((h) => ({
        text: h,
        onPress: () => onSelect(h),
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
      <Text style={[pickerStyles.pickerLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[pickerStyles.pickerValue, { color: colors.ink }]}>{value}</Text>
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
  pickerLabel: { fontSize: 12, fontWeight: '600' },
  pickerValue: { fontSize: 16, fontWeight: '700' },
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
    disponibilidadService.listar(profesionalId).then((slots) => {
      if (slots.length > 0) {
        const state = buildInitialState();
        slots.forEach((s) => {
          state[s.diaSemana] = {
            activo: true,
            horaInicio: s.horaInicio,
            horaFin: s.horaFin,
          };
        });
        setAgenda(state);
      }
      setLoading(false);
    });
  }, [profesionalId]);

  const toggleDia = useCallback((dia: number) => {
    setAgenda((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], activo: !prev[dia].activo },
    }));
  }, []);

  const setHora = useCallback((dia: number, campo: 'horaInicio' | 'horaFin', valor: string) => {
    setAgenda((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor },
    }));
  }, []);

  const diasActivos = useMemo(
    () => Object.values(agenda).filter((d) => d.activo).length,
    [agenda],
  );

  const validar = (): boolean => {
    if (diasActivos === 0) {
      Alert.alert('Sin días', 'Activá al menos un día de la semana para guardar tu agenda.');
      return false;
    }
    // Validar que horaFin > horaInicio
    for (const d of DIAS_SEMANA) {
      const config = agenda[d.valor];
      if (config.activo && config.horaInicio >= config.horaFin) {
        Alert.alert(
          'Horario inválido',
          `El horario de cierre del ${d.nombre} debe ser posterior al de apertura.`,
        );
        return false;
      }
    }
    return true;
  };

  const guardar = async () => {
    if (!validar()) return;
    setSaving(true);
    const slots = DIAS_SEMANA.filter((d) => agenda[d.valor].activo).map((d) => ({
      diaSemana: d.valor as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      horaInicio: agenda[d.valor].horaInicio,
      horaFin: agenda[d.valor].horaFin,
    }));
    await disponibilidadService.guardar(profesionalId, slots);
    setSaving(false);
    Alert.alert('Agenda guardada', 'Tus horarios ya están disponibles para tus clientes.', [
      { text: 'Genial', onPress: () => router.back() },
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
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <ScreenHeader
            eyebrow="Configuración"
            title="Horarios laborales"
            subtitle="Elegí los días y horarios en los que atendés. Tus clientes solo podrán reservar en estos horarios."
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
                      <Text style={[styles.diaHorario, { color: colors.primary }]}>
                        {config.horaInicio} - {config.horaFin}
                      </Text>
                    )}
                  </Pressable>

                  {/* Pickers de hora (solo si está activo) */}
                  {config.activo && (
                    <View style={styles.horasRow}>
                      <View style={{ flex: 1 }}>
                        <HoraPicker
                          label="Desde"
                          value={config.horaInicio}
                          opciones={HORAS_OPCIONES}
                          onSelect={(h) => setHora(dia.valor, 'horaInicio', h)}
                          colors={colors}
                        />
                      </View>
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={colors.muted}
                      />
                      <View style={{ flex: 1 }}>
                        <HoraPicker
                          label="Hasta"
                          value={config.horaFin}
                          opciones={HORAS_OPCIONES}
                          onSelect={(h) => setHora(dia.valor, 'horaFin', h)}
                          colors={colors}
                        />
                      </View>
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
              Podés modificar estos horarios cuando quieras desde tu perfil.
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
    diaHorario: { fontSize: 13, fontWeight: '600' },

    horasRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.xl,
      marginBottom: spacing.xl,
      marginTop: spacing.sm,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: c.border,
      gap: spacing.lg,
    },

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
