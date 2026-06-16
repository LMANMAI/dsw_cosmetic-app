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
  AuthSelect,
  GoogleGlyph,
  SocialButton,
} from '@/components/auth/AuthShell';
import { useSession } from '@/context/SessionContext';
import { rubrosService } from '@/services/rubros.service';
import type { Rubro } from '@/data/rubros';
import { useGoogleSignIn } from '@/services/google-auth';
import { uploadImage } from '@/services/upload.service';
import { DireccionAutocomplete, type DireccionSeleccionada } from '@/components/DireccionAutocomplete';
import { formatCuit, cuitCompleto, cuitValido } from '@/utils/format';
import { useTheme, radius, spacing } from '@/theme';
import type {
  PerfilCliente,
  PerfilProfesionalSignup,
  PerfilProveedor,
} from '@/types/models';

type SignupRole = 'cliente' | 'profesional' | 'proveedor';

const ROLES: { id: SignupRole; label: string; emoji: string; desc: string }[] = [
  { id: 'cliente', label: 'Cliente', emoji: '\u{1F486}‍♀️', desc: 'Reservar turnos y comprar productos' },
  { id: 'profesional', label: 'Profesional', emoji: '\u{1F485}', desc: 'Manejar agenda y atender clientes' },
  { id: 'proveedor', label: 'Proveedor', emoji: '\u{1F4E6}', desc: 'Vender insumos a profesionales' },
];

