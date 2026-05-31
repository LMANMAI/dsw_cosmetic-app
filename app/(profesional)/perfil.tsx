import React, { useCallback, useState, useMemo } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { useSession } from '@/context/SessionContext';
import { disponibilidadService } from '@/services/disponibilidad.service';
import { serviciosService } from '@/services/servicios.service';
import { valoracionesService } from '@/services/valoraciones.service';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import { confirm } from '@/utils/confirm';
import { seedCatalogo } from '@/services/seed-catalogo';
import type { PerfilProfesionalSignup } from '@/types/models';

const ANTICIPO_OPTIONS: { label: string; value: 0 | 20 | 50 | 100 }[] = [
  { label: 'Sin anticipo', value: 0 },
  { label: '20% del monto', value: 20 },
  { label: '50% del monto', value: 50 },
  { label: '100% del monto', value: 100 },
];

function anticipoLabel(pct: number): string {
  return ANTICIPO_OPTIONS.find((o) => o.value === pct)?.label ?? '20% del monto';
}

export default function PerfilProfesionalScreen() {
  const { user, logout, switchRole, updateUser } = useSession();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const perfil = user?.perfil as PerfilProfesionalSignup | undefined;
  const [horariosLabel, setHorariosLabel] = useState('Sin configurar');
  const [cantServicios, setCantServicios] = useState(0);
  const [cantResenas, setCantResenas] = useState(0);
  const [ratingProm, setRatingProm] = useState(0);

  // Recargar datos cada vez que la pantalla gana foco
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      disponibilidadService.listar(user.id).then((slots) => {
        if (slots.length > 0) {
          const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          const resumen = slots.map((s) => diasNombres[s.diaSemana]).join(', ');
          setHorariosLabel(resumen);
        } else {
          setHorariosLabel('Sin configurar');
        }
      });
      serviciosService.listar(user.id).then((svcs) => setCantServicios(svcs.length));
      valoracionesService.obtenerResumen(user.id).then((r) => {
        setCantResenas(r.cantidad);
        setRatingProm(r.rating);
      });
    }, [user?.id]),
  );

  const modalidadLabel =
    perfil?.modalidad === 'salon'
      ? 'Salón'
      : perfil?.modalidad === 'domicilio'
        ? 'A domicilio'
        : perfil?.modalidad === 'ambos'
          ? 'Salón y domicilio'
          : 'Sin definir';

  const [perfilPublico, setPerfilPublico] = useState(perfil?.perfilVisible !== false);
  const [anticipo, setAnticipo] = useState<0 | 20 | 50 | 100>(perfil?.anticipoPorcentaje ?? 20);
  const [autoConfirmar, setAutoConfirmar] = useState(perfil?.autoConfirmarTurnos ?? false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [recordatorioCliente, setRecordatorioCliente] = useState('24h antes');

  const elegirAnticipo = () => {
    Alert.alert(
      'Anticipo de pago',
      'Cuanto se le pide al cliente al reservar.',
      ANTICIPO_OPTIONS.map((opt) => ({
        text: opt.label,
        onPress: async () => {
          setAnticipo(opt.value);
          try {
            await updateUser({
              perfil: { ...(perfil as PerfilProfesionalSignup), anticipoPorcentaje: opt.value },
            });
          } catch {
            setAnticipo(anticipo); // revertir
          }
        },
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

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xxl, paddingBottom: spacing.huge }}>
        <ScreenHeader eyebrow="Tu negocio" title="Mi perfil profesional" />

        <View style={styles.userBox}>
          <Avatar nombre={user?.nombre ?? '-'} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.nombre}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <Text style={styles.tel}>
            {(user?.perfil as any)?.ciudad ?? 'Sin ubicación'} - Activa
          </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{cantResenas}</Text>
            <Text style={styles.statLbl}>Resenas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{ratingProm > 0 ? ratingProm.toFixed(1) : '—'}</Text>
            <Text style={styles.statLbl}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{cantServicios}</Text>
            <Text style={styles.statLbl}>Servicios</Text>
          </View>
        </View>

        {perfil?.fotoSalonUrl ? (
          <Image
            source={{ uri: perfil.fotoSalonUrl }}
            style={styles.fotoSalon}
            resizeMode="cover"
          />
        ) : null}

        <SettingsGroup title="Mi negocio">
          <SettingsRow
            icon="storefront-outline"
            label="Datos del negocio"
            description={`${perfil?.nombreNegocio ?? perfil?.especialidad ?? 'Sin especialidad'} · ${modalidadLabel}`}
            onPress={() => router.push('/(profesional)/editar-negocio')}
          />
          <SettingsRow
            icon="cut-outline"
            label="Servicios y precios"
            description={`${cantServicios} ${cantServicios === 1 ? 'activo' : 'activos'}`}
            onPress={() => router.push('/(profesional)/servicios')}
          />
          <SettingsRow
            icon="time-outline"
            label="Horarios laborales"
            description={horariosLabel}
            onPress={() => router.push('/(profesional)/horarios')}
          />
          <SettingsRow
            icon="star-outline"
            label="Mi reputación"
            description={ratingProm > 0 ? `${ratingProm.toFixed(1)} ★ · ${cantResenas} reseñas` : 'Sin valoraciones aún'}
            isLast
            onPress={() => router.push('/(profesional)/reputacion')}
          />
        </SettingsGroup>

        <SettingsGroup title="Reservas">
          <SettingsRow
            icon="eye-outline"
            label="Perfil visible al publico"
            description="Si esta apagado, no aparecemos en busquedas"
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
            label="Auto-confirmar turnos"
            description="Aceptar reservas sin revision manual"
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
            label="Anticipo al reservar"
            value={anticipoLabel(anticipo)}
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

        <SettingsGroup title="Apariencia">
          <SettingsRow
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            label="Tema oscuro"
            description={isDark ? 'Activado' : 'Desactivado'}
            toggle={isDark}
            onToggle={toggleTheme}
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

        <SettingsGroup title="Desarrollo">
          <SettingsRow
            icon="cloud-upload-outline"
            label="Subir catálogo a Firestore"
            description="Sube categorías y servicios a la base de datos"
            isLast
            onPress={async () => {
              try {
                const res = await seedCatalogo();
                Alert.alert(
                  'Seed completado',
                  `${res.categorias} categorías y ${res.servicios} servicios subidos.`,
                );
              } catch (err: any) {
                Alert.alert('Error', err.message);
              }
            }}
          />
        </SettingsGroup>
      </ScrollView>
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
