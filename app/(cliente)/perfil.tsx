import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { useSession } from '@/context/SessionContext';
import { colors, radius, spacing } from '@/theme';
import { confirm } from '@/utils/confirm';

const RECORDATORIO_OPTIONS = ['1h antes', '2h antes', '24h antes', 'Sin recordatorio'];

export default function PerfilClienteScreen() {
  const { user, logout, switchRole } = useSession();

  const [recordatorio, setRecordatorio] = useState<string>('24h antes');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailNoticias, setEmailNoticias] = useState(false);
  const [modoOscuro, setModoOscuro] = useState(false);

  const elegirRecordatorio = () => {
    Alert.alert(
      'Recordatorio de turnos',
      'Cuanto antes queres que te avisemos?',
      RECORDATORIO_OPTIONS.map((opt) => ({
        text: opt,
        onPress: () => setRecordatorio(opt),
      })).concat([{ text: 'Cancelar', onPress: () => {} }]),
    );
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
            onPress={() => Alert.alert('Proximamente', 'Pantalla de edicion de datos.')}
          />
          <SettingsRow
            icon="location-outline"
            label="Direcciones guardadas"
            description="Para que las profesionales sepan donde atenderte"
            onPress={() => Alert.alert('Proximamente', 'Gestion de direcciones.')}
          />
          <SettingsRow
            icon="card-outline"
            label="Metodos de pago"
            description="Tarjetas y MercadoPago"
            isLast
            onPress={() => Alert.alert('Proximamente', 'Metodos de pago.')}
          />
        </SettingsGroup>

        <SettingsGroup title="Configuracion">
          <SettingsRow
            icon="alarm-outline"
            label="Recordatorio de turnos"
            description="Cuanto antes te avisamos"
            value={recordatorio}
            onPress={elegirRecordatorio}
          />
          <SettingsRow
            icon="notifications-outline"
            label="Notificaciones push"
            description="Confirmaciones, cambios y promos"
            toggle={pushEnabled}
            onToggle={setPushEnabled}
          />
          <SettingsRow
            icon="mail-outline"
            label="Newsletter por email"
            description="Novedades y descuentos"
            toggle={emailNoticias}
            onToggle={setEmailNoticias}
          />
          <SettingsRow
            icon="moon-outline"
            label="Modo oscuro"
            toggle={modoOscuro}
            onToggle={setModoOscuro}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup title="Ayuda">
          <SettingsRow
            icon="help-circle-outline"
            label="Centro de ayuda"
            onPress={() => Alert.alert('Proximamente', 'Centro de ayuda.')}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Terminos y privacidad"
            isLast
            onPress={() => Alert.alert('Proximamente', 'Terminos y privacidad.')}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bone },
  userBox: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  name: { fontSize: 18, fontWeight: '700', color: colors.ink },
  email: { fontSize: 14, color: colors.muted, marginTop: 2 },
  tel: { fontSize: 14, color: colors.muted, marginTop: 2 },
});
