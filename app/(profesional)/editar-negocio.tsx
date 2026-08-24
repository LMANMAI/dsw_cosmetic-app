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
import { AuthMultiSelect } from '@/components/auth/AuthShell';
import { useSession } from '@/context/SessionContext';
import { useCategorias } from '@/hooks/useCategorias';
import { uploadImage } from '@/services/upload.service';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import type { CategoriaSlug, PerfilProfesionalSignup, ModalidadTrabajo } from '@/types/models';

const MODALIDAD_OPTIONS: { value: ModalidadTrabajo; labelKey: string }[] = [
  { value: 'salon', labelKey: 'profesional.editarNegocio.modalidadSalon' },
  { value: 'domicilio', labelKey: 'profesional.editarNegocio.modalidadDomicilio' },
  { value: 'ambos', labelKey: 'profesional.editarNegocio.modalidadAmbos' },
];

export default function EditarNegocioScreen() {
  const { user, updateUser } = useSession();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const perfil = user?.perfil as PerfilProfesionalSignup | undefined;

  // Estado del formulario inicializado con datos actuales
  const [nombreNegocio, setNombreNegocio] = useState(perfil?.nombreNegocio ?? user?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(perfil?.descripcion ?? '');
  const [especialidades, setEspecialidades] = useState<CategoriaSlug[]>(perfil?.categorias ?? []);
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

  // Especialidades = categorías del catálogo (las mismas de sus servicios).
  const { categorias, loading: categoriasLoading } = useCategorias();

  const opcionesEspecialidad = useMemo(
    () =>
      categorias.map((c) => ({
        value: c.slug,
        label: t(`categorias.${c.slug}`),
        emoji: c.emoji,
      })),
    [categorias, t],
  );

  const especialidadTexto = useMemo(
    () =>
      especialidades
        .map((slug) => opcionesEspecialidad.find((o) => o.value === slug)?.label ?? slug)
        .join(', '),
    [especialidades, opcionesEspecialidad],
  );

  const elegirImagen = async (
    tipo: 'avatar' | 'salon',
  ) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('profesional.editarNegocio.permisoTitulo'), t('profesional.editarNegocio.permisoMsg'));
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
      Alert.alert(t('comun.error'), t('profesional.editarNegocio.errorSubirMsg'));
    } finally {
      setLoading(false);
    }
  };

  const guardar = async () => {
    if (!nombreNegocio.trim()) {
      Alert.alert(t('profesional.editarNegocio.faltaNombreTitulo'), t('profesional.editarNegocio.faltaNombreMsg'));
      return;
    }
    setSaving(true);
    try {
      const updatedPerfil: PerfilProfesionalSignup = {
        ...(perfil as PerfilProfesionalSignup),
        nombreNegocio: nombreNegocio.trim(),
        descripcion: descripcion.trim(),
        especialidad: especialidadTexto,
        categorias: especialidades,
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
      Alert.alert(t('profesional.editarNegocio.guardadoTitulo'), t('profesional.editarNegocio.guardadoMsg'), [
        { text: t('comun.aceptar'), onPress: () => router.navigate('/(profesional)/perfil') },
      ]);
    } catch (err: any) {
      Alert.alert(t('comun.error'), err.message ?? t('profesional.editarNegocio.errorGuardarMsg'));
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
          <ScreenHeader eyebrow={t('profesional.editarNegocio.eyebrow')} title={t('profesional.editarNegocio.titulo')} />

          {/* Foto de perfil */}
          <Text style={styles.label}>{t('profesional.editarNegocio.fotoPerfil')}</Text>
          <Text style={styles.hint}>{t('profesional.editarNegocio.fotoPerfilHint')}</Text>
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
          <Text style={styles.label}>{t('profesional.editarNegocio.fotoSalon')}</Text>
          <Text style={styles.hint}>{t('profesional.editarNegocio.fotoSalonHint')}</Text>
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
                  {t('profesional.editarNegocio.tocarAgregarFoto')}
                </Text>
              </View>
            )}
            <View style={styles.salonEditBadge}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </View>
          </Pressable>

          {/* Nombre del negocio */}
          <Text style={styles.label}>{t('profesional.editarNegocio.nombre')}</Text>
          <Text style={styles.hint}>{t('profesional.editarNegocio.nombreHint')}</Text>
          <TextInput
            style={styles.input}
            value={nombreNegocio}
            onChangeText={setNombreNegocio}
            placeholder={t('profesional.editarNegocio.nombrePlaceholder')}
            placeholderTextColor={colors.muted}
          />

          {/* Descripción */}
          <Text style={styles.label}>{t('profesional.editarNegocio.descripcion')}</Text>
          <Text style={styles.hint}>{t('profesional.editarNegocio.descripcionHint')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder={t('profesional.editarNegocio.descripcionPlaceholder')}
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Especialidad */}
          <Text style={styles.label}>{t('profesional.editarNegocio.especialidad')}</Text>
          <Text style={styles.hint}>{t('profesional.editarNegocio.especialidadHint')}</Text>
          <AuthMultiSelect
            icon="brush-outline"
            placeholder={t('profesional.editarNegocio.especialidadPlaceholder')}
            title={t('auth.signup.especialidadTitulo')}
            values={especialidades}
            options={opcionesEspecialidad}
            onChange={(v) => setEspecialidades(v as CategoriaSlug[])}
            loading={categoriasLoading}
            doneLabel={t('comun.aceptar')}
          />

          {/* Modalidad */}
          <Text style={styles.label}>{t('profesional.editarNegocio.modalidad')}</Text>
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
                  {t(opt.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Dirección */}
          <Text style={styles.label}>{t('profesional.editarNegocio.direccion')}</Text>
          {direccionData ? (
            <View style={styles.direccionActual}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.direccionText, { color: colors.ink }]}>
                  {direccionData.direccion}, {direccionData.ciudad}
                </Text>
              </View>
              <Pressable onPress={() => setDireccionData(null)} hitSlop={8}>
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>{t('profesional.editarNegocio.cambiar')}</Text>
              </Pressable>
            </View>
          ) : (
            <DireccionAutocomplete
              onSelect={(d) => setDireccionData(d)}
              placeholder={t('profesional.editarNegocio.buscarDireccionPlaceholder')}
            />
          )}

          {/* Instagram */}
          <Text style={styles.label}>{t('profesional.editarNegocio.instagram')}</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="logo-instagram" size={18} color={colors.muted} />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={instagram}
              onChangeText={setInstagram}
              placeholder={t('profesional.editarNegocio.instagramPlaceholder')}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
            />
          </View>

          {/* Sitio web */}
          <Text style={styles.label}>{t('profesional.editarNegocio.sitioWeb')}</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="globe-outline" size={18} color={colors.muted} />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={sitioWeb}
              onChangeText={setSitioWeb}
              placeholder={t('profesional.editarNegocio.sitioWebPlaceholder')}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* Teléfono de contacto */}
          <Text style={styles.label}>{t('profesional.editarNegocio.telefono')}</Text>
          <Text style={styles.hint}>{t('profesional.editarNegocio.telefonoHint')}</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="call-outline" size={18} color={colors.muted} />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={telefonoContacto}
              onChangeText={setTelefonoContacto}
              placeholder={t('profesional.editarNegocio.telefonoPlaceholder')}
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
            />
          </View>

          {/* Botón guardar */}
          <Button
            label={t('profesional.editarNegocio.guardarCambios')}
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
