import React, { useState } from 'react';
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
import { colors, spacing } from '@/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { sendPasswordReset } = useSession();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Email requerido', 'Ingresá el email de tu cuenta.');
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
        Alert.alert('Email inválido', 'Revisá el email ingresado.');
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
              Recuperá{'\n'}
              <Text style={{ color: colors.rose }}>tu acceso</Text>
            </Text>
            <Text style={styles.subtitle}>
              Te enviamos un enlace al mail para que crees una contraseña nueva.
            </Text>

            {sent ? (
              <View style={styles.successCard}>
                <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                <Text style={styles.successTitle}>¡Listo!</Text>
                <Text style={styles.successText}>
                  Si {email.trim()} corresponde a una cuenta de BeautyApp, te llegó un enlace para
                  resetear tu contraseña. Revisá también la carpeta de spam.
                </Text>
                <Button
                  variant="dark"
                  label="Volver al login"
                  fullWidth
                  onPress={() => router.replace('/(auth)/login')}
                  style={{ marginTop: spacing.lg }}
                />
              </View>
            ) : (
              <>
                <AuthInput
                  icon="mail-outline"
                  placeholder="Tu email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                />

                <Button
                  variant="dark"
                  label="Enviar enlace"
                  loading={loading}
                  fullWidth
                  onPress={handleSubmit}
                  style={{ marginTop: spacing.lg }}
                />

                <Pressable onPress={() => router.back()} style={styles.backLink} hitSlop={6}>
                  <Ionicons name="arrow-back" size={14} color={colors.muted} />
                  <Text style={styles.backLinkLabel}>Volver al login</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </AuthCard>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
