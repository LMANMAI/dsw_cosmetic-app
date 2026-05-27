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
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import { confirm } from '@/utils/confirm';
import { seedCatalogo } from '@/services/seed-catalogo';
import type { PerfilProfesionalSignup } from '@/types/models';

const ANTICIPO_OPTIONS = ['Sin anticipo', '20% del monto', '50% del monto', '100% del monto'];

export default function PerfilProfesionalScreen() {
  const { user, logout, switchRole } = useSession();
  const { colors } = useTheme();
  const router = useRouter();
  const perfil = user?.perfil as PerfilProfesionalSignup | undefined;
  const [horariosLabel, setHorariosLabel] = useState('Sin configurar');

  // Recargar label de horarios cada vez que la pantalla gana foco
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
            <Text style={styles.statVal}>0</Text>
            <Text style={styles.statLbl}>Resenas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>—</Text>
            <Text style={styles.statLbl}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>0</Text>
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
            description={`${perfil?.especialidad ?? 'Sin especialidad'} · ${modalidadLabel}`}
            onPress={() => Alert.alert('Proximamente', 'Editor de negocio.')}
          />
          <SettingsRow
            icon="navigate-outline"
            label="Dirección"
            description={perfil?.direccion || 'Sin dirección'}
            onPress={() => Alert.alert('Proximamente', 'Editar dirección.')}
          />
          {perfil?.instagram ? (
            <SettingsRow
              icon="logo-instagram"
              label="Instagram"
              description={`@${perfil.instagram}`}
              onPress={() => Alert.alert('Proximamente', 'Editar Instagram.')}
            />
          ) : null}
          <SettingsRow
            icon="cut-outline"
            label="Servicios y precios"
            description="0 activos"
            onPress={() => Alert.alert('Proximamente', 'Gestion de servicios.')}
          />
          <SettingsRow
            icon="time-outline"
            label="Horarios laborales"
            description={horariosLabel}
            isLast
            onPress={() => router.push('/(profesional)/horarios')}
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
