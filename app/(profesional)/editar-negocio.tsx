import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { DireccionAutocomplete, type DireccionSeleccionada } from '@/components/DireccionAutocomplete';
import { useSession } from '@/context/SessionContext';
import { uploadImage } from '@/services/upload.service';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import type { PerfilProfesionalSignup, ModalidadTrabajo } from '@/types/models';

const MODALIDAD_OPTIONS: { value: ModalidadTrabajo; label: string }[] = [
  { value: 'salon', label: 'Salón' },
  { value: 'domicilio', label: 'A domicilio' },
  { value: 'ambos', label: 'Ambos' },
];

export default function EditarNegocioScreen() {
  const { user, updateUser } = useSession();
  const { colors } = useTheme();
  const router = useRouter();
  const perfil = user?.perfil as PerfilProfesionalSignup | undefined;

  // Estado del formulario inicializado con datos actuales
  const [nombreNegocio, setNombreNegocio] = useState(perfil?.nombreNegocio ?? user?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(perfil?.descripcion ?? '');
  const [especialidad, setEspecialidad] = useState(perfil?.especialidad ?? '');
  const [instagram, setInstagram] = useState(perfil?.instagram ?? '');
  const [sitioWeb, setSitioWeb] = useState(perfil?.sitioWeb ?? '');
  const [telefonoContacto, setTelefonoContacto] = useState(perfil?.telefonoContacto ?? user?.telefono ?? '');
  const [modalidad, setModalidad] = useState<ModalidadTrabajo>(perfil?.modalidad ?? 'salon');
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
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl ?? null);
  const [fotoSalonUri, setFotoSalonUri] = useState<string | null>(perfil?.fotoSalonUrl ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingSalon, setUploadingSalon] = useState(false);
  const [saving, setSaving] = useState(false);

  const elegirImagen = async (
    tipo: 'avatar' | 'salon',
  ) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: tipo === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    const setLoading = tipo === 'avatar' ? setUploadingAvatar : setUploadingSalon;
    setLoading(true);
    try {
      const folder = tipo === 'avatar' ? 'avatars' : 'salones';
      const url = await uploadImage(uri, folder);
      if (tipo === 'avatar') {
        setAvatarUri(url);
      } else {
        setFotoSalonUri(url);
      }
    } catch {
      Alert.alert('Error', 'No se pudo subir la imagen. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const guardar = async () => {
    if (!nombreNegocio.trim()) {
      Alert.alert('Campo requerido', 'El nombre del negocio no puede estar vacío.');
      return;
    }
    setSaving(true);
    try {
      const updatedPerfil: PerfilProfesionalSignup = {
        ...(perfil as PerfilProfesionalSignup),
        nombreNegocio: nombreNegocio.trim(),
        descripcion: descripcion.trim(),
        especialidad: especialidad.trim(),
        instagram: instagram.trim().replace(/^@/, ''),
        sitioWeb: sitioWeb.trim(),
        telefonoContacto: telefonoContacto.trim(),
        modalidad,
        ...(direccionData
          ? {
              direccion: direccionData.direccion,
              ciudad: direccionData.ciudad,
              latitud: direccionData.latitud,
              longitud: direccionData.longitud,
            }
          : {}),
      };
      const updatePayload: Record<string, unknown> = { perfil: updatedPerfil };
      if (avatarUri && avatarUri !== user?.avatarUrl) {
        updatePayload.avatarUrl = avatarUri;
      }
      if (fotoSalonUri && fotoSalonUri !== perfil?.fotoSalonUrl) {
        updatedPerfil.fotoSalonUrl = fotoSalonUri;
      }
      await updateUser(updatePayload);
      Alert.alert('Guardado', 'Los datos del negocio se actualizaron correctamente.', [
        { text: 'OK', onPress: () => router.navigate('/(profesional)/perfil') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header con botón atrás */}
          <Pressable onPress={() => router.navigate('/(profesional)/perfil')} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>
          <ScreenHeader eyebrow="Tu negocio" title="Editar datos del negocio" />

          {/* Foto de perfil */}
          <Text style={styles.label}>Foto de perfil</Text>
          <Text style={styles.hint}>La imagen que verán tus clientes en búsquedas y tu perfil</Text>
          <Pressable style={styles.avatarPicker} onPress={() => elegirImagen('avatar')}>
            {uploadingAvatar ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <Avatar nombre={user?.nombre ?? '-'} size={90} />
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </View>
          </Pressable>

          {/* Foto del salón */}
          <Text style={styles.label}>Foto del salón / espacio de trabajo</Text>
          <Text style={styles.hint}>Mostrá tu espacio para generar confianza</Text>
          <Pressable style={styles.salonPicker} onPress={() => elegirImagen('salon')}>
            {uploadingSalon ? (
              <View style={styles.salonPlaceholder}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : fotoSalonUri ? (
              <Image source={{ uri: fotoSalonUri }} style={styles.salonImg} />
            ) : (
              <View style={styles.salonPlaceholder}>
                <Ionicons name="image-outline" size={32} color={colors.muted} />
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: 8 }}>
                  Tocar para agregar foto
                </Text>
              </View>
            )}
            <View style={styles.salonEditBadge}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </View>
          </Pressable>

          {/* Nombre del negocio */}
          <Text style={styles.label}>Nombre del negocio</Text>
          <Text style={styles.hint}>Es el nombre que verán tus clientes</Text>
          <TextInput
            style={styles.input}
            value={nombreNegocio}
            onChangeText={setNombreNegocio}
            placeholder="Ej: Nails by Ana"
            placeholderTextColor={colors.muted}
          />

          {/* Descripción */}
          <Text style={styles.label}>Descripción / Bio</Text>
          <Text style={styles.hint}>Contá brevemente qué hacés y qué te diferencia</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Ej: Especialista en diseño de uñas con 5 años de experiencia..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Especialidad */}
          <Text style={styles.label}>Especialidad</Text>
          <TextInput
            style={styles.input}
            value={especialidad}
            onChangeText={setEspecialidad}
            placeholder="Ej: Manicura, Pestañas"
            placeholderTextColor={colors.muted}
          />

          {/* Modalidad */}
          <Text style={styles.label}>Modalidad de trabajo</Text>
          <View style={styles.chipRow}>
            {MODALIDAD_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: modalidad === opt.value ? colors.primary : colors.surface,
                    borderColor: modalidad === opt.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setModalidad(opt.value)}
              >
                <Text
                  style={{
                    color: modalidad === opt.value ? colors.white : colors.ink,
                    fontWeight: '600',
                    fontSize: 14,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Dirección */}
          <Text style={styles.label}>Dirección</Text>
          {direccionData ? (
            <View style={styles.direccionActual}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.direccionText, { color: colors.ink }]}>
                  {direccionData.direccion}, {direccionData.ciudad}
                </Text>
              </View>
              <Pressable onPress={() => setDireccionData(null)} hitSlop={8}>
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>Cambiar</Text>
              </Pressable>
            </View>
          ) : (
            <DireccionAutocomplete
              onSelect={(d) => setDireccionData(d)}
              placeholder="Buscá tu nueva dirección..."
            />
          )}

          {/* Instagram */}
          <Text style={styles.label}>Instagram</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="logo-instagram" size={18} color={colors.muted} />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={instagram}
              onChangeText={setInstagram}
              placeholder="tu_usuario"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
            />
          </View>

          {/* Sitio web */}
          <Text style={styles.label}>Sitio web o link</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="globe-outline" size={18} color={colors.muted} />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={sitioWeb}
              onChangeText={setSitioWeb}
              placeholder="https://mi-sitio.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* Teléfono de contacto */}
          <Text style={styles.label}>Teléfono de contacto</Text>
          <Text style={styles.hint}>Número público que verán tus clientes</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="call-outline" size={18} color={colors.muted} />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={telefonoContacto}
              onChangeText={setTelefonoContacto}
              placeholder="Ej: 3515551234"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
            />
          </View>

          {/* Botón guardar */}
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
      marginBottom: spacing.xs,
    },
    hint: {
      fontSize: 12,
      color: c.muted,
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
      marginBottom: spacing.sm,
    },
    textArea: {
      minHeight: 100,
      paddingTop: spacing.md,
    },
    chipRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    inputWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      paddingLeft: spacing.lg,
      marginBottom: spacing.sm,
    },
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
    direccionText: {
      fontSize: 14,
      lineHeight: 20,
    },
    /* ── Foto de perfil ── */
    avatarPicker: {
      alignSelf: 'center',
      marginBottom: spacing.md,
      position: 'relative' as const,
    },
    avatarImg: {
      width: 90,
      height: 90,
      borderRadius: 45,
    },
    avatarPlaceholder: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEditBadge: {
      position: 'absolute' as const,
      bottom: 0,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.background,
    },
    /* ── Foto del salón ── */
    salonPicker: {
      position: 'relative' as const,
      marginBottom: spacing.md,
    },
    salonImg: {
      width: '100%',
      height: 180,
      borderRadius: radius.xl,
    },
    salonPlaceholder: {
      width: '100%',
      height: 180,
      borderRadius: radius.xl,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
      borderStyle: 'dashed' as const,
    },
    salonEditBadge: {
      position: 'absolute' as const,
      bottom: 12,
      right: 12,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
