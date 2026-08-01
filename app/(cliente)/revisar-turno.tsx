import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { turnosService, pagosService } from '@/services';
import { useSession } from '@/context/SessionContext';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import { formatARS, formatFechaLarga } from '@/utils/format';

/** Params que manda profesional/[id] al pasar a la revisión. */
type Params = {
  profesionalId: string;
  profesionalNombre: string;
  direccion?: string;
  servicioId: string;
  servicioNombre: string;
  precio: string;
  duracionMin: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  montoSena: string;
  autoConfirmar?: string; // '1' | '0'
};

const LIMITE_NOTA = 500;

/**
 * Paso previo a reservar: el cliente repasa el turno, puede dejar una nota
 * para el profesional y recién ahí confirma. La nota se guarda en
 * `Turno.notas` y la ve el profesional en el detalle del turno y en la ficha.
 */
export default function RevisarTurnoScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useSession();
  const p = useLocalSearchParams<Params>();

  const [nota, setNota] = useState('');
  const [reservando, setReservando] = useState(false);
  const [pagoModal, setPagoModal] = useState<{ turnoId: string; monto: number } | null>(null);
  const [pagandoSena, setPagandoSena] = useState(false);

  const precio = Number(p.precio ?? 0);
  const montoSena = Number(p.montoSena ?? 0);
  const duracionMin = Number(p.duracionMin ?? 0);
  const autoConfirmar = p.autoConfirmar === '1';

  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Se formatea con el idioma elegido en la app, no con el del dispositivo.
  const fechaLegible = useMemo(
    () => (p.fecha ? formatFechaLarga(p.fecha) : ''),
    [p.fecha],
  );

  const irAMisTurnos = () => router.replace('/(cliente)/turnos');

  const confirmar = async () => {
    if (!user || !p.profesionalId || !p.servicioId) return;
    setReservando(true);
    try {
      const turno = await turnosService.reservar(
        {
          clienteId: user.id,
          clienteNombre: user.nombre,
          profesionalId: p.profesionalId,
          servicioId: p.servicioId,
          servicioNombre: p.servicioNombre ?? '',
          fecha: p.fecha,
          hora: p.hora,
          duracionMin,
          monto: precio,
          montoSena,
          // Nota del cliente. Se guarda solo si escribió algo, para no
          // llenar los documentos con strings vacíos.
          ...(nota.trim() ? { notas: nota.trim() } : {}),
        },
        autoConfirmar,
      );

      if (montoSena > 0) {
        setPagoModal({ turnoId: turno.id, monto: montoSena });
      } else {
        Alert.alert(
          t('cliente.proDetalle.turnoReservadoTitulo'),
          t('cliente.revisar.reservadoMsg', {
            servicio: p.servicioNombre ?? '',
            fecha: fechaLegible,
            hora: p.hora,
            estado: autoConfirmar
              ? t('cliente.proDetalle.estadoConfirmado')
              : t('cliente.proDetalle.estadoPendiente'),
          }),
          [{ text: t('cliente.proDetalle.verMisTurnos'), onPress: irAMisTurnos }],
        );
      }
    } catch (e: any) {
      Alert.alert(t('comun.error'), e?.message ?? t('perfil.compartido.errorGuardarMsg'));
    } finally {
      setReservando(false);
    }
  };

  const pagarSenaMP = async () => {
    if (!pagoModal) return;
    setPagandoSena(true);
    try {
      const { initPoint } = await pagosService.crearPreferenciaSena(pagoModal.turnoId);
      const estado = await pagosService.abrirCheckoutSena(initPoint);

      if (estado === 'approved') {
        await turnosService.confirmarPagoSena(pagoModal.turnoId, autoConfirmar);
        setPagoModal(null);
        Alert.alert(
          t('cliente.proDetalle.pagoConfirmadoTitulo'),
          t('cliente.proDetalle.pagoConfirmadoMsg'),
          [{ text: t('cliente.proDetalle.verMisTurnos'), onPress: irAMisTurnos }],
        );
      } else if (estado === 'pending') {
        setPagoModal(null);
        Alert.alert(
          t('cliente.turnos.pagoPendienteTitulo'),
          t('cliente.proDetalle.pagoPendienteMsg'),
          [{ text: t('cliente.proDetalle.verMisTurnos'), onPress: irAMisTurnos }],
        );
      } else if (estado === 'cancelado') {
        Alert.alert(
          t('cliente.turnos.pagoNoCompletadoTitulo'),
          t('cliente.proDetalle.pagoNoCompletadoMsg'),
        );
      } else {
        Alert.alert(t('cliente.turnos.pagoErrorTitulo'), t('cliente.turnos.pagoErrorMsg'));
      }
    } catch (e: any) {
      Alert.alert(
        t('cliente.turnos.pagoIniciarErrorTitulo'),
        e?.message ?? t('cliente.turnos.pagoIniciarErrorMsg'),
      );
    } finally {
      setPagandoSena(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.topTitle}>{t('cliente.revisar.titulo')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.xxl, paddingBottom: spacing.huge }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profesional */}
          <View style={styles.card}>
            <View style={styles.proRow}>
              <Avatar nombre={p.profesionalNombre ?? '-'} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.proNombre}>{p.profesionalNombre}</Text>
                {!!p.direccion && (
                  <Text style={styles.meta} numberOfLines={1}>
                    {p.direccion}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.sep} />

            <View style={styles.linea}>
              <Ionicons name="calendar-outline" size={16} color={colors.muted} />
              <Text style={styles.lineaTexto}>{fechaLegible}</Text>
            </View>
            <View style={styles.linea}>
              <Ionicons name="time-outline" size={16} color={colors.muted} />
              <Text style={styles.lineaTexto}>
                {t('cliente.revisar.horaDuracion', { hora: p.hora, min: duracionMin })}
              </Text>
            </View>

            <View style={styles.sep} />

            <View style={styles.filaMonto}>
              <Text style={styles.servicio}>{p.servicioNombre}</Text>
              <Text style={styles.montoServicio}>{formatARS(precio)}</Text>
            </View>
            <View style={styles.filaMonto}>
              <Text style={styles.totalLabel}>{t('cliente.revisar.total')}</Text>
              <Text style={styles.totalMonto}>{formatARS(precio)}</Text>
            </View>
            {montoSena > 0 && (
              <View style={styles.senaBox}>
                <Text style={styles.senaTexto}>
                  {t('cliente.revisar.senaAviso', { monto: formatARS(montoSena) })}
                </Text>
              </View>
            )}
          </View>

          {/* Nota del cliente */}
          <Text style={styles.seccion}>{t('cliente.revisar.comentarios')}</Text>
          <TextInput
            value={nota}
            onChangeText={(v) => setNota(v.slice(0, LIMITE_NOTA))}
            placeholder={t('cliente.revisar.notaPlaceholder')}
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
            style={styles.notaInput}
          />
          <Text style={styles.contador}>
            {nota.length}/{LIMITE_NOTA}
          </Text>
          <Text style={styles.ayuda}>{t('cliente.revisar.notaAyuda')}</Text>

          {/* Política de cancelación */}
          <Text style={styles.seccion}>{t('cliente.revisar.masDetalles')}</Text>
          <View style={styles.card}>
            <Text style={styles.detalleTitulo}>{t('cliente.revisar.politicaTitulo')}</Text>
            <Text style={styles.meta}>{t('cliente.revisar.politicaTexto')}</Text>
          </View>
        </ScrollView>

        {/* Barra inferior */}
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomLabel}>{t('cliente.revisar.total')}</Text>
            <Text style={styles.bottomTotal}>{formatARS(precio)}</Text>
          </View>
          <Button
            label={t('comun.confirmar')}
            onPress={confirmar}
            loading={reservando}
            disabled={reservando}
            style={{ minWidth: 160 }}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Modal de seña (mismo flujo que antes, movido acá) */}
      <Modal visible={!!pagoModal} transparent animationType="fade">
        <View style={styles.modalFondo}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>{t('cliente.proDetalle.pagarSena')}</Text>
            <Text style={styles.meta}>{t('cliente.proDetalle.montoAPagar')}</Text>
            <Text style={styles.modalMonto}>{formatARS(pagoModal?.monto ?? 0)}</Text>

            {pagandoSena ? (
              <View style={{ alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg }}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.meta}>{t('cliente.proDetalle.abriendoMP')}</Text>
              </View>
            ) : (
              <>
                <Button
                  label={t('cliente.proDetalle.pagarCon') + 'Mercado Pago'}
                  onPress={pagarSenaMP}
                  fullWidth
                  style={{ marginTop: spacing.lg }}
                />
                <Button
                  label={t('cliente.proDetalle.pagarMasTarde')}
                  variant="ghost"
                  fullWidth
                  onPress={() => {
                    setPagoModal(null);
                    Alert.alert(
                      t('cliente.proDetalle.reservadoSinPagoTitulo'),
                      t('cliente.proDetalle.reservadoSinPagoMsg'),
                      [{ text: t('cliente.proDetalle.verMisTurnos'), onPress: irAMisTurnos }],
                    );
                  }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    topTitle: { fontSize: 17, fontWeight: '700', color: c.ink },
    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.xl,
      padding: spacing.xl,
      gap: spacing.sm,
    },
    proRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    proNombre: { fontSize: 16, fontWeight: '700', color: c.ink },
    meta: { fontSize: 12, color: c.muted },
    sep: { height: 1, backgroundColor: c.border, marginVertical: spacing.md },
    linea: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    lineaTexto: { fontSize: 14, color: c.ink },
    filaMonto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    servicio: { fontSize: 14, color: c.ink, flex: 1, paddingRight: spacing.md },
    montoServicio: { fontSize: 14, color: c.ink },
    totalLabel: { fontSize: 15, fontWeight: '700', color: c.ink },
    totalMonto: { fontSize: 15, fontWeight: '700', color: c.ink },
    senaBox: {
      backgroundColor: c.background,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    senaTexto: { fontSize: 12, color: c.primary, fontWeight: '600' },
    seccion: {
      fontSize: 13,
      fontWeight: '700',
      color: c.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.xxl,
      marginBottom: spacing.sm,
    },
    notaInput: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: c.ink,
      minHeight: 110,
    },
    contador: { fontSize: 11, color: c.muted, textAlign: 'right', marginTop: 4 },
    ayuda: { fontSize: 12, color: c.muted, marginTop: 4 },
    detalleTitulo: { fontSize: 14, fontWeight: '600', color: c.ink },
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.surface,
    },
    bottomLabel: { fontSize: 12, color: c.muted },
    bottomTotal: { fontSize: 20, fontWeight: '700', color: c.ink },
    modalFondo: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: spacing.xxl,
    },
    modalCard: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.xxl,
    },
    modalTitulo: { fontSize: 17, fontWeight: '700', color: c.ink, marginBottom: spacing.sm },
    modalMonto: { fontSize: 28, fontWeight: '800', color: c.primary },
  });
