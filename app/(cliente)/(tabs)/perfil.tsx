import React, { useState, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { useSession } from '@/context/SessionContext';
import { turnosService, notificacionesService, PREFERENCIAS_DEFAULT, RECORDATORIO_LABELS } from '@/services';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import type { PreferenciasNotificaciones, RecordatorioTurnos } from '@/types/models';
import { confirm } from '@/utils/confirm';

const RECORDATORIO_VALUES: RecordatorioTurnos[] = ['30m', '1h', '2h', '24h', 'off'];

export default function PerfilClienteScreen() {
  const { user, logout, switchRole, updateUser } = useSession();
  const { colors, isDark, setMode } = useTheme();
  const router = useRouter();

  const prefs: PreferenciasNotificaciones = user?.preferencias ?? PREFERENCIAS_DEFAULT;
  const [guardandoPrefs, setGuardandoPrefs] = useState(false);

  const handleToggleDark = (value: boolean) => {
    setMode(value ? 'dark' : 'light');
  };

  /** Guarda las preferencias en Firebase y reprograma los recordatorios locales. */
  const guardarPrefs = async (nuevas: PreferenciasNotificaciones) => {
    if (!user || guardandoPrefs) return;
    setGuardandoPrefs(true);
    try {
      await updateUser({ preferencias: nuevas });
      const turnos = await turnosService.listarDelCliente(user.id).catch(() => []);
      await notificacionesService.sincronizarRecordatorios(turnos, nuevas);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar la preferencia.');
    } finally {
      setGuardandoPrefs(false);
    }
  };

  const elegirRecordatorio = () => {
    Alert.alert(
      'Recordatorio de turnos',
      'Cuanto antes queres que te avisemos?',
      RECORDATORIO_VALUES.map((value) => ({
        text: RECORDATORIO_LABELS[value],
        onPress: async () => {
          await guardarPrefs({ ...prefs, recordatorioTurnos: value });
        },
      })).concat([{ text: 'Cancelar', onPress: async () => {} }]),
    );
  };

  const togglePush = async (value: boolean) => {
    if (value) {
      const ok = await notificacionesService.pedirPermisos();
      if (!ok) {
        Alert.alert(
          'Permiso requerido',
          'Activá las notificaciones para YOFI desde la configuración de tu teléfono.',
        );
        return;
      }
    } else {
      await notificacionesService.cancelarTodos();
    }
    await guardarPrefs({ ...prefs, pushEnabled: value });
  };

  const confirmarLogout = async () => {
    const ok = await confirm({
      title: 'Cerrar sesion',
      message: 'Seguro queres salir?',
      confirmLabel: 'Cerrar sesion',
      destructive: true,
    });
    if (ok) await logout();
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xxl, paddingBottom: spacing.huge }}>
        <ScreenHeader eyebrow="Tu cuenta" title="Mi perfil" />

        <View style={styles.userBox}>
          <Avatar nombre={user?.nombre ?? '-'} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.nombre}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {user?.telefono ? <Text style={styles.tel}>{user.telefono}</Text> : null}
          </View>
        </View>

        <SettingsGroup title="Personal">
          <SettingsRow
            icon="person-outline"
            label="Datos personales"
            description="Nombre, email, telefono"
            onPress={() => router.push('/(cliente)/datos-personales')}
          />
          <SettingsRow
            icon="location-outline"
            label="Direcciones guardadas"
            description="Para que las profesionales sepan donde atenderte"
            onPress={() => router.push('/(cliente)/direcciones')}
          />
          <SettingsRow
            icon="card-outline"
            label="Metodos de pago"
            description="Por el momento, MercadoPago"
            isLast
            onPress={() =>
              Alert.alert(
                'Metodos de pago',
                'Por el momento operamos unicamente a traves de MercadoPago. Los pagos y senas de tus turnos se procesan de forma segura desde la app de MercadoPago.',
              )
            }
          />
        </SettingsGroup>

        <SettingsGroup title="Configuracion">
          <SettingsRow
            icon="alarm-outline"
            label="Recordatorio de turnos"
            description="Cuanto antes te avisamos"
            value={RECORDATORIO_LABELS[prefs.recordatorioTurnos]}
            onPress={elegirRecordatorio}
          />
          <SettingsRow
            icon="notifications-outline"
            label="Notificaciones push"
            description="Recordatorios de tus turnos"
            toggle={prefs.pushEnabled}
            onToggle={togglePush}
          />
          <SettingsRow
            icon="moon-outline"
            label="Modo oscuro"
            toggle={isDark}
            onToggle={handleToggleDark}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup title="Ayuda">
          <SettingsRow
            icon="help-circle-outline"
            label="Centro de ayuda"
            onPress={() => router.push('/(cliente)/centro-ayuda')}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Terminos y privacidad"
            isLast
            onPress={() => router.push('/(cliente)/terminos')}
          />
        </SettingsGroup>

        <SettingsGroup title="Cuenta">
          <SettingsRow
            icon="briefcase-outline"
            label="Entrar como profesional"
            description="Si tambien ofreces servicios"
            onPress={() => switchRole('profesional')}
          />
          <SettingsRow
            icon="log-out-outline"
            label="Cerrar sesion"
            destructive
            isLast
            onPress={confirmarLogout}
          />
        </SettingsGroup>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    userBox: {
      flexDirection: 'row',
      gap: spacing.lg,
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: spacing.md,
    },
    name: { fontSize: 18, fontWeight: '700', color: c.ink },
    email: { fontSize: 14, color: c.muted, marginTop: 2 },
    tel: { fontSize: 14, color: c.muted, marginTop: 2 },
  });
