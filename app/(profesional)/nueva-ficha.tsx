import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { fichasService } from '@/services/fichas.service';
import { useSession } from '@/context/SessionContext';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';

/**
 * Alta manual de una ficha de cliente (para clientes que no usan la app).
 */
export default function NuevaFichaScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useSession();
  const profesionalId = user?.id ?? '';

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const crear = async () => {
    const limpio = nombre.trim();
    if (limpio.length < 2) {
      setError(t('profesional.nuevaFicha.errorNombre'));
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const clienteId = await fichasService.crearManual(profesionalId, {
        nombre: limpio,
        telefono: telefono.trim(),
        email: email.trim(),
        notas: notas.trim(),
      });
      Alert.alert(t('comun.listo'), t('profesional.nuevaFicha.creadaMsg'));
      router.replace({
        pathname: '/(profesional)/ficha-cliente',
        params: { clienteId, nombre: limpio },
      });
    } catch {
      Alert.alert(t('comun.error'), t('perfil.compartido.errorGuardarMsg'));
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.xxl, paddingBottom: spacing.huge }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>

          <ScreenHeader
            eyebrow={t('profesional.clientes.eyebrow')}
            title={t('profesional.nuevaFicha.titulo')}
            subtitle={t('profesional.nuevaFicha.subtitulo')}
          />

          <Text style={styles.label}>{t('profesional.nuevaFicha.nombreLabel')}</Text>
          <TextInput
            value={nombre}
            onChangeText={(v) => {
              setNombre(v);
              setError(null);
            }}
            placeholder={t('profesional.nuevaFicha.nombrePlaceholder')}
            placeholderTextColor={colors.muted}
            style={[styles.input, error ? { borderColor: colors.danger } : null]}
          />
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <Text style={styles.label}>{t('profesional.ficha.contacto')}</Text>
          <TextInput
            value={telefono}
            onChangeText={setTelefono}
            placeholder={t('profesional.ficha.telefonoPlaceholder')}
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t('profesional.ficha.emailPlaceholder')}
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <Text style={styles.label}>{t('profesional.ficha.notas')}</Text>
          <TextInput
            value={notas}
            onChangeText={setNotas}
            placeholder={t('profesional.ficha.notasPlaceholder')}
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
            style={[styles.input, { minHeight: 110 }]}
          />

          <Button
            label={guardando ? t('comun.guardando') : t('profesional.nuevaFicha.crear')}
            onPress={crear}
            disabled={guardando}
            fullWidth
            style={{ marginTop: spacing.xl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    backBtn: { marginBottom: spacing.md, alignSelf: 'flex-start' },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: c.ink,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: c.ink,
      marginBottom: spacing.sm,
    },
    error: { fontSize: 12, marginTop: 2 },
  });
