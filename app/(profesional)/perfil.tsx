import React, { useCallback, useState, useMemo } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { useSession } from '@/context/SessionContext';
import { conectarMercadoPago } from '@/services/mp-connect.service';
import { disponibilidadService } from '@/services/disponibilidad.service';
import { serviciosService } from '@/services/servicios.service';
import { valoracionesService } from '@/services/valoraciones.service';
import { LanguageModal, useLanguageLabel } from '@/components/LanguageSelector';
import { useTranslation, type TranslateFn } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import { confirm } from '@/utils/confirm';
import { seedCatalogo } from '@/services/seed-catalogo';
import type { PerfilProfesionalSignup } from '@/types/models';

const ANTICIPO_VALUES: (0 | 20 | 50 | 100)[] = [0, 20, 50, 100];

function anticipoLabel(pct: number, t: TranslateFn): string {
  return pct === 0 ? t('perfil.profesional.anticipoSin') : t('perfil.profesional.anticipoPct', { pct });
}

export default function PerfilProfesionalScreen() {
  const { user, logout, switchRole, updateUser, refreshUser } = useSession();
  const { colors, isDark, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const idiomaActual = useLanguageLabel();
  const [idiomaModal, setIdiomaModal] = useState(false);
  const perfil = user?.perfil as PerfilProfesionalSignup | undefined;
  const [conectandoMP, setConectandoMP] = useState(false);
  const [horariosLabel, setHorariosLabel] = useState<string | null>(null);
  const [cantServicios, setCantServicios] = useState(0);
  const [cantResenas, setCantResenas] = useState(0);
  const [ratingProm, setRatingProm] = useState(0);

  // Recargar datos cada vez que la pantalla gana foco
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      disponibilidadService.listar(user.id).then((slots) => {
        if (slots.length > 0) {
          const diasNombres = t('comun.diasCortos').split(',');
          const resumen = slots.map((s) => diasNombres[s.diaSemana]).join(', ');
          setHorariosLabel(resumen);
        } else {
          setHorariosLabel(null);
        }
      });
      serviciosService.listar(user.id).then((svcs) => setCantServicios(svcs.length));
      valoracionesService.obtenerResumen(user.id).then((r) => {
        setCantResenas(r.cantidad);
        setRatingProm(r.rating);
      });
    }, [user?.id, t]),
  );

  const conectarMP = async () => {
    if (!user) return;
    setConectandoMP(true);
    const res = await conectarMercadoPago(user.id);
    setConectandoMP(false);
    if (res === 'ok') {
      await refreshUser();
      Alert.alert(t('perfil.compartido.cuentaConectadaTitulo'), t('perfil.profesional.cuentaConectadaMsg'));
    } else if (res === 'error') {
      Alert.alert(t('perfil.compartido.mpErrorTitulo'), t('perfil.compartido.mpErrorMsg'));
    }
  };

  const modalidadLabel =
    perfil?.modalidad === 'salon'
      ? t('perfil.profesional.modalidadSalon')
      : perfil?.modalidad === 'domicilio'
        ? t('perfil.profesional.modalidadDomicilio')
        : perfil?.modalidad === 'ambos'
          ? t('perfil.profesional.modalidadAmbos')
          : t('perfil.profesional.modalidadSinDefinir');

  const [perfilPublico, setPerfilPublico] = useState(perfil?.perfilVisible !== false);
  const [anticipo, setAnticipo] = useState<0 | 20 | 50 | 100>(perfil?.anticipoPorcentaje ?? 20);
  const [autoConfirmar, setAutoConfirmar] = useState(perfil?.autoConfirmarTurnos ?? false);
  const [pushEnabled, setPushEnabled] = useState(true);

  const elegirAnticipo = () => {
    Alert.alert(
      t('perfil.profesional.anticipoTitulo'),
      t('perfil.profesional.anticipoMsg'),
      ANTICIPO_VALUES.map((value) => ({
        text: anticipoLabel(value, t),
        onPress: async () => {
          setAnticipo(value);
          try {
            await updateUser({
              perfil: { ...(perfil as PerfilProfesionalSignup), anticipoPorcentaje: value },
            });
          } catch {
            setAnticipo(anticipo); // revertir
          }
        },
      })).concat([{ text: t('comun.cancelar'), onPress: async () => {} }]),
    );
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

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xxl, paddingBottom: spacing.huge }}>
        <ScreenHeader eyebrow={t('perfil.profesional.eyebrow')} title={t('perfil.profesional.titulo')} />

        <View style={styles.userBox}>
          <Avatar nombre={user?.nombre ?? '-'} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.nombre}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <Text style={styles.tel}>
            {(user?.perfil as any)?.ciudad ?? t('perfil.profesional.sinUbicacion')} - {t('perfil.profesional.activa')}
          </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{cantResenas}</Text>
            <Text style={styles.statLbl}>{t('perfil.profesional.statsResenas')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{ratingProm > 0 ? ratingProm.toFixed(1) : '—'}</Text>
            <Text style={styles.statLbl}>{t('perfil.profesional.statsRating')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{cantServicios}</Text>
            <Text style={styles.statLbl}>{t('perfil.profesional.statsServicios')}</Text>
          </View>
        </View>

        {perfil?.fotoSalonUrl ? (
          <Image
            source={{ uri: perfil.fotoSalonUrl }}
            style={styles.fotoSalon}
            resizeMode="cover"
          />
        ) : null}

        <SettingsGroup title={t('perfil.profesional.grupoMiNegocio')}>
          <SettingsRow
            icon="storefront-outline"
            label={t('perfil.profesional.datosNegocio')}
            description={`${perfil?.nombreNegocio ?? perfil?.especialidad ?? t('perfil.profesional.sinEspecialidad')} · ${modalidadLabel}`}
            onPress={() => router.push('/(profesional)/editar-negocio')}
          />
          <SettingsRow
            icon="cut-outline"
            label={t('perfil.profesional.serviciosPrecios')}
            description={`${cantServicios} ${cantServicios === 1 ? t('perfil.profesional.activo') : t('perfil.profesional.activos')}`}
            onPress={() => router.push('/(profesional)/servicios')}
          />
          <SettingsRow
            icon="time-outline"
            label={t('perfil.profesional.horarios')}
            description={horariosLabel ?? t('perfil.profesional.sinConfigurar')}
            onPress={() => router.push('/(profesional)/horarios')}
          />
          <SettingsRow
            icon="star-outline"
            label={t('perfil.profesional.reputacion')}
            description={
              ratingProm > 0
                ? t('perfil.profesional.reputacionDesc', { rating: ratingProm.toFixed(1), count: cantResenas })
                : t('perfil.profesional.sinValoraciones')
            }
            isLast
            onPress={() => router.push('/(profesional)/reputacion')}
          />
        </SettingsGroup>

        <SettingsGroup title={t('perfil.profesional.grupoReservas')}>
          <SettingsRow
            icon="eye-outline"
            label={t('perfil.profesional.perfilVisible')}
            description={t('perfil.profesional.perfilVisibleDesc')}
            toggle={perfilPublico}
            onToggle={async (val) => {
              setPerfilPublico(val);
              try {
                await updateUser({
                  perfil: { ...(perfil as PerfilProfesionalSignup), perfilVisible: val },
                });
              } catch {
                setPerfilPublico(!val); // revertir si falla
              }
            }}
          />
          <SettingsRow
            icon="checkmark-done-outline"
            label={t('perfil.profesional.autoConfirmar')}
            description={t('perfil.profesional.autoConfirmarDesc')}
            toggle={autoConfirmar}
            onToggle={async (val) => {
              setAutoConfirmar(val);
              try {
                await updateUser({
                  perfil: { ...(perfil as PerfilProfesionalSignup), autoConfirmarTurnos: val },
                });
              } catch {
                setAutoConfirmar(!val);
              }
            }}
          />
          <SettingsRow
            icon="cash-outline"
            label={t('perfil.profesional.anticipo')}
            value={anticipoLabel(anticipo, t)}
            isLast
            onPress={elegirAnticipo}
          />
        </SettingsGroup>

        <SettingsGroup title={t('perfil.compartido.grupoCobros')}>
          <SettingsRow
            icon="card-outline"
            label={user?.mpConectado ? t('perfil.compartido.mpConectado') : t('perfil.compartido.conectarMP')}
            description={
              conectandoMP
                ? t('perfil.compartido.abriendoMP')
                : user?.mpConectado
                  ? t('perfil.profesional.mpDescConectado')
                  : t('perfil.profesional.mpDescConectar')
            }
            isLast
            onPress={conectarMP}
          />
        </SettingsGroup>

        <SettingsGroup title={t('perfil.compartido.grupoNotificaciones')}>
          <SettingsRow
            icon="notifications-outline"
            label={t('perfil.compartido.notifPush')}
            toggle={pushEnabled}
            onToggle={setPushEnabled}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup title={t('perfil.compartido.grupoConfiguracion')}>
          <SettingsRow
            icon="language-outline"
            label={t('idioma.titulo')}
            description={t('idioma.descripcion')}
            value={idiomaActual}
            onPress={() => setIdiomaModal(true)}
          />
          <SettingsRow
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            label={t('perfil.profesional.temaOscuro')}
            description={isDark ? t('perfil.profesional.activado') : t('perfil.profesional.desactivado')}
            toggle={isDark}
            onToggle={toggleTheme}
            isLast
          />
        </SettingsGroup>

        <SettingsGroup title={t('perfil.compartido.grupoCuenta')}>
          <SettingsRow
            icon="person-outline"
            label={t('perfil.profesional.vistaCliente')}
            description={t('perfil.profesional.vistaClienteDesc')}
            onPress={() => switchRole('cliente')}
          />
          <SettingsRow
            icon="log-out-outline"
            label={t('perfil.compartido.cerrarSesion')}
            destructive
            isLast
            onPress={confirmarLogout}
          />
        </SettingsGroup>

        <SettingsGroup title={t('perfil.profesional.grupoDesarrollo')}>
          <SettingsRow
            icon="cloud-upload-outline"
            label={t('perfil.profesional.seedLabel')}
            description={t('perfil.profesional.seedDesc')}
            isLast
            onPress={async () => {
              try {
                const res = await seedCatalogo();
                Alert.alert(
                  t('perfil.profesional.seedCompletado'),
                  t('perfil.profesional.seedMsg', { categorias: res.categorias, servicios: res.servicios }),
                );
              } catch (err: any) {
                Alert.alert(t('comun.error'), err.message);
              }
            }}
          />
        </SettingsGroup>
      </ScrollView>
      <LanguageModal visible={idiomaModal} onClose={() => setIdiomaModal(false)} />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
  tel: { fontSize: 14, color: c.success, marginTop: 4, fontWeight: '500' },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  statVal: { fontSize: 24, fontWeight: '700', color: c.primary },
  statLbl: { fontSize: 11, color: c.muted, marginTop: 4 },
  fotoSalon: {
    width: '100%',
    height: 180,
    borderRadius: radius.xl,
    marginTop: spacing.xl,
  },
});
