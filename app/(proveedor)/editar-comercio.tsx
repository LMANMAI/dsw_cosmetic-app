import React, { useEffect, useMemo, useState } from 'react';
import {
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/Button';
import { AuthSelect } from '@/components/auth/AuthShell';
import { DireccionAutocomplete, type DireccionSeleccionada } from '@/components/DireccionAutocomplete';
import { useSession } from '@/context/SessionContext';
import { rubrosService } from '@/services/rubros.service';
import type { Rubro } from '@/data/rubros';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import { formatCuit, cuitValido } from '@/utils/format';
import type { PerfilProveedor } from '@/types/models';

export default function EditarComercioScreen() {
  const { user, updateUser } = useSession();
  const { colors } = useTheme();
  const router = useRouter();
  const perfil = user?.perfil as PerfilProveedor | undefined;
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [razonSocial, setRazonSocial] = useState(perfil?.razonSocial ?? '');
  const [cuit, setCuit] = useState(perfil?.cuit ?? '');
  const [rubro, setRubro] = useState(perfil?.rubro ?? '');
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [rubrosLoading, setRubrosLoading] = useState(false);
  const [direccionData, setDireccionData] = useState<DireccionSeleccionada | null>(
    perfil?.direccion
      ? {
          direccion: perfil.direccion,
          ciudad: perfil.ciudad,
          latitud: perfil.latitud ?? 0,
          longitud: perfil.longitud ?? 0,
        }
      : null,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRubrosLoading(true);
    rubrosService
      .listar()
      .then(setRubros)
      .finally(() => setRubrosLoading(false));
  }, []);

  const guardar = async () => {
    if (!razonSocial.trim()) {
      Alert.alert('Falta la razón social', 'Ingresá la razón social del comercio.');
      return;
    }
    if (!cuitValido(cuit)) {
      Alert.alert('CUIT inválido', 'Revisá el CUIT (XX-XXXXXXXX-X).');
      return;
    }
    if (!rubro) {
      Alert.alert('Falta el rubro', 'Elegí el rubro del comercio.');
      return;
    }
    if (!direccionData) {
      Alert.alert('Falta la dirección', 'Seleccioná la dirección del comercio en el buscador.');
      return;
    }
    setSaving(true);
    try {
      const updatedPerfil: PerfilProveedor = {
        ...(perfil as PerfilProveedor),
        razonSocial: razonSocial.trim(),
        cuit: cuit.trim(),
        rubro,
        ciudad: direccionData.ciudad,
        direccion: direccionData.direccion,
        latitud: direccionData.latitud,
        longitud: direccionData.longitud,
      };
      await updateUser({ perfil: updatedPerfil });
      Alert.alert('Guardado', 'Los datos del comercio se actualizaron.', [
        { text: 'OK', onPress: () => router.navigate('/(proveedor)/perfil') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => router.navigate('/(proveedor)/perfil')}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>
          <ScreenHeader eyebrow="Tu comercio" title="Editar datos del comercio" />

          <Text style={styles.label}>Razón social</Text>
          <TextInput
            style={styles.input}
            value={razonSocial}
            onChangeText={setRazonSocial}
            placeholder="Razón social del comercio"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.label}>CUIT</Text>
          <TextInput
            style={styles.input}
            value={cuit}
            onChangeText={(t) => setCuit(formatCuit(t))}
            placeholder="XX-XXXXXXXX-X"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            maxLength={13}
          />

          <Text style={styles.label}>Rubro</Text>
          <View style={styles.selectWrap}>
            <AuthSelect
              icon="cube-outline"
              placeholder={rubrosLoading ? 'Cargando rubros…' : 'Elegí tu rubro'}
              title="¿Qué rubro vendés?"
              value={rubro || null}
              loading={rubrosLoading}
              options={rubros.map((r) => ({ label: r.nombre, value: r.nombre, emoji: r.emoji }))}
              onChange={setRubro}
            />
          </View>

          <Text style={styles.label}>Dirección del comercio</Text>
          {direccionData ? (
            <View style={styles.direccionActual}>
              <View style={{ flex: 1 }}>
                <Text style={styles.direccionText}>
                  {direccionData.direccion}, {direccionData.ciudad}
                </Text>
              </View>
              <Pressable onPress={() => setDireccionData(null)} hitSlop={8}>
                <Text style={styles.cambiar}>Cambiar</Text>
              </Pressable>
            </View>
          ) : (
            <DireccionAutocomplete
              onSelect={setDireccionData}
              placeholder="Buscá la dirección del comercio…"
            />
          )}

          <Button
            label="Guardar cambios"
            onPress={guardar}
            loading={saving}
            disabled={saving}
            fullWidth
            style={{ marginTop: spacing.xxl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { padding: spacing.xxl, paddingBottom: spacing.huge },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: spacing.md,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: c.ink,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    input: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: c.ink,
    },
    selectWrap: { marginBottom: -spacing.sm },
    direccionActual: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
      gap: spacing.md,
    },
    direccionText: { fontSize: 14, lineHeight: 20, color: c.ink },
    cambiar: { color: c.primary, fontWeight: '600', fontSize: 13 },
  });
