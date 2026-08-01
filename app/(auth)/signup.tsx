import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/Button';
import {
  AuthCard,
  AuthDivider,
  AuthHero,
  AuthInput,
  AuthMultiSelect,
  AuthSelect,
  GoogleGlyph,
  SocialButton,
} from '@/components/auth/AuthShell';
import { useSession } from '@/context/SessionContext';
import { useCategorias } from '@/hooks/useCategorias';
import { rubrosService } from '@/services/rubros.service';
import type { Rubro } from '@/data/rubros';
import { useGoogleSignIn } from '@/services/google-auth';
import { describirErrorGoogle } from '@/services/google-native';
import { uploadImage } from '@/services/upload.service';
import { DireccionAutocomplete, type DireccionSeleccionada } from '@/components/DireccionAutocomplete';
import { formatCuit, cuitCompleto, cuitValido } from '@/utils/format';
import { useTranslation, type TranslateFn } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type {
  CategoriaSlug,
  PerfilCliente,
  PerfilProfesionalSignup,
  PerfilProveedor,
} from '@/types/models';

type SignupRole = 'cliente' | 'profesional' | 'proveedor';

const ROLES: { id: SignupRole; emoji: string }[] = [
  { id: 'cliente', emoji: '\u{1F486}‍♀️' },
  { id: 'profesional', emoji: '\u{1F485}' },
  { id: 'proveedor', emoji: '\u{1F4E6}' },
];