export default function SignupScreen() {
  const { colors } = useTheme();
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

  const [especialidad, setEspecialidad] = useState('');
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

  const elegirFotoSalon = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para subir la foto.');
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

  const { request: googleRequest, promptAsync: promptGoogle } = useGoogleSignIn({
    onError: () =>
      Alert.alert('Google Sign-In', 'No pudimos completar el ingreso con Google.'),
  });

  const perfilExtra: PerfilCliente | PerfilProfesionalSignup | PerfilProveedor =
    useMemo(() => {
      switch (rol) {
        case 'profesional':
          return {
            especialidad: especialidad.trim(),
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
    }, [rol, especialidad, ubicacionPro, aniosExp, matricula, instagram, modalidad, razonSocial, cuit, rubro, ubicacionProv, ciudadCli]);

  const validate = (): string | null => {
    if (!nombre.trim()) return 'Ingresá tu nombre.';
    if (!email.trim()) return 'Ingresá tu email.';
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (password !== confirm) return 'Las contraseñas no coinciden.';
    if (rol === 'profesional') {
      const p = perfilExtra as PerfilProfesionalSignup;
      if (!p.especialidad) return 'Ingresá tu especialidad.';
      if (!ubicacionPro) return 'Seleccioná tu dirección en el buscador.';
      if ((modalidad === 'salon' || modalidad === 'ambos') && !fotoSalonUri) {
        return 'Subí una foto de tu salón.';
      }
    }
    if (rol === 'proveedor') {
      const p = perfilExtra as PerfilProveedor;
      if (!p.razonSocial) return 'Ingresá la razón social.';
      if (!p.cuit) return 'Ingresá el CUIT.';
      if (!cuitCompleto(p.cuit)) return 'El CUIT debe tener 11 dígitos (XX-XXXXXXXX-X).';
      if (!cuitValido(p.cuit)) return 'El CUIT no es válido. Revisá los números.';
      if (!p.rubro) return 'Elegí tu rubro.';
      if (!ubicacionProv) return 'Seleccioná tu dirección en el buscador.';
    }
    return null;
  };

  const handleSignup = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Revisá los datos', err);
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
        'No pudimos crear la cuenta',
        mapSignupError(e?.code) ?? 'Probá de nuevo en unos minutos.',
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
              Sumate a{'\n'}
              <Text style={{ color: colors.primary }}>YOFI</Text>
            </Text>
            <Text style={styles.subtitle}>Elegí cómo querés usar la app y completá tus datos.</Text>


            <Text style={styles.sectionLabel}>Soy</Text>
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
                      {r.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.roleDesc}>{ROLES.find((r) => r.id === rol)!.desc}</Text>

            <Text style={styles.sectionLabel}>Tus datos</Text>
            <AuthInput
              icon="person-outline"
              placeholder={
                rol === 'proveedor' ? 'Nombre del responsable' : 'Tu nombre y apellido'
              }
              value={nombre}
              onChangeText={setNombre}
            />
            <AuthInput
              icon="mail-outline"
              placeholder="Tu email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <AuthInput
              icon="call-outline"
              placeholder="Tu teléfono (opcional)"
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
            />

            {rol === 'cliente' ? (
              <AuthInput
                icon="location-outline"
                placeholder="Tu ciudad (opcional)"
                value={ciudadCli}
                onChangeText={setCiudadCli}
              />
            ) : null}

            {rol === 'profesional' ? (
              <>
                <AuthInput
                  icon="brush-outline"
                  placeholder="Especialidad (uñas, pestañas, masajes...)"
                  value={especialidad}
                  onChangeText={setEspecialidad}
                />
                <Text style={styles.sectionLabel}>Dirección de trabajo</Text>
                <DireccionAutocomplete
                  onSelect={setUbicacionPro}
                  placeholder="Buscá tu dirección..."
                />
                <AuthInput
                  icon="time-outline"
                  placeholder="Años de experiencia"
                  keyboardType="number-pad"
                  value={aniosExp}
                  onChangeText={setAniosExp}
                />
                <AuthInput
                  icon="ribbon-outline"
                  placeholder="Matrícula (opcional)"
                  value={matricula}
                  onChangeText={setMatricula}
                />
                <AuthInput
                  icon="logo-instagram"
                  placeholder="Instagram (opcional, sin @)"
                  autoCapitalize="none"
                  value={instagram}
                  onChangeText={setInstagram}
                />

                <Text style={styles.sectionLabel}>Modalidad de trabajo</Text>
                <View style={styles.roleRow}>
                  {([
                    { id: 'salon' as const, label: 'Salón', emoji: '\u{1F3E0}' },
                    { id: 'domicilio' as const, label: 'A domicilio', emoji: '\u{1F697}' },
                    { id: 'ambos' as const, label: 'Ambos', emoji: '✨' },
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
                    <Text style={styles.sectionLabel}>Foto del salón</Text>
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
                            Tocá para elegir una foto
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
                  placeholder="Razón social del comercio"
                  value={razonSocial}
                  onChangeText={setRazonSocial}
                />
                <AuthInput
                  icon="document-text-outline"
                  placeholder="CUIT (XX-XXXXXXXX-X)"
                  keyboardType="number-pad"
                  value={cuit}
                  onChangeText={(t) => setCuit(formatCuit(t))}
                  maxLength={13}
                />
                <AuthSelect
                  icon="cube-outline"
                  placeholder={rubrosLoading ? 'Cargando rubros...' : 'Elegí tu rubro'}
                  title="¿Qué rubro vendés?"
                  value={rubro || null}
                  loading={rubrosLoading}
                  options={rubros.map((r) => ({
                    label: r.nombre,
                    value: r.nombre,
                    emoji: r.emoji,
                  }))}
                  onChange={setRubro}
                />
                <Text style={styles.sectionLabel}>Dirección del comercio</Text>
                <DireccionAutocomplete
                  onSelect={setUbicacionProv}
                  placeholder="Buscá la dirección de tu comercio..."
                />
              </>
            ) : null}

            <Text style={styles.sectionLabel}>Contraseña</Text>
            <AuthInput
              icon="lock-closed-outline"
              placeholder="Mínimo 6 caracteres"
              secureTextEntry={!showPassword}
              showToggle
              secureVisible={showPassword}
              onToggleSecure={() => setShowPassword((v) => !v)}
              value={password}
              onChangeText={setPassword}
            />
            <AuthInput
              icon="lock-closed-outline"
              placeholder="Repetí la contraseña"
              secureTextEntry={!showPassword}
              value={confirm}
              onChangeText={setConfirm}
            />

            <Button
              variant="primary"
              label="Crear cuenta"
              loading={loading}
              fullWidth
              onPress={handleSignup}
              style={{ marginTop: spacing.lg }}
            />

            <AuthDivider />

            <SocialButton
              label="Continuar con Google"
              iconRender={<GoogleGlyph />}
              disabled={!googleRequest}
              onPress={() => promptGoogle()}
            />
            <Text style={styles.googleHint}>
              <Ionicons name="information-circle-outline" size={12} color={colors.muted} /> Al usar
              Google se crea una cuenta de cliente. Podés cambiar a profesional o proveedor desde tu
              perfil.
            </Text>

            <View style={styles.footer}>
              <Text style={styles.footerText}>¿Ya tenés cuenta? </Text>
              <Pressable onPress={() => router.push('/(auth)/login')} hitSlop={6}>
                <Text style={styles.footerLink}>Ingresar</Text>
              </Pressable>
            </View>
          </ScrollView>
        </AuthCard>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function mapSignupError(code?: string): string | null {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con ese email.';
    case 'auth/invalid-email':
      return 'El email no es válido.';
    case 'auth/weak-password':
      return 'La contraseña es muy débil.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisá tu internet.';
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