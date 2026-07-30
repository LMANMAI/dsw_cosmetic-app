import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { Link, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import {
  AuthCard,
  AuthDivider,
  AuthHero,
  AuthInput,
  GoogleGlyph,
  SocialButton,
} from '@/components/auth/AuthShell';
import { useSession } from '@/context/SessionContext';
import { useGoogleSignIn } from '@/services/google-auth';
import { DEMO_PASSWORD } from '@/services/demo-users';
import { LanguageButton } from '@/components/LanguageSelector';
import { useTranslation, type TranslateFn } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { loginWithEmail } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const { request: googleRequest, promptAsync: promptGoogle } = useGoogleSignIn({
    onError: (e) => {
      console.warn('[google] login error', e);
      Alert.alert(t('auth.googleErrorTitulo'), t('auth.googleErrorMsg'));
    },
  });

  const handleLogin = async (overrideEmail?: string, overridePass?: string) => {
    const useEmail = overrideEmail ?? email;
    const usePass = overridePass ?? password;
    if (!useEmail || !usePass) {
      Alert.alert(t('auth.login.datosIncompletosTitulo'), t('auth.login.datosIncompletosMsg'));
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(useEmail, usePass);
    } catch (err: any) {
      console.warn('[auth] login error', err);
      const esCredenciales =
        err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password';
      Alert.alert(
        t('auth.login.errorTitulo'),
        mapAuthError(err?.code, t) ?? t('auth.login.errorFallback'),
        esCredenciales
          ? [
              { text: t('comun.reintentar'), style: 'cancel' },
              {
                text: t('auth.login.olvidePassword'),
                onPress: () => router.push('/(auth)/forgot-password'),
              },
            ]
          : undefined,
      );
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    handleLogin(demoEmail, DEMO_PASSWORD);
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <AuthHero icon="sparkles" />
        <View style={styles.langButtonWrap}>
          <LanguageButton />
        </View>

        <AuthCard>
          <ScrollView
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>
              {t('auth.login.tituloPrefijo')}{'\n'}
              <Text style={{ color: colors.primary }}>Yopi</Text>
            </Text>
            <Text style={styles.subtitle}>{t('auth.login.subtitulo')}</Text>

            <AuthInput
              icon="mail-outline"
              placeholder={t('auth.login.emailPlaceholder')}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
            />
            <AuthInput
              icon="lock-closed-outline"
              placeholder={t('auth.login.passwordPlaceholder')}
              secureTextEntry={!showPassword}
              showToggle
              secureVisible={showPassword}
              onToggleSecure={() => setShowPassword((v) => !v)}
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={() => handleLogin()}
            />

            <View style={styles.row}>
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setRemember((v) => !v)}
                hitSlop={6}
              >
                <View style={[styles.checkbox, remember && styles.checkboxOn]}>
                  {remember ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : null}
                </View>
                <Text style={styles.rememberLabel}>{t('auth.login.recordarme')}</Text>
              </Pressable>

              <Link href="/(auth)/forgot-password" asChild>
                <Pressable hitSlop={6}>
                  <Text style={styles.forgotLabel}>{t('auth.login.olvidePassword')}</Text>
                </Pressable>
              </Link>
            </View>

            <Button
              variant="primary"
              label={t('auth.login.ingresar')}
              onPress={() => handleLogin()}
              loading={loading}
              fullWidth
              style={{ marginTop: spacing.lg }}
            />

            <AuthDivider label={t('auth.dividerLabel')} />

            <SocialButton
              label={t('auth.continuarGoogle')}
              iconRender={<GoogleGlyph />}
              disabled={!googleRequest}
              onPress={() => promptGoogle()}
            />

            <View style={styles.demoBox}>
              <View style={styles.demoHeader}>
                <Ionicons name="flash-outline" size={14} color={colors.primary} />
                <Text style={styles.demoTitle}>{t('auth.login.demoTitulo')}</Text>
              </View>
              <Text style={styles.demoHint}>{t('auth.login.demoHint')}</Text>
              <View style={styles.demoChips}>
                <DemoChip
                  label={t('comun.roles.cliente')}
                  icon="person-outline"
                  onPress={() => loginAsDemo('cliente@demo.beautyapp.com')}
                />
                <DemoChip
                  label={t('comun.roles.profesional')}
                  icon="brush-outline"
                  onPress={() => loginAsDemo('profesional@demo.beautyapp.com')}
                />
                <DemoChip
                  label={t('comun.roles.proveedor')}
                  icon="cube-outline"
                  onPress={() => loginAsDemo('proveedor@demo.beautyapp.com')}
                />
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.login.noCuenta')}</Text>
              <Pressable onPress={() => router.push('/(auth)/signup')} hitSlop={6}>
                <Text style={styles.footerLink}>{t('auth.login.crearCuenta')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </AuthCard>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DemoChip({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.demoChip, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.demoChipLabel}>{label}</Text>
    </Pressable>
  );
}

function mapAuthError(code: string | undefined, t: TranslateFn): string | null {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return t('auth.login.errores.credenciales');
    case 'auth/user-not-found':
      return t('auth.login.errores.usuarioNoEncontrado');
    case 'auth/too-many-requests':
      return t('auth.login.errores.demasiadosIntentos');
    case 'auth/network-request-failed':
      return t('auth.login.errores.sinConexion');
    case 'auth/operation-not-allowed':
      return t('auth.login.errores.operacionNoPermitida');
    default:
      return null;
  }
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  langButtonWrap: {
    position: 'absolute',
    top: 14,
    right: 16,
    zIndex: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: c.ink,
    letterSpacing: -0.4,
    lineHeight: 32,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: c.muted,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: c.bone3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
  },
  checkboxOn: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  rememberLabel: { fontSize: 13, color: c.ink },
  forgotLabel: { fontSize: 13, color: c.primary, fontWeight: '600' },
  demoBox: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: c.primaryTint,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(184, 73, 104, 0.2)',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  demoHint: {
    fontSize: 12,
    color: c.muted,
    marginTop: 4,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  demoChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  demoChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: c.bone3,
    gap: 2,
  },
  demoChipEmoji: { fontSize: 20, fontWeight: '700', color: c.primary },
  demoChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.ink,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: { fontSize: 14, color: c.muted },
  footerLink: { fontSize: 14, color: c.primary, fontWeight: '700' },
});
