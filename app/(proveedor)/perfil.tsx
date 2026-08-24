import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { MpStatusBanner } from '@/components/MpStatusBanner';
import { useSession } from '@/context/SessionContext';
import { productosService } from '@/services';
import { conectarMercadoPago } from '@/services/mp-connect.service';
import { LanguageModal, useLanguageLabel } from '@/components/LanguageSelector';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import { confirm } from '@/utils/confirm';
import { PREFERENCIAS_PROVEEDOR_DEFAULT, type PerfilProveedor } from '@/types/models';

export default function PerfilProveedorScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const idiomaActual = useLanguageLabel();
  const [idiomaModal, setIdiomaModal] = useState(false);
  const router = useRouter();
  const { user, logout, updateUser, refreshUser } = useSession();
  const [conectandoMP, setConectandoMP] = useState(false);
  const perfil = user?.perfil as PerfilProveedor | undefined;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [aceptaPedidos, setAceptaPedidos] = useState(perfil?.aceptaPedidos ?? PREFERENCIAS_PROVEEDOR_DEFAULT.aceptaPedidos);
  const [envioPropio, setEnvioPropio] = useState(perfil?.envioPropio ?? PREFERENCIAS_PROVEEDOR_DEFAULT.envioPropio);
  const [retiroLocal, setRetiroLocal] = useState(perfil?.retiroLocal ?? PREFERENCIAS_PROVEEDOR_DEFAULT.retiroLocal);
  const [pushEnabled, setPushEnabled] = useState(perfil?.notifPush ?? PREFERENCIAS_PROVEEDOR_DEFAULT.notifPush);
  const [emailPedidos, setEmailPedidos] = useState(perfil?.emailPedidos ?? PREFERENCIAS_PROVEEDOR_DEFAULT.emailPedidos);

  // Cambia un toggle en local y lo persiste en el perfil (Firestore).
  const guardarPref = (cambios: Partial<PerfilProveedor>) => {
    if (!perfil) return;
    updateUser({ perfil: { ...perfil, ...cambios } }).catch(() => {
      Alert.alert(t('perfil.compartido.errorGuardarTitulo'), t('perfil.compartido.errorGuardarMsg'));
    });
  };

  const togglePref = (
    setLocal: (v: boolean) => void,
    key: keyof PerfilProveedor,
    value: boolean,
  ) => {
    setLocal(value);
    guardarPref({ [key]: value } as Partial<PerfilProveedor>);
    // Si cambió una opción de entrega, propagar a todos los productos del proveedor
    // (es lo que ve el comprador en la tienda).
    if (key === 'envioPropio' || key === 'retiroLocal') {
      const entregaEnvio = key === 'envioPropio' ? value : envioPropio;
      const entregaRetiro = key === 'retiroLocal' ? value : retiroLocal;
      productosService
        .sincronizarEntrega(user?.id ?? '', { entregaEnvio, entregaRetiro })
        .catch(() => {});
    }
  };

  const conectarMP = async () => {
    if (!user) return;
    setConectandoMP(true);
    const res = await conectarMercadoPago(user.id);
    setConectandoMP(false);
    if (res === 'ok') {
      await refreshUser();
      Alert.alert(t('perfil.compartido.cuentaConectadaTitulo'), t('perfil.proveedor.cuentaConectadaMsg'));
    } else if (res === 'error') {
      Alert.alert(t('perfil.compartido.mpErrorTitulo'), t('perfil.compartido.mpErrorMsg'));
    }
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xxl, paddingBottom: spacing.huge }}>
        <ScreenHeader eyebrow={t('perfil.compartido.tuCuenta')} title={t('perfil.compartido.miPerfil')} />

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
            <Text style={styles.dataTitle}>{t('perfil.proveedor.datosComercio')}</Text>
            <DataRow label={t('perfil.proveedor.razonSocial')} value={perfil.razonSocial} styles={styles} />
            <DataRow label={t('perfil.proveedor.cuit')} value={perfil.cuit} styles={styles} />
            <DataRow label={t('perfil.proveedor.rubro')} value={perfil.rubro} styles={styles} />
            {perfil.direccion ? (
              <DataRow label={t('perfil.proveedor.direccion')} value={perfil.direccion} styles={styles} />
            ) : null}
            <DataRow label={t('perfil.proveedor.ciudad')} value={perfil.ciudad} styles={styles} />
          </View>
        ) : null}

        <SettingsGroup title={t('perfil.proveedor.grupoComercio')}>
          <SettingsRow
            icon="business-outline"
            label={t('perfil.proveedor.datosComercio')}
            description={t('perfil.proveedor.datosComercioDesc')}
            onPress={() => router.navigate('/(proveedor)/editar-comercio')}
          />
          <SettingsRow
            icon="cube-outline"
            label={t('perfil.proveedor.catalogo')}
            description={t('perfil.proveedor.catalogoDesc')}
            isLast
            onPress={() => router.navigate('/(proveedor)/productos')}
          />
        </SettingsGroup>

        <MpStatusBanner conectado={!!user?.mpConectado} onConnect={conectarMP} />

        <SettingsGroup title={t('perfil.compartido.grupoCobros')}>
          <SettingsRow
            icon="card-outline"
            label={user?.mpConectado ? t('perfil.compartido.mpConectado') : t('perfil.compartido.conectarMP')}
            description={
              conectandoMP
                ? t('perfil.compartido.abriendoMP')
                : user?.mpConectado
                  ? t('perfil.proveedor.mpDescConectado')
                  : t('perfil.proveedor.mpDescConectar')
            }
            isLast
            onPress={conectarMP}
          />
        </SettingsGroup>

        <SettingsGroup title={t('perfil.proveedor.grupoVentas')}>
          <SettingsRow
            icon="storefront-outline"
            label={t('perfil.proveedor.aceptoPedidos')}
            description={t('perfil.proveedor.aceptoPedidosDesc')}
            toggle={aceptaPedidos}
            onToggle={(v) => togglePref(setAceptaPedidos, 'aceptaPedidos', v)}
          />
          <SettingsRow
            icon="bicycle-outline"
            label={t('perfil.proveedor.envioPropio')}
            description={t('perfil.proveedor.envioPropioDesc')}
            toggle={envioPropio}
            onToggle={(v) => togglePref(setEnvioPropio, 'envioPropio', v)}
          />
          <SettingsRow
            icon="location-outline"
            label={t('perfil.proveedor.retiroLocal')}
            toggle={retiroLocal}
            onToggle={(v) => togglePref(setRetiroLocal, 'retiroLocal', v)}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup title={t('perfil.compartido.grupoNotificaciones')}>
          <SettingsRow
            icon="notifications-outline"
            label={t('perfil.compartido.notifPush')}
            description={t('perfil.proveedor.notifPushDesc')}
            toggle={pushEnabled}
            onToggle={(v) => togglePref(setPushEnabled, 'notifPush', v)}
          />
          <SettingsRow
            icon="mail-outline"
            label={t('perfil.proveedor.emailPedidos')}
            toggle={emailPedidos}
            onToggle={(v) => togglePref(setEmailPedidos, 'emailPedidos', v)}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup title={t('perfil.compartido.grupoConfiguracion')}>
          <SettingsRow
            icon="language-outline"
            label={t('idioma.titulo')}
            description={t('idioma.descripcion')}
            value={idiomaActual}
            isLast
            onPress={() => setIdiomaModal(true)}
          />
        </SettingsGroup>

        <SettingsGroup title={t('perfil.compartido.grupoAyuda')}>
          <SettingsRow
            icon="help-circle-outline"
            label={t('perfil.compartido.centroAyuda')}
            onPress={() => router.navigate('/(proveedor)/centro-ayuda')}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label={t('perfil.compartido.terminos')}
            isLast
            onPress={() => router.navigate('/(proveedor)/terminos')}
          />
        </SettingsGroup>

        <SettingsGroup title={t('perfil.compartido.grupoCuenta')}>
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
