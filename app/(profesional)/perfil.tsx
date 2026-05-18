import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { useSession } from '@/context/SessionContext';
import { colors, radius, spacing } from '@/theme';
import { confirm } from '@/utils/confirm';

const ANTICIPO_OPTIONS = ['Sin anticipo', '20% del monto', '50% del monto', '100% del monto'];

export default function PerfilProfesionalScreen() {
  const { user, logout, switchRole } = useSession();

  const [perfilPublico, setPerfilPublico] = useState(true);
  const [anticipo, setAnticipo] = useState('20% del monto');
  const [autoConfirmar, setAutoConfirmar] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [recordatorioCliente, setRecordatorioCliente] = useState('24h antes');

  const elegirAnticipo = () => {
    Alert.alert(
      'Anticipo de pago',
      'Cuanto se le pide al cliente al reservar.',
      ANTICIPO_OPTIONS.map((opt) => ({
        text: opt,
        onPress: () => setAnticipo(opt),
      })).concat([{ text: 'Cancelar', onPress: () => {} }]),
    );
  };

  const elegirRecordatorio = () => {
    Alert.alert(
      'Recordatorio al cliente',
      'Cuanto antes le avisamos.',
      ['1h antes', '2h antes', '24h antes'].map((opt) => ({
        text: opt,
        onPress: () => setRecordatorioCliente(opt),
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
        <ScreenHeader eyebrow="Tu negocio" title="Mi perfil profesional" />

        <View style={styles.userBox}>
          <Avatar nombre={user?.nombre ?? '-'} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.nombre}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <Text style={styles.tel}>Villa Urquiza - Activa</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>87</Text>
            <Text style={styles.statLbl}>Resenas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>4.9</Text>
            <Text style={styles.statLbl}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>3</Text>
            <Text style={styles.statLbl}>Servicios</Text>
          </View>
        </View>

        <SettingsGroup title="Mi negocio">
          <SettingsRow
            icon="storefront-outline"
            label="Datos del negocio"
            description="Nombre, descripcion, fotos"
            onPress={() => Alert.alert('Proximamente', 'Editor de negocio.')}
          />
          <SettingsRow
            icon="cut-outline"
            label="Servicios y precios"
            description="3 activos"
            onPress={() => Alert.alert('Proximamente', 'Gestion de servicios.')}
          />
          <SettingsRow
            icon="time-outline"
            label="Horarios laborales"
            description="Lun a Sab - 9 a 19hs"
            isLast
            onPress={() => Alert.alert('Proximamente', 'Horarios laborales.')}
          />
        </SettingsGroup>

        <SettingsGroup title="Reservas">
          <SettingsRow
            icon="eye-outline"
            label="Perfil visible al publico"
            description="Si esta apagado, no aparecemos en busquedas"
            toggle={perfilPublico}
            onToggle={setPerfilPublico}
          />
          <SettingsRow
            icon="checkmark-done-outline"
            label="Auto-confirmar turnos"
            description="Aceptar reservas sin revision manual"
            toggle={autoConfirmar}
            onToggle={setAutoConfirmar}
          />
          <SettingsRow
            icon="cash-outline"
            label="Anticipo al reservar"
            value={anticipo}
            onPress={elegirAnticipo}
          />
          <SettingsRow
            icon="alarm-outline"
            label="Recordatorio al cliente"
            value={recordatorioCliente}
            isLast
            onPress={elegirRecordatorio}
          />
        </SettingsGroup>

        <SettingsGroup title="Notificaciones">
          <SettingsRow
            icon="notifications-outline"
            label="Notificaciones push"
            toggle={pushEnabled}
            onToggle={setPushEnabled}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup title="Cuenta">
          <SettingsRow
            icon="person-outline"
            label="Cambiar a vista cliente"
            description="Probar la app como si reservaras un turno"
            onPress={() => switchRole('cliente')}
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
  tel: { fontSize: 14, color: colors.success, marginTop: 4, fontWeight: '500' },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statVal: { fontSize: 24, fontWeight: '700', color: colors.rose },
  statLbl: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
