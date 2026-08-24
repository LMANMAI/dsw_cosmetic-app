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
import { useTranslation } from '@/i18n';
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
  const { t } = useTranslation();
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
      Alert.alert(t('cliente.datos.permisoRequeridoTitulo'), t('cliente.datos.permisoGaleriaMsg'));
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
      Alert.alert(t('comun.error'), t('cliente.datos.errorSubirImagen'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const guardar = async () => {
    if (!nombre.trim()) {
      Alert.alert(t('cliente.datos.campoRequeridoTitulo'), t('cliente.datos.nombreVacioMsg'));
      return;
    }
    const fecha = fechaNacimiento.trim();
    if (fecha && !validarFechaNacimiento(fecha)) {
      Alert.alert(t('cliente.datos.fechaInvalidaTitulo'), t('cliente.datos.fechaInvalidaMsg'));
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
      Alert.alert(t('cliente.datos.guardadoTitulo'), t('cliente.datos.guardadoMsg'), [
        { text: t('comun.aceptar'), onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(t('comun.error'), err.message ?? t('cliente.datos.errorGuardarMsg'));
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
          <ScreenHeader eyebrow={t('perfil.compartido.tuCuenta')} title={t('cliente.datos.titulo')} />

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
          <Text style={styles.label}>{t('cliente.datos.nombreCompleto')}</Text>
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder={t('cliente.datos.nombrePlaceholder')}
            placeholderTextColor={colors.muted}
          />

          {/* Email (solo lectura) */}
          <Text style={styles.label}>{t('cliente.datos.email')}</Text>
          <Text style={styles.hint}>{t('cliente.datos.emailHint')}</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={{ color: colors.muted, fontSize: 15 }}>{user?.email ?? '-'}</Text>
          </View>

          {/* Teléfono */}
          <Text style={styles.label}>{t('cliente.datos.telefono')}</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="call-outline" size={18} color={colors.muted} />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={telefono}
              onChangeText={setTelefono}
              placeholder={t('cliente.datos.telefonoPlaceholder')}
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
            />
          </View>

          {/* Ciudad */}
          <Text style={styles.label}>{t('cliente.datos.ciudad')}</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="location-outline" size={18} color={colors.muted} />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={ciudad}
              onChangeText={setCiudad}
              placeholder={t('cliente.datos.ciudadPlaceholder')}
              placeholderTextColor={colors.muted}
            />
          </View>

          {/* Fecha de nacimiento */}
          <Text style={styles.label}>{t('cliente.datos.fechaNacimiento')}</Text>
          <Text style={styles.hint}>{t('cliente.datos.fechaHint')}</Text>
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
            label={t('cliente.datos.guardarCambios')}
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
