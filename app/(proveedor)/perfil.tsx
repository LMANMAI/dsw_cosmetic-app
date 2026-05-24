import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { useSession } from '@/context/SessionContext';
import { useTheme, radius, spacing } from '@/theme';
import { confirm } from '@/utils/confirm';
import type { PerfilProveedor } from '@/types/models';

export default function PerfilProveedorScreen() {
  const { colors } = useTheme();
  const { user, logout } = useSession();
  const perfil = user?.perfil as PerfilProveedor | undefined;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [aceptaPedidos, setAceptaPedidos] = useState(true);
  const [envioPropio, setEnvioPropio] = useState(true);
  const [retiroLocal, setRetiroLocal] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailPedidos, setEmailPedidos] = useState(true);

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
            {perfil?.razonSocial ? (
              <Text style={styles.tel}>{perfil.razonSocial}</Text>
            ) : null}
          </View>
        </View>

        {perfil ? (
          <View style={styles.dataCard}>
            <Text style={styles.dataTitle}>Datos del comercio</Text>
            <DataRow label="Razon social" value={perfil.razonSocial} styles={styles} />
            <DataRow label="CUIT" value={perfil.cuit} styles={styles} />
            <DataRow label="Rubro" value={perfil.rubro} styles={styles} />
            <DataRow label="Ciudad" value={perfil.ciudad} styles={styles} />
          </View>
        ) : null}

        <SettingsGroup title="Comercio">
          <SettingsRow
            icon="business-outline"
            label="Datos del comercio"
            description="Razon social, CUIT, direccion"
            onPress={() => Alert.alert('Proximamente', 'Edicion de datos del comercio.')}
          />
          <SettingsRow
            icon="cube-outline"
            label="Catalogo de productos"
            description="Crear, editar precios y stock"
            onPress={() => Alert.alert('Catalogo', 'Anda a la pestana Productos abajo.')}
          />
          <SettingsRow
            icon="cash-outline"
            label="Datos bancarios"
            description="CBU, alias para recibir cobros"
            isLast
            onPress={() => Alert.alert('Proximamente', 'Datos bancarios.')}
          />
        </SettingsGroup>

        <SettingsGroup title="Ventas y envios">
          <SettingsRow
            icon="storefront-outline"
            label="Acepto pedidos"
            description="Si esta apagado, no aparecemos en busqueda"
            toggle={aceptaPedidos}
            onToggle={setAceptaPedidos}
          />
          <SettingsRow
            icon="bicycle-outline"
            label="Envio propio"
            description="Llevas los pedidos vos"
            toggle={envioPropio}
            onToggle={setEnvioPropio}
          />
          <SettingsRow
            icon="location-outline"
            label="Retiro en local"
            toggle={retiroLocal}
            onToggle={setRetiroLocal}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup title="Notificaciones">
          <SettingsRow
            icon="notifications-outline"
            label="Notificaciones push"
            description="Nuevos pedidos y mensajes"
            toggle={pushEnabled}
            onToggle={setPushEnabled}
          />
          <SettingsRow
            icon="mail-outline"
            label="Email por cada pedido"
            toggle={emailPedidos}
            onToggle={setEmailPedidos}
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

function DataRow({ label, value, styles }: { label: string; value?: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value || '-'}</Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof import('@/theme').useTheme>['colors']) =>
  StyleSheet.create({
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
    tel: { fontSize: 14, color: colors.primary, marginTop: 4, fontWeight: '600' },
    dataCard: {
      marginTop: spacing.xl,
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dataTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: spacing.sm },
    dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.bone2,
    },
    dataLabel: { fontSize: 13, color: colors.muted },
    dataValue: { fontSize: 13, fontWeight: '600', color: colors.ink },
  });