export default function SignupScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { signupWithEmail } = useSession();

  const [rol, setRol] = useState<SignupRole>('cliente');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [ciudadCli, setCiudadCli] = useState('');

  const [especialidades, setEspecialidades] = useState<CategoriaSlug[]>([]);
  const [ubicacionPro, setUbicacionPro] = useState<DireccionSeleccionada | null>(null);
  const [aniosExp, setAniosExp] = useState('');
  const [matricula, setMatricula] = useState('');
  const [instagram, setInstagram] = useState('');
  const [modalidad, setModalidad] = useState<'salon' | 'domicilio' | 'ambos'>('domicilio');
  const [fotoSalonUri, setFotoSalonUri] = useState<string | null>(null);

  const [razonSocial, setRazonSocial] = useState('');
  const [cuit, setCuit] = useState('');
  const [rubro, setRubro] = useState('');
  const [ubicacionProv, setUbicacionProv] = useState<DireccionSeleccionada | null>(null);
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [rubrosLoading, setRubrosLoading] = useState(false);

  const [loading, setLoading] = useState(false);

  // Cargar rubros desde Firebase (con fallback local) la primera vez que se
  // elige el rol proveedor.
  useEffect(() => {
    if (rol !== 'proveedor' || rubros.length > 0) return;
    let activo = true;
    setRubrosLoading(true);
    rubrosService
      .listar()
      .then((data) => {
        if (activo) setRubros(data);
      })
      .finally(() => {
        if (activo) setRubrosLoading(false);
      });
    return () => {
      activo = false;
    };
  }, [rol, rubros.length]);

  // Especialidades = categorías del catálogo (las mismas que después usa para
  // armar sus servicios). Se cargan recién cuando elige el rol profesional.
  const { categorias, loading: categoriasLoading } = useCategorias(rol === 'profesional');

  const opcionesEspecialidad = useMemo(
    () =>
      categorias.map((c) => ({
        value: c.slug,
        label: t(`categorias.${c.slug}`),
        emoji: c.emoji,
      })),
    [categorias, t],
  );

  /** Texto legible que se guarda junto a los slugs (para mostrar sin traducir). */
  const especialidadTexto = useMemo(
    () =>
      especialidades
        .map((slug) => opcionesEspecialidad.find((o) => o.value === slug)?.label ?? slug)
        .join(', '),
    [especialidades, opcionesEspecialidad],
  );

  const elegirFotoSalon = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('auth.signup.permisoNecesarioTitulo'), t('auth.signup.permisoGaleriaMsg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setFotoSalonUri(result.assets[0].uri);
    }
  };

  const necesitaFotoSalon = modalidad === 'salon' || modalidad === 'ambos';

  const {
    ready: googleReady,
    disponible: googleDisponible,
    loading: googleLoading,
    promptAsync: promptGoogle,
  } = useGoogleSignIn({
    onError: (e) =>
      Alert.alert(t('auth.googleErrorTitulo'), describirErrorGoogle(e)),
  });

  const perfilExtra: PerfilCliente | PerfilProfesionalSignup | PerfilProveedor =
    useMemo(() => {
      switch (rol) {
        case 'profesional':
          return {
            especialidad: especialidadTexto,
            categorias: especialidades,
            ciudad: ubicacionPro?.ciudad ?? '',
            direccion: ubicacionPro?.direccion ?? '',
            aniosExperiencia: Number(aniosExp) || 0,
            matricula: matricula.trim() || undefined,
            instagram: instagram.trim() || undefined,
            modalidad,
            fotoSalonUrl: undefined,
            latitud: ubicacionPro?.latitud,
            longitud: ubicacionPro?.longitud,
          };
        case 'proveedor':
          return {
            razonSocial: razonSocial.trim(),
            cuit: cuit.trim(),
            rubro: rubro.trim(),
            ciudad: ubicacionProv?.ciudad ?? '',
            direccion: ubicacionProv?.direccion ?? '',
            latitud: ubicacionProv?.latitud,
            longitud: ubicacionProv?.longitud,
          };
        default:
          return { ciudad: ciudadCli.trim() || undefined };
      }
    }, [rol, especialidades, especialidadTexto, ubicacionPro, aniosExp, matricula, instagram, modalidad, razonSocial, cuit, rubro, ubicacionProv, ciudadCli]);

  const validate = (): string | null => {
    if (!nombre.trim()) return t('auth.signup.validaciones.nombre');
    if (!email.trim()) return t('auth.signup.validaciones.email');
    if (password.length < 6) return t('auth.signup.validaciones.password');
    if (password !== confirm) return t('auth.signup.validaciones.passwordNoCoincide');
    if (rol === 'profesional') {
      if (especialidades.length === 0) return t('auth.signup.validaciones.especialidad');
      if (!ubicacionPro) return t('auth.signup.validaciones.direccion');
      if ((modalidad === 'salon' || modalidad === 'ambos') && !fotoSalonUri) {
        return t('auth.signup.validaciones.fotoSalon');
      }
    }
    if (rol === 'proveedor') {
      const p = perfilExtra as PerfilProveedor;
      if (!p.razonSocial) return t('auth.signup.validaciones.razonSocial');
      if (!p.cuit) return t('auth.signup.validaciones.cuit');
      if (!cuitCompleto(p.cuit)) return t('auth.signup.validaciones.cuitIncompleto');
      if (!cuitValido(p.cuit)) return t('auth.signup.validaciones.cuitInvalido');
      if (!p.rubro) return t('auth.signup.validaciones.rubro');
      if (!ubicacionProv) return t('auth.signup.validaciones.direccion');
    }
    return null;
  };

  const handleSignup = async () => {
    const err = validate();
    if (err) {
      Alert.alert(t('auth.signup.revisaDatosTitulo'), err);
      return;
    }
    setLoading(true);
    try {
      let finalPerfil = perfilExtra;

      if (rol === 'profesional') {
        // Subir foto del salón si corresponde
        if (fotoSalonUri && necesitaFotoSalon) {
          const fotoUrl = await uploadImage(fotoSalonUri, 'salones');
          finalPerfil = { ...finalPerfil, fotoSalonUrl: fotoUrl } as PerfilProfesionalSignup;
        }
        // Las coordenadas ya vienen del DireccionAutocomplete, no hace falta geocodificar
      }

      await signupWithEmail({
        email: email.trim(),
        password,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        rol,
        perfil: finalPerfil,
      });
    } catch (e: any) {
      console.warn('[auth] signup error', e);
      Alert.alert(
        t('auth.signup.errorTitulo'),
        mapSignupError(e?.code, t) ?? t('auth.signup.errorFallback'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AuthHero icon="person-add-outline" onBack={() => router.back()} height={170} />

        <AuthCard>
          <ScrollView
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>
              {t('auth.signup.tituloPrefijo')}{'\n'}
              <Text style={{ color: colors.primary }}>YOFI</Text>
            </Text>
            <Text style={styles.subtitle}>{t('auth.signup.subtitulo')}</Text>


            <Text style={styles.sectionLabel}>{t('auth.signup.soy')}</Text>
            <View style={styles.roleRow}>
              {ROLES.map((r) => {
                const active = rol === r.id;
                return (
                  <Pressable
                    key={r.id}
                    style={[styles.roleCard, active && styles.roleCardActive]}
                    onPress={() => setRol(r.id)}
                  >
                    <Text style={styles.roleEmoji}>{r.emoji}</Text>
                    <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>
                      {t(`comun.roles.${r.id}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.roleDesc}>{t(`auth.signup.rol${rol.charAt(0).toUpperCase()}${rol.slice(1)}Desc`)}</Text>

            <Text style={styles.sectionLabel}>{t('auth.signup.tusDatos')}</Text>
            <AuthInput
              icon="person-outline"
              placeholder={
                rol === 'proveedor'
                  ? t('auth.signup.nombreResponsablePlaceholder')
                  : t('auth.signup.nombrePlaceholder')
              }
              value={nombre}
              onChangeText={setNombre}
            />
            <AuthInput
              icon="mail-outline"
              placeholder={t('auth.signup.emailPlaceholder')}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <AuthInput
              icon="call-outline"
              placeholder={t('auth.signup.telefonoPlaceholder')}
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
            />

            {rol === 'cliente' ? (
              <AuthInput
                icon="location-outline"
                placeholder={t('auth.signup.ciudadPlaceholder')}
                value={ciudadCli}
                onChangeText={setCiudadCli}
              />
            ) : null}

            {rol === 'profesional' ? (
              <>
                <AuthMultiSelect
                  icon="brush-outline"
                  placeholder={t('auth.signup.especialidadPlaceholder')}
                  title={t('auth.signup.especialidadTitulo')}
                  values={especialidades}
                  options={opcionesEspecialidad}
                  onChange={(v) => setEspecialidades(v as CategoriaSlug[])}
                  loading={categoriasLoading}
                  doneLabel={t('comun.aceptar')}
                />
                <Text style={styles.sectionLabel}>{t('auth.signup.direccionTrabajo')}</Text>
                <DireccionAutocomplete
                  onSelect={setUbicacionPro}
                  placeholder={t('auth.signup.buscaDireccionPlaceholder')}
                />
                <AuthInput
                  icon="time-outline"
                  placeholder={t('auth.signup.aniosExpPlaceholder')}
                  keyboardType="number-pad"
                  value={aniosExp}
                  onChangeText={setAniosExp}
                />
                <AuthInput
                  icon="ribbon-outline"
                  placeholder={t('auth.signup.matriculaPlaceholder')}
                  value={matricula}
                  onChangeText={setMatricula}
                />
                <AuthInput
                  icon="logo-instagram"
                  placeholder={t('auth.signup.instagramPlaceholder')}
                  autoCapitalize="none"
                  value={instagram}
                  onChangeText={setInstagram}
                />

                <Text style={styles.sectionLabel}>{t('auth.signup.modalidadTrabajo')}</Text>
                <View style={styles.roleRow}>
                  {([
                    { id: 'salon' as const, label: t('auth.signup.modalidadSalon'), emoji: '\u{1F3E0}' },
                    { id: 'domicilio' as const, label: t('auth.signup.modalidadDomicilio'), emoji: '\u{1F697}' },
                    { id: 'ambos' as const, label: t('auth.signup.modalidadAmbos'), emoji: '✨' },
                  ]).map((m) => {
                    const active = modalidad === m.id;
                    return (
                      <Pressable
                        key={m.id}
                        style={[styles.roleCard, active && styles.roleCardActive]}
                        onPress={() => setModalidad(m.id)}
                      >
                        <Text style={styles.roleEmoji}>{m.emoji}</Text>
                        <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>
                          {m.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {necesitaFotoSalon ? (
                  <>
                    <Text style={styles.sectionLabel}>{t('auth.signup.fotoSalon')}</Text>
                    <Pressable style={styles.fotoPicker} onPress={elegirFotoSalon}>
                      {fotoSalonUri ? (
                        <Image
                          source={{ uri: fotoSalonUri }}
                          style={styles.fotoPreview}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.fotoPlaceholder}>
                          <Ionicons name="camera-outline" size={32} color={colors.muted} />
                          <Text style={styles.fotoPlaceholderText}>
                            {t('auth.signup.tocaElegirFoto')}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </>
                ) : null}
              </>
            ) : null}

            {rol === 'proveedor' ? (
              <>
                <AuthInput
                  icon="business-outline"
                  placeholder={t('auth.signup.razonSocialPlaceholder')}
                  value={razonSocial}
                  onChangeText={setRazonSocial}
                />
                <AuthInput
                  icon="document-text-outline"
                  placeholder={t('auth.signup.cuitPlaceholder')}
                  keyboardType="number-pad"
                  value={cuit}
                  onChangeText={(t) => setCuit(formatCuit(t))}
                  maxLength={13}
                />
                <AuthSelect
                  icon="cube-outline"
                  placeholder={rubrosLoading ? t('auth.signup.cargandoRubros') : t('auth.signup.elegiRubro')}
                  title={t('auth.signup.queRubroVendes')}
                  value={rubro || null}
                  loading={rubrosLoading}
                  options={rubros.map((r) => ({
                    label: r.nombre,
                    value: r.nombre,
                    emoji: r.emoji,
                  }))}
                  onChange={setRubro}
                />
                <Text style={styles.sectionLabel}>{t('auth.signup.direccionComercio')}</Text>
                <DireccionAutocomplete
                  onSelect={setUbicacionProv}
                  placeholder={t('auth.signup.buscaDireccionComercioPlaceholder')}
                />
              </>
            ) : null}

            <Text style={styles.sectionLabel}>{t('auth.signup.passwordSeccion')}</Text>
            <AuthInput
              icon="lock-closed-outline"
              placeholder={t('auth.signup.passwordPlaceholder')}
              secureTextEntry={!showPassword}
              showToggle
              secureVisible={showPassword}
              onToggleSecure={() => setShowPassword((v) => !v)}
              value={password}
              onChangeText={setPassword}
            />
            <AuthInput
              icon="lock-closed-outline"
              placeholder={t('auth.signup.confirmPlaceholder')}
              secureTextEntry={!showPassword}
              value={confirm}
              onChangeText={setConfirm}
            />

            <Button
              variant="primary"
              label={t('auth.signup.crearCuenta')}
              loading={loading}
              fullWidth
              onPress={handleSignup}
              style={{ marginTop: spacing.lg }}
            />

            <AuthDivider label={t('auth.dividerLabel')} />

            <SocialButton
              label={t('auth.continuarGoogle')}
              iconRender={<GoogleGlyph />}
              disabled={!googleReady || googleLoading}
              onPress={() => promptGoogle()}
            />
            <Text style={styles.googleHint}>
              <Ionicons name="information-circle-outline" size={12} color={colors.muted} />{' '}
              {t('auth.signup.googleHint')}
            </Text>
            {!googleDisponible && (
              <Text style={styles.googleHint}>{t('auth.googleRequiereDevBuild')}</Text>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.signup.yaTenesCuenta')}</Text>
              <Pressable onPress={() => router.push('/(auth)/login')} hitSlop={6}>
                <Text style={styles.footerLink}>{t('auth.signup.ingresar')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </AuthCard>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function mapSignupError(code: string | undefined, t: TranslateFn): string | null {
  switch (code) {
    case 'auth/email-already-in-use':
      return t('auth.signup.errores.emailEnUso');
    case 'auth/invalid-email':
      return t('auth.signup.errores.emailInvalido');
    case 'auth/weak-password':
      return t('auth.signup.errores.passwordDebil');
    case 'auth/network-request-failed':
      return t('auth.signup.errores.sinConexion');
    default:
      return null;
  }
}

const createStyles = (colors: ReturnType<typeof import('@/theme').useTheme>['colors']) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bone },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.ink,
      letterSpacing: -0.4,
      lineHeight: 32,
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: 14,
      color: colors.muted,
      lineHeight: 20,
      marginBottom: spacing.xl,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.muted,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    roleRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    roleCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.bone3,
      backgroundColor: colors.bone,
      gap: 4,
    },
    roleCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryTint,
    },
    roleEmoji: { fontSize: 22 },
    roleLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
    roleLabelActive: { color: colors.primary },
    roleDesc: {
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
      marginTop: spacing.xs,
      marginBottom: spacing.md,
    },
    googleHint: {
      fontSize: 11,
      color: colors.muted,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 16,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: spacing.xl,
    },
    footerText: { fontSize: 14, color: colors.muted },
    footerLink: { fontSize: 14, color: colors.primary, fontWeight: '700' },
    fotoPicker: {
      borderRadius: radius.lg,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: colors.bone3,
      borderStyle: 'dashed',
      marginBottom: spacing.md,
    },
    fotoPreview: {
      width: '100%',
      height: 180,
      borderRadius: radius.lg,
    },
    fotoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl,
      backgroundColor: colors.bone,
      gap: spacing.sm,
    },
    fotoPlaceholderText: {
      fontSize: 13,
      color: colors.muted,
      fontWeight: '500',
    },
  });
