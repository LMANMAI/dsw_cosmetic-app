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
import { useSession } from '@/context/SessionContext';
import { uploadImage } from '@/services/upload.service';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import type { PerfilCliente } from '@/types/models';

/** Valida formato ISO YYYY-MM-DD y que sea una fecha real pasada. */
function validarFechaNacimiento(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const fecha = new Date(`${value}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return false;
  return fecha < new Date();
}

export default function DatosPersonalesScreen() {
  const { user, updateUser } = useSession();
  const { colors } = useTheme();
  const router = useRouter();
  const perfil = (user?.perfil as PerfilCliente | undefined) ?? {};

  const [nombre, setNombre] = useState(user?.nombre ?? '');
  const [telefono, setTelefono] = useState(user?.telefono ?? '');
  const [ciudad, setCiudad] = useState(perfil.ciudad ?? '');
  const [fechaNacimiento, setFechaNacimiento] = useState(perfil.fechaNacimiento ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  const elegirAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      const url = await uploadImage(result.assets[0].uri, 'avatars');
      setAvatarUri(url);
    } catch {
      Alert.alert('Error', 'No se pudo subir la imagen. Intentá de nuevo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const guardar = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'El nombre no puede estar vacío.');
      return;
    }
    const fecha = fechaNacimiento.trim();
    if (fecha && !validarFechaNacimiento(fecha)) {
      Alert.alert('Fecha inválida', 'Usá el formato AAAA-MM-DD, por ejemplo 1995-08-24.');
      return;
    }
    setSaving(true);
    try {
      const updatedPerfil: PerfilCliente = {
        ...perfil,
        ciudad: ciudad.trim() || undefined,
        fechaNacimiento: fecha || undefined,
      };
      const payload: Record<string, unknown> = {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        perfil: updatedPerfil,
      };
      if (avatarUri && avatarUri !== user?.avatarUrl) {
        payload.avatarUrl = avatarUri;
      }
      await updateUser(payload);
      Alert.alert('Guardado', 'Tus datos se actualizaron correctamente.', [
        { text: 'OK', onPress: () => router.back() },
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
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>
          <ScreenHeader eyebrow="Tu cuenta" title="Datos personales" />

          {/* Foto de perfil */}
          <Pressable style={styles.avatarPicker} onPress={elegirAvatar}>
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

          {/* Nombre */}
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Tu nombre"
            placeholderTextColor={colors.muted}
          />

          {/* Email (solo lectura) */}
          <Text style={styles.label}>Email</Text>
          <Text style={styles.hint}>El email de tu cuenta no se puede cambiar desde acá</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={{ color: colors.muted, fontSize: 15 }}>{user?.email ?? '-'}</Text>
          </View>

          {/* Teléfono */}
          <Text style={styles.label}>Teléfono</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="call-outline" size={18} color={colors.muted} />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={telefono}
              onChangeText={setTelefono}
              placeholder="Ej: 3515551234"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
            />
          </View>

          {/* Ciudad */}
          <Text style={styles.label}>Ciudad</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="location-outline" size={18} color={colors.muted} />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={ciudad}
              onChangeText={setCiudad}
              placeholder="Ej: Córdoba"
              placeholderTextColor={colors.muted}
            />
          </View>

          {/* Fecha de nacimiento */}
          <Text style={styles.label}>Fecha de nacimiento</Text>
          <Text style={styles.hint}>Formato AAAA-MM-DD (opcional)</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="gift-outline" size={18} color={colors.muted} />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={fechaNacimiento}
              onChangeText={setFechaNacimiento}
              placeholder="1995-08-24"
              placeholderTextColor={colors.muted}
              keyboardType={Platform.OS === 'web' ? undefined : 'numbers-and-punctuation'}
              autoCapitalize="none"
            />
          </View>

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
    inputDisabled: {
      backgroundColor: c.surfaceAlt,
      justifyContent: 'center',
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
    avatarPicker: {
      alignSelf: 'center',
      marginTop: spacing.lg,
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
  });
