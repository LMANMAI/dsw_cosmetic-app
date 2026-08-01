import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { turnosService } from '@/services';
import { fichasService } from '@/services/fichas.service';
import { useSession } from '@/context/SessionContext';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import type { EstadoTurno, MetodoPago, Turno } from '@/types/models';
import { formatARS, formatFechaLarga } from '@/utils/format';

const ESTADO_TONE: Record<EstadoTurno, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  confirmado: 'success',
  pendiente: 'warning',
  pendiente_pago: 'warning',
  completado: 'info',
  cancelado: 'danger',
  no_asistio: 'danger',
};

/**
 * Detalle de un turno para el profesional. Reemplaza al Alert que había en
 * la agenda: acá se ve la nota que dejó el cliente al reservar, se edita la
 * ficha (contacto y notas permanentes) y se ejecutan las acciones del turno.
 */
export default function TurnoDetalleScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useSession();
  const profesionalId = user?.id ?? '';
  const { turnoId } = useLocalSearchParams<{ turnoId: string }>();

  const [turno, setTurno] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(true);
  const [accionando, setAccionando] = useState(false);

  // Ficha del cliente (contacto + notas permanentes), editable desde acá.
  const [telefono, setTelefono] = useState('');
  const [notasFicha, setNotasFicha] = useState('');
  const [guardandoFicha, setGuardandoFicha] = useState(false);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const cargar = useCallback(() => {
    if (!turnoId) return;
    setLoading(true);
    turnosService
      .obtener(turnoId)
      .then(async (tr) => {
        setTurno(tr);
        if (tr && profesionalId) {
          const ficha = await fichasService
            .obtener(profesionalId, tr.clienteId)
            .catch(() => null);
          setTelefono(ficha?.telefono ?? '');
          setNotasFicha(ficha?.notas ?? '');
        }
      })
      .catch((e: any) =>
        console.error('[turno-detalle] no se pudo cargar:', e?.code ?? '', e?.message ?? e),
      )
      .finally(() => setLoading(false));
  }, [turnoId, profesionalId]);

  useFocusEffect(useCallback(() => cargar(), [cargar]));

  const guardarFicha = async () => {
    if (!turno || !profesionalId) return;
    setGuardandoFicha(true);
    try {
      await fichasService.guardar(profesionalId, turno.clienteId, {
        clienteNombre: turno.clienteNombre,
        telefono: telefono.trim(),
        notas: notasFicha.trim(),
      });
      Alert.alert(t('comun.listo'), t('profesional.ficha.guardadoMsg'));
    } catch {
      Alert.alert(t('comun.error'), t('perfil.compartido.errorGuardarMsg'));
    } finally {
      setGuardandoFicha(false);
    }
  };

  const cambiarEstado = async (estado: EstadoTurno, metodo?: MetodoPago) => {
    if (!turno) return;
    setAccionando(true);
    try {
      await turnosService.actualizarEstado(turno.id, estado, metodo);
      cargar();
    } catch (e: any) {
      Alert.alert(t('comun.error'), e?.message ?? t('perfil.compartido.errorGuardarMsg'));
    } finally {
      setAccionando(false);
    }
  };

  const cobrar = () => {
    if (!turno) return;
    Alert.alert(
      t('profesional.turnoDetalle.registrarCobro'),
      t('profesional.agenda.turnoConfirmadoMsg', {
        nombre: turno.clienteNombre,
        monto: formatARS(turno.monto),
      }),
      [
        { text: t('profesional.agenda.cobrarEfectivo'), onPress: () => cambiarEstado('completado', 'efectivo') },
        { text: t('profesional.agenda.cobrarTransferencia'), onPress: () => cambiarEstado('completado', 'transferencia') },
        { text: t('profesional.agenda.cobrarMP'), onPress: () => cambiarEstado('completado', 'mercado_pago') },
        { text: t('comun.cancelar'), style: 'cancel' },
      ],
    );
  };

  const cancelarTurno = () => {
    if (!turno) return;
    Alert.alert(
      t('profesional.turnoDetalle.cancelarTitulo'),
      t('profesional.turnoDetalle.cancelarMsg', { nombre: turno.clienteNombre }),
      [
        { text: t('comun.cancelar'), style: 'cancel' },
        {
          text: t('profesional.turnoDetalle.cancelarTurno'),
          style: 'destructive',
          onPress: async () => {
            setAccionando(true);
            try {
              await turnosService.cancelar(turno.id);
              cargar();
            } finally {
              setAccionando(false);
            }
          },
        },
      ],
    );
  };

  const elegirRecordatorio = () => {
    if (!turno) return;
    const opciones: { label: string; value: NonNullable<Turno['recordatorioCliente']> }[] = [
      { label: t('profesional.agenda.recordatorio1h'), value: '1h' },
      { label: t('profesional.agenda.recordatorio2h'), value: '2h' },
      { label: t('profesional.agenda.recordatorio24h'), value: '24h' },
      { label: t('profesional.agenda.recordatorioOff'), value: 'off' },
    ];
    const actual =
      opciones.find((o) => o.value === (turno.recordatorioCliente ?? '24h'))?.label ?? '';
    Alert.alert(
      t('profesional.agenda.recordatorioCliente'),
      t('profesional.agenda.recordatorioMsg', { nombre: turno.clienteNombre, actual }),
      [
        ...opciones.map((o) => ({
          text: o.label,
          onPress: async () => {
            await turnosService.actualizarRecordatorio(turno.id, o.value);
            cargar();
          },
        })),
        { text: t('comun.cancelar'), style: 'cancel' as const },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.huge }} />
      </SafeAreaView>
    );
  }

  if (!turno) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={{ padding: spacing.xxl, gap: spacing.lg }}>
          <Text style={styles.meta}>{t('profesional.turnoDetalle.noEncontrado')}</Text>
          <Button label={t('comun.volver')} variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const fechaLegible = formatFechaLarga(turno.fecha);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.xxl, paddingBottom: spacing.huge }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>

          {/* Cabecera */}
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Avatar nombre={turno.clienteNombre || '-'} size={56} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>{turno.clienteNombre}</Text>
                <Text style={styles.meta}>{turno.servicioNombre}</Text>
              </View>
              <Badge label={t(`estadosTurno.${turno.estado}`)} tone={ESTADO_TONE[turno.estado]} />
            </View>

            <View style={styles.sep} />

            <View style={styles.linea}>
              <Ionicons name="calendar-outline" size={16} color={colors.muted} />
              <Text style={styles.lineaTexto}>{fechaLegible}</Text>
            </View>
            <View style={styles.linea}>
              <Ionicons name="time-outline" size={16} color={colors.muted} />
              <Text style={styles.lineaTexto}>
                {t('profesional.turnoDetalle.horaDuracion', {
                  hora: turno.hora,
                  min: turno.duracionMin,
                })}
              </Text>
            </View>
            <View style={styles.linea}>
              <Ionicons name="cash-outline" size={16} color={colors.muted} />
              <Text style={[styles.lineaTexto, { fontWeight: '700', color: colors.primary }]}>
                {formatARS(turno.monto)}
              </Text>
            </View>
            {(turno.montoSena ?? 0) > 0 && (
              <View style={styles.linea}>
                <Ionicons
                  name={turno.senaPagada ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                  size={16}
                  color={turno.senaPagada ? colors.primary : colors.muted}
                />
                <Text style={styles.lineaTexto}>
                  {turno.senaPagada
                    ? t('profesional.turnoDetalle.senaPagada', {
                        monto: formatARS(turno.montoSena ?? 0),
                      })
                    : t('profesional.turnoDetalle.senaPendiente', {
                        monto: formatARS(turno.montoSena ?? 0),
                      })}
                </Text>
              </View>
            )}
          </View>

          {/* Nota que dejó el cliente al reservar (solo lectura) */}
          <Text style={styles.seccion}>{t('profesional.turnoDetalle.notaCliente')}</Text>
          {turno.notas ? (
            <View style={styles.notaCard}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
              <Text style={styles.notaTexto}>{turno.notas}</Text>
            </View>
          ) : (
            <Text style={styles.meta}>{t('profesional.turnoDetalle.sinNotaCliente')}</Text>
          )}

          {/* Ficha del cliente, editable acá mismo */}
          <Text style={styles.seccion}>{t('profesional.turnoDetalle.fichaCliente')}</Text>
          <TextInput
            value={telefono}
            onChangeText={setTelefono}
            placeholder={t('profesional.ficha.telefonoPlaceholder')}
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <TextInput
            value={notasFicha}
            onChangeText={setNotasFicha}
            placeholder={t('profesional.ficha.notasPlaceholder')}
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
            style={[styles.input, { minHeight: 110 }]}
          />
          <View style={styles.fichaAcciones}>
            <Button
              label={guardandoFicha ? t('comun.guardando') : t('profesional.ficha.guardarFicha')}
              onPress={guardarFicha}
              disabled={guardandoFicha}
              variant="secondary"
              style={{ flex: 1 }}
            />
            <Button
              label={t('profesional.turnoDetalle.verFicha')}
              variant="ghost"
              onPress={() =>
                router.push({
                  pathname: '/(profesional)/ficha-cliente',
                  params: { clienteId: turno.clienteId, nombre: turno.clienteNombre },
                })
              }
              style={{ flex: 1 }}
            />
          </View>

          {/* Acciones del turno */}
          <Text style={styles.seccion}>{t('profesional.turnoDetalle.acciones')}</Text>
          <View style={{ gap: spacing.sm }}>
            {turno.estado === 'pendiente' && (
              <Button
                label={t('profesional.turnoDetalle.confirmarTurno')}
                onPress={() => cambiarEstado('confirmado')}
                disabled={accionando}
                fullWidth
              />
            )}
            {turno.estado === 'confirmado' && (
              <Button
                label={t('profesional.turnoDetalle.registrarCobro')}
                onPress={cobrar}
                disabled={accionando}
                fullWidth
              />
            )}
            {turno.estado === 'pendiente_pago' && (
              <Text style={styles.meta}>{t('profesional.turnoDetalle.esperandoSena')}</Text>
            )}
            {(turno.estado === 'pendiente' || turno.estado === 'confirmado') && (
              <>
                <Button
                  label={t('profesional.agenda.recordatorioCliente')}
                  variant="secondary"
                  onPress={elegirRecordatorio}
                  disabled={accionando}
                  fullWidth
                />
                <Button
                  label={t('profesional.turnoDetalle.cancelarTurno')}
                  variant="ghost"
                  onPress={cancelarTurno}
                  disabled={accionando}
                  fullWidth
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    backBtn: { marginBottom: spacing.md, alignSelf: 'flex-start' },
    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.xl,
      padding: spacing.xl,
      gap: spacing.sm,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    nombre: { fontSize: 18, fontWeight: '700', color: c.ink },
    meta: { fontSize: 12, color: c.muted },
    sep: { height: 1, backgroundColor: c.border, marginVertical: spacing.md },
    linea: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    lineaTexto: { fontSize: 14, color: c.ink },
    seccion: {
      fontSize: 13,
      fontWeight: '700',
      color: c.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.xxl,
      marginBottom: spacing.sm,
    },
    notaCard: {
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    notaTexto: { flex: 1, fontSize: 14, color: c.ink, lineHeight: 20 },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: c.ink,
      marginBottom: spacing.sm,
    },
    fichaAcciones: { flexDirection: 'row', gap: spacing.sm },
  });
