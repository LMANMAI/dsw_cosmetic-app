import React, { useState, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { LanguageModal, useLanguageLabel } from '@/components/LanguageSelector';
import { useSession } from '@/context/SessionContext';
import { turnosService, notificacionesService, PREFERENCIAS_DEFAULT } from '@/services';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import type { PreferenciasNotificaciones, RecordatorioTurnos } from '@/types/models';
import { confirm } from '@/utils/confirm';

const RECORDATORIO_VALUES: RecordatorioTurnos[] = ['30m', '1h', '2h', '24h', 'off'];

export default function PerfilClienteScreen() {
  const { user, logout, switchRole, updateUser, esProfesional } = useSession();
  const { colors, isDark, setMode } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const idiomaActual = useLanguageLabel();
  const [idiomaModal, setIdiomaModal] = useState(false);

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
      Alert.alert(t('comun.error'), err.message ?? t('perfil.cliente.errorPrefMsg'));
    } finally {
      setGuardandoPrefs(false);
    }
  };

  const elegirRecordatorio = () => {
    Alert.alert(
      t('perfil.cliente.recordatorio'),
      t('perfil.cliente.recordatorioPrompt'),
      RECORDATORIO_VALUES.map((value) => ({
        text: t(`perfil.cliente.recordatorios.${value}`),
        onPress: async () => {
          await guardarPrefs({ ...prefs, recordatorioTurnos: value });
        },
      })).concat([{ text: t('comun.cancelar'), onPress: async () => {} }]),
    );
  };

  const togglePush = async (value: boolean) => {
    if (value) {
      const ok = await notificacionesService.pedirPermisos();
      if (!ok) {
        Alert.alert(
          t('perfil.cliente.permisoRequeridoTitulo'),
          t('perfil.cliente.permisoNotifMsg'),
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
      title: t('perfil.compartido.cerrarSesion'),
      message: t('perfil.compartido.cerrarSesionMsg'),
      confirmLabel: t('perfil.compartido.cerrarSesion'),
      cancelLabel: t('comun.cancelar'),
      destructive: true,
    });
    if (ok) await logout();
  };

  /**
   * Si la cuenta ya está habilitada como profesional, solo cambia la vista.
   * Si todavía no, abre el alta de 3 pasos para completar los datos que faltan.
   */
  const irAProfesional = async () => {
    if (!esProfesional) {
      router.push('/(cliente)/convertirse-profesional');
      return;
    }
    try {
      await switchRole('profesional');
      router.replace('/(profesional)/agenda');
    } catch {
      // La cuenta no está habilitada (perfil incompleto): al alta.
      router.push('/(cliente)/convertirse-profesional');
    }
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xxl, paddingBottom: spacing.huge }}>
        <ScreenHeader eyebrow={t('perfil.compartido.tuCuenta')} title={t('perfil.compartido.miPerfil')} />

        <View style={styles.userBox}>
          <Avatar nombre={user?.nombre ?? '-'} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.nombre}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {user?.telefono ? <Text style={styles.tel}>{user.telefono}</Text> : null}
          </View>
        </View>

        <SettingsGroup title={t('perfil.cliente.grupoPersonal')}>
          <SettingsRow
            icon="person-outline"
            label={t('perfil.cliente.datosPersonales')}
            description={t('perfil.cliente.datosPersonalesDesc')}
            onPress={() => router.push('/(cliente)/datos-personales')}
          />
          <SettingsRow
            icon="location-outline"
            label={t('perfil.cliente.direcciones')}
            description={t('perfil.cliente.direccionesDesc')}
            onPress={() => router.push('/(cliente)/direcciones')}
          />
          <SettingsRow
            icon="card-outline"
            label={t('perfil.cliente.metodosPago')}
            description={t('perfil.cliente.metodosPagoDesc')}
            isLast
            onPress={() =>
              Alert.alert(
                t('perfil.cliente.metodosPago'),
                t('perfil.cliente.metodosPagoMsg'),
              )
            }
          />
        </SettingsGroup>

        <SettingsGroup title={t('perfil.compartido.grupoConfiguracion')}>
          <SettingsRow
            icon="alarm-outline"
            label={t('perfil.cliente.recordatorio')}
            description={t('perfil.cliente.recordatorioDesc')}
            value={t(`perfil.cliente.recordatorios.${prefs.recordatorioTurnos}`)}
            onPress={elegirRecordatorio}
          />
          <SettingsRow
            icon="notifications-outline"
            label={t('perfil.compartido.notifPush')}
            description={t('perfil.cliente.notifPushDesc')}
            toggle={prefs.pushEnabled}
            onToggle={togglePush}
          />
          <SettingsRow
            icon="language-outline"
            label={t('idioma.titulo')}
            description={t('idioma.descripcion')}
            value={idiomaActual}
            onPress={() => setIdiomaModal(true)}
          />
          <SettingsRow
            icon="moon-outline"
            label={t('perfil.compartido.modoOscuro')}
            toggle={isDark}
            onToggle={handleToggleDark}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup title={t('perfil.compartido.grupoAyuda')}>
          <SettingsRow
            icon="help-circle-outline"
            label={t('perfil.compartido.centroAyuda')}
            onPress={() => router.push('/(cliente)/centro-ayuda')}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label={t('perfil.compartido.terminos')}
            isLast
            onPress={() => router.push('/(cliente)/terminos')}
          />
        </SettingsGroup>

        <SettingsGroup title={t('perfil.compartido.grupoCuenta')}>
          <SettingsRow
            icon="briefcase-outline"
            label={
              esProfesional
                ? t('perfil.cliente.volverProfesional')
                : t('perfil.cliente.entrarProfesional')
            }
            description={
              esProfesional
                ? t('perfil.cliente.volverProfesionalDesc')
                : t('perfil.cliente.entrarProfesionalDesc')
            }
            onPress={irAProfesional}
          />
          <SettingsRow
            icon="log-out-outline"
            label={t('perfil.compartido.cerrarSesion')}
            destructive
            isLast
            onPress={confirmarLogout}
          />
        </SettingsGroup>
      </ScrollView>
      <LanguageModal visible={idiomaModal} onClose={() => setIdiomaModal(false)} />
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
