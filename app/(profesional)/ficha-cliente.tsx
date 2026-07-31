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
import { fichasService } from '@/services/fichas.service';
import { useSession } from '@/context/SessionContext';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import type { EstadoTurno, Turno } from '@/types/models';
import { formatARS } from '@/utils/format';

const ESTADO_TONE: Record<EstadoTurno, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  confirmado: 'success',
  pendiente: 'warning',
  pendiente_pago: 'warning',
  completado: 'info',
  cancelado: 'danger',
  no_asistio: 'danger',
};

/**
 * Ficha del cliente: contacto y notas editables por el profesional +
 * historial de turnos con ese cliente. Se guarda en fichas_cliente
 * (privada de cada profesional).
 */
export default function FichaClienteScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useSession();
  const profesionalId = user?.id ?? '';
  const { clienteId, nombre } = useLocalSearchParams<{ clienteId: string; nombre?: string }>();

  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [notas, setNotas] = useState('');
  const [historial, setHistorial] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!profesionalId || !clienteId) return;
      setLoading(true);
      Promise.all([
        fichasService.obtener(profesionalId, clienteId),
        fichasService.historialConCliente(profesionalId, clienteId),
      ])
        .then(([ficha, turnos]) => {
          setTelefono(ficha?.telefono ?? '');
          setEmail(ficha?.email ?? '');
          setNotas(ficha?.notas ?? '');
          setHistorial(turnos);
        })
        .finally(() => setLoading(false));
    }, [profesionalId, clienteId]),
  );

  const guardar = async () => {
    if (!profesionalId || !clienteId) return;
    setGuardando(true);
    try {
      await fichasService.guardar(profesionalId, clienteId, {
        clienteNombre: nombre,
        telefono: telefono.trim(),
        email: email.trim(),
        notas: notas.trim(),
      });
      Alert.alert(t('comun.listo'), t('profesional.ficha.guardadoMsg'));
    } catch {
      Alert.alert(t('comun.error'), t('perfil.compartido.errorGuardarMsg'));
    } finally {
      setGuardando(false);
    }
  };

  const completados = historial.filter((h) => h.estado === 'completado');
  const totalGastado = completados.reduce((s, h) => s + (h.monto ?? 0), 0);

  const styles = useMemo(() => makeStyles(colors), [colors]);

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
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>

          {/* Cabecera del cliente */}
          <View style={styles.header}>
            <Avatar nombre={nombre ?? '-'} size={64} />
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>{nombre}</Text>
              <Text style={styles.meta}>
                {t('profesional.ficha.resumen', {
                  turnos: historial.length,
                  completados: completados.length,
                })}
              </Text>
              {totalGastado > 0 && (
                <Text style={[styles.meta, { color: colors.primary, fontWeight: '700' }]}>
                  {t('profesional.clientes.totalGastado', { monto: formatARS(totalGastado) })}
                </Text>
              )}
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
          ) : (
            <>
              {/* Contacto */}
              <Text style={styles.seccion}>{t('profesional.ficha.contacto')}</Text>
              <TextInput
                value={telefono}
                onChangeText={setTelefono}
                placeholder={t('profesional.ficha.telefonoPlaceholder')}
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                style={styles.input}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('profesional.ficha.emailPlaceholder')}
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />

              {/* Notas */}
              <Text style={styles.seccion}>{t('profesional.ficha.notas')}</Text>
              <TextInput
                value={notas}
                onChangeText={setNotas}
                placeholder={t('profesional.ficha.notasPlaceholder')}
                placeholderTextColor={colors.muted}
                multiline
                textAlignVertical="top"
                style={[styles.input, styles.notas]}
              />

              <Button
                label={guardando ? t('comun.guardando') : t('profesional.ficha.guardarFicha')}
                onPress={guardar}
                disabled={guardando}
                fullWidth
                style={{ marginTop: spacing.lg }}
              />

              {/* Historial */}
              <Text style={styles.seccion}>{t('profesional.ficha.historial')}</Text>
              {historial.length === 0 ? (
                <Text style={styles.meta}>{t('profesional.ficha.sinHistorial')}</Text>
              ) : (
                historial.map((turno) => (
                  <Pressable
                    key={turno.id}
                    style={styles.turnoCard}
                    onPress={() =>
                      router.push({
                        pathname: '/(profesional)/turno-detalle',
                        params: { turnoId: turno.id },
                      })
                    }
                  >
                    <View style={styles.turnoFila}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.turnoServicio}>{turno.servicioNombre}</Text>
                        <Text style={styles.meta}>
                          {new Date(turno.fecha + 'T00:00:00').toLocaleDateString()} · {turno.hora} hs
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={styles.turnoMonto}>{formatARS(turno.monto ?? 0)}</Text>
                        <Badge
                          label={t(`estadosTurno.${turno.estado}`)}
                          tone={ESTADO_TONE[turno.estado]}
                        />
                      </View>
                    </View>

                    {/* Nota que dejó el cliente al reservar ese turno. */}
                    {!!turno.notas && (
                      <View style={styles.notaTurno}>
                        <Ionicons
                          name="chatbubble-ellipses-outline"
                          size={14}
                          color={colors.primary}
                        />
                        <Text style={styles.notaTurnoTexto}>{turno.notas}</Text>
                      </View>
                    )}
                  </Pressable>
                ))
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    backBtn: { marginBottom: spacing.md, alignSelf: 'flex-start' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.xl,
      padding: spacing.xl,
    },
    nombre: { fontSize: 18, fontWeight: '700', color: c.ink },
    meta: { fontSize: 12, color: c.muted, marginTop: 2 },
    seccion: {
      fontSize: 13,
      fontWeight: '700',
      color: c.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.xxl,
      marginBottom: spacing.sm,
    },
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
    notas: { minHeight: 120 },
    turnoCard: {
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.sm,
    },
    turnoFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    notaTurno: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: c.background,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    notaTurnoTexto: { flex: 1, fontSize: 13, color: c.ink, lineHeight: 18 },
    turnoServicio: { fontSize: 14, fontWeight: '600', color: c.ink },
    turnoMonto: { fontSize: 14, fontWeight: '700', color: c.primary },
  });
