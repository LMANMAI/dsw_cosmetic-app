import React, { useState } from 'react';
import {
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
import { useSession } from '@/context/SessionContext';
import { Button } from '@/components/Button';
import { colors, radius, spacing } from '@/theme';
import type { UserRole } from '@/types/models';

export default function LoginScreen() {
  const { login } = useSession();
  const [email, setEmail] = useState('cliente@beautyapp.demo');
  const [password, setPassword] = useState('demo1234');
  const [rol, setRol] = useState<UserRole>('cliente');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(email, password, rol);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoMark}>B</Text>
            </View>
            <Text style={styles.brandName}>BeautyApp</Text>
          </View>

          <Text style={styles.eyebrow}>Bienvenida de vuelta</Text>
          <Text style={styles.title}>
            El ecosistema digital{'\n'}
            <Text style={{ color: colors.rose }}>de la estética argentina</Text>
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="tucorreo@email.com"
              placeholderTextColor={colors.muted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
            />
          </View>

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Modo de la cuenta</Text>
          <View style={styles.roleRow}>
            {(['cliente', 'profesional'] as UserRole[]).map((r) => (
              <Pressable
                key={r}
                onPress={() => setRol(r)}
                style={[styles.roleChip, rol === r && styles.roleChipActive]}
              >
                <Text style={[styles.roleLabel, rol === r && styles.roleLabelActive]}>
                  {r === 'cliente' ? '👤 Cliente' : '💅 Profesional'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button
            label="Ingresar"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            style={{ marginTop: spacing.xxl }}
          />

          <Text style={styles.helper}>
            Demo · cualquier email/contraseña funciona. Elegí el modo para ver cada experiencia.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bone },
  container: {
    padding: spacing.xxl,
    flexGrow: 1,
    justifyContent: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.rose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '700',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.rose,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 38,
    marginTop: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  field: { marginBottom: spacing.lg },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: spacing.sm,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: 16,
    color: colors.ink,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roleChip: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  roleChipActive: {
    backgroundColor: colors.roseTint,
    borderColor: colors.rose,
  },
  roleLabel: { fontSize: 15, color: colors.muted, fontWeight: '600' },
  roleLabelActive: { color: colors.rose },
  helper: {
    marginTop: spacing.lg,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
