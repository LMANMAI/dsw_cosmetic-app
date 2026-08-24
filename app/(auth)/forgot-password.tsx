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
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { AuthCard, AuthHero, AuthInput } from '@/components/auth/AuthShell';
import { useSession } from '@/context/SessionContext';
import { useTranslation } from '@/i18n';
import { useTheme, spacing } from '@/theme';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { sendPasswordReset } = useSession();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert(t('auth.forgot.emailRequeridoTitulo'), t('auth.forgot.emailRequeridoMsg'));
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (e: any) {
      console.warn('[auth] reset error', e);
      // Por privacidad Firebase a veces no informa user-not-found, igualmente
      // mostramos confirmación genérica.
      if (e?.code === 'auth/invalid-email') {
        Alert.alert(t('auth.forgot.emailInvalidoTitulo'), t('auth.forgot.emailInvalidoMsg'));
      } else {
        setSent(true);
      }
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
        <AuthHero icon="key-outline" onBack={() => router.back()} height={200} />

        <AuthCard>
          <ScrollView
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>
              {t('auth.forgot.titulo1')}{'\n'}
              <Text style={{ color: colors.primary }}>{t('auth.forgot.titulo2')}</Text>
            </Text>
            <Text style={styles.subtitle}>{t('auth.forgot.subtitulo')}</Text>

            {sent ? (
              <View style={styles.successCard}>
                <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                <Text style={styles.successTitle}>{t('comun.listo')}</Text>
                <Text style={styles.successText}>
                  {t('auth.forgot.exitoTexto', { email: email.trim() })}
                </Text>
                <Button
                  variant="dark"
                  label={t('auth.forgot.volverLogin')}
                  fullWidth
                  onPress={() => router.replace('/(auth)/login')}
                  style={{ marginTop: spacing.lg }}
                />
              </View>
            ) : (
              <>
                <AuthInput
                  icon="mail-outline"
                  placeholder={t('auth.forgot.emailPlaceholder')}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                />

                <Button
                  variant="dark"
                  label={t('auth.forgot.enviarEnlace')}
                  loading={loading}
                  fullWidth
                  onPress={handleSubmit}
                  style={{ marginTop: spacing.lg }}
                />

                <Pressable onPress={() => router.back()} style={styles.backLink} hitSlop={6}>
                  <Ionicons name="arrow-back" size={14} color={colors.muted} />
                  <Text style={styles.backLinkLabel}>{t('auth.forgot.volverLogin')}</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </AuthCard>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
    backLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      justifyContent: 'center',
      marginTop: spacing.xl,
    },
    backLinkLabel: { fontSize: 13, color: colors.muted },
    successCard: {
      backgroundColor: colors.bone,
      borderRadius: 20,
      padding: spacing.xl,
      alignItems: 'center',
      gap: 6,
    },
    successTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 4 },
    successText: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
