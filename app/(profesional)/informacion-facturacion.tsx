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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import type { DatosFacturacion, PerfilProfesionalSignup } from '@/types/models';

const ALIAS_REGEX = /^[a-zA-Z0-9.\-]{6,20}$/;
const CBU_REGEX = /^\d{22}$/;

/**
 * Información de facturación del profesional: alias o CBU/CVU donde quiere
 * recibir premios y transferencias de la plataforma.
 */
export default function InformacionFacturacionScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user, updateUser } = useSession();
  const perfil = user?.perfil as PerfilProfesionalSignup | undefined;

  const [tipo, setTipo] = useState<DatosFacturacion['tipo']>(
    perfil?.facturacion?.tipo ?? 'alias',
  );
  const [valor, setValor] = useState(perfil?.facturacion?.valor ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const elegirTipo = (nuevo: DatosFacturacion['tipo']) => {
    if (nuevo === tipo) return;
    setTipo(nuevo);
    setError(null);
    // Si el valor guardado era del otro tipo, arrancamos vacío.
    setValor(perfil?.facturacion?.tipo === nuevo ? perfil.facturacion.valor : '');
  };

  const guardar = async () => {
    const limpio = valor.trim();
    const valido = tipo === 'alias' ? ALIAS_REGEX.test(limpio) : CBU_REGEX.test(limpio);
    if (!valido) {
      setError(
        tipo === 'alias'
          ? t('profesional.facturacion.errorAlias')
          : t('profesional.facturacion.errorCbu'),
      );
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await updateUser({
        perfil: {
          ...(perfil as PerfilProfesionalSignup),
          facturacion: { tipo, valor: limpio },
        },
      });
      Alert.alert(
        t('profesional.facturacion.guardadoTitulo'),
        t('profesional.facturacion.guardadoMsg'),
      );
      router.back();
    } catch {
      Alert.alert(t('comun.error'), t('perfil.compartido.errorGuardarMsg'));
    } finally {
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
            eyebrow={t('profesional.facturacion.eyebrow')}
            title={t('profesional.facturacion.titulo')}
            subtitle={t('profesional.facturacion.subtitulo')}
          />

          {/* Selector alias / CBU-CVU */}
          <View style={styles.segmento}>
            {(
              [
                { key: 'alias', label: t('profesional.facturacion.tipoAlias') },
                { key: 'cbu', label: t('profesional.facturacion.tipoCbu') },
              ] as const
            ).map((op) => {
              const activo = tipo === op.key;
              return (
                <Pressable
                  key={op.key}
                  onPress={() => elegirTipo(op.key)}
                  style={[
                    styles.segmentoBtn,
                    activo && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentoTxt,
                      { color: activo ? colors.white : colors.muted },
                    ]}
                  >
                    {op.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>
            {tipo === 'alias'
              ? t('profesional.facturacion.labelAlias')
              : t('profesional.facturacion.labelCbu')}
          </Text>
          <TextInput
            value={valor}
            onChangeText={(v) => {
              setValor(v);
              setError(null);
            }}
            placeholder={
              tipo === 'alias'
                ? t('profesional.facturacion.placeholderAlias')
                : t('profesional.facturacion.placeholderCbu')
            }
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={tipo === 'cbu' ? 'number-pad' : 'default'}
            maxLength={tipo === 'cbu' ? 22 : 20}
            style={[styles.input, error ? { borderColor: colors.danger } : null]}
          />
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.hintTxt}>
              {tipo === 'alias'
                ? t('profesional.facturacion.ayudaAlias')
                : t('profesional.facturacion.ayudaCbu')}
            </Text>
          </View>

          <Button
            label={guardando ? t('comun.guardando') : t('comun.guardar')}
            onPress={guardar}
            disabled={guardando}
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
    backBtn: { marginBottom: spacing.md, alignSelf: 'flex-start' },
    segmento: {
      flexDirection: 'row',
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.lg,
      padding: 4,
      marginTop: spacing.xl,
      marginBottom: spacing.xl,
    },
    segmentoBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
    },
    segmentoTxt: { fontSize: 14, fontWeight: '600' },
    label: { fontSize: 13, fontWeight: '600', color: c.ink, marginBottom: spacing.sm },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: c.ink,
    },
    error: { fontSize: 12, marginTop: spacing.sm },
    hintBox: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'flex-start',
      backgroundColor: c.primaryTint,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginTop: spacing.xl,
    },
    hintTxt: { flex: 1, fontSize: 13, lineHeight: 18, color: c.primary },
  });
