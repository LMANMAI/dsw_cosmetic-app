import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  type AppStateStatus,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { AuthCard, AuthHero } from '@/components/auth/AuthShell';
import { useSession } from '@/context/SessionContext';
import { useTranslation } from '@/i18n';
import { useTheme, spacing } from '@/theme';

/** Segundos de espera entre reenvíos del mail de verificación. */
const COOLDOWN_REENVIO = 60;

/**
 * Pantalla bloqueante posterior al registro.
 *
 * El usuario queda acá hasta que confirma el mail: recién entonces
 * `isValidated` pasa a true y el AuthGate lo deja entrar a su rol.
 */
export default function VerificarEmailScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, logout, reenviarVerificacionEmail, refrescarVerificacionEmail } =
    useSession();

  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  // Cuenta regresiva para poder reenviar el mail.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  /**
   * Consulta a Firebase si el mail ya está verificado.
   * `silencioso` = chequeo automático: no muestra el alert de "todavía no".
   */
  const chequear = useCallback(
    async (silencioso: boolean) => {
      if (!silencioso) setVerificando(true);
      try {
        const ok = await refrescarVerificacionEmail();
        // Si quedó validado, el AuthGate redirige solo al ver el nuevo estado.
        if (!ok && !silencioso) {
          Alert.alert(
            t('auth.verificarEmail.todaviaNoTitulo'),
            t('auth.verificarEmail.todaviaNoMsg'),
          );
        }
      } catch (e) {
        console.warn('[auth] error al verificar el email', e);
        if (!silencioso) {
          Alert.alert(t('comun.error'), t('auth.verificarEmail.errorChequeo'));
        }
      } finally {
        if (montado.current && !silencioso) setVerificando(false);
      }
    },
    [refrescarVerificacionEmail, t],
  );

  // Chequeo automático al abrir la pantalla y al volver a la app (el usuario
  // se va al mail, toca el link y vuelve).
  useEffect(() => {
    chequear(true);
    const sub = AppState.addEventListener('change', (estado: AppStateStatus) => {
      if (estado === 'active') chequear(true);
    });
    return () => sub.remove();
  }, [chequear]);

  const handleReenviar = async () => {
    if (cooldown > 0) return;
    setReenviando(true);
    try {
      await reenviarVerificacionEmail();
      setCooldown(COOLDOWN_REENVIO);
      Alert.alert(
        t('auth.verificarEmail.reenviadoTitulo'),
        t('auth.verificarEmail.reenviadoMsg', { email: user?.email ?? '' }),
      );
    } catch (e: any) {
      console.warn('[auth] error al reenviar verificación', e);
      Alert.alert(
        t('comun.error'),
        e?.code === 'auth/too-many-requests'
          ? t('auth.verificarEmail.demasiadosIntentos')
          : t('auth.verificarEmail.errorReenvio'),
      );
    } finally {
      if (montado.current) setReenviando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AuthHero icon="mail-unread-outline" height={200} />

      <AuthCard>
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>
            {t('auth.verificarEmail.titulo1')}{'\n'}
            <Text style={{ color: colors.primary }}>
              {t('auth.verificarEmail.titulo2')}
            </Text>
          </Text>
          <Text style={styles.subtitle}>{t('auth.verificarEmail.subtitulo')}</Text>

          <View style={styles.emailCard}>
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <Text style={styles.emailText} numberOfLines={1}>
              {user?.email ?? ''}
            </Text>
          </View>

          <View style={styles.pasos}>
            {[1, 2, 3].map((n) => (
              <View key={n} style={styles.paso}>
                <View style={styles.pasoBullet}>
                  <Text style={styles.pasoNumero}>{n}</Text>
                </View>
                <Text style={styles.pasoTexto}>
                  {t(`auth.verificarEmail.paso${n}`)}
                </Text>
              </View>
            ))}
          </View>

          <Button
            variant="dark"
            label={t('auth.verificarEmail.yaValide')}
            loading={verificando}
            fullWidth
            onPress={() => chequear(false)}
            style={{ marginTop: spacing.lg }}
          />

          <Button
            variant="secondary"
            label={
              cooldown > 0
                ? t('auth.verificarEmail.reenviarEn', { segundos: String(cooldown) })
                : t('auth.verificarEmail.reenviar')
            }
            loading={reenviando}
            disabled={cooldown > 0}
            fullWidth
            onPress={handleReenviar}
            style={{ marginTop: spacing.sm }}
          />

          <Text style={styles.hint}>
            <Ionicons name="information-circle-outline" size={12} color={colors.muted} />{' '}
            {t('auth.verificarEmail.spamHint')}
          </Text>

          <Pressable onPress={logout} style={styles.salir} hitSlop={6}>
            <Ionicons name="log-out-outline" size={14} color={colors.muted} />
            <Text style={styles.salirLabel}>{t('auth.verificarEmail.cerrarSesion')}</Text>
          </Pressable>
        </ScrollView>
      </AuthCard>
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
      marginBottom: spacing.lg,
    },
    emailCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primaryTint,
      borderRadius: 14,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    emailText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.ink,
    },
    pasos: { marginTop: spacing.lg, gap: spacing.md },
    paso: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    pasoBullet: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bone2,
    },
    pasoNumero: { fontSize: 11, fontWeight: '700', color: colors.mutedDark },
    pasoTexto: { flex: 1, fontSize: 13, color: colors.muted, lineHeight: 19 },
    hint: {
      fontSize: 11,
      color: colors.muted,
      textAlign: 'center',
      marginTop: spacing.md,
      lineHeight: 16,
    },
    salir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      justifyContent: 'center',
      marginTop: spacing.xl,
    },
    salirLabel: { fontSize: 13, color: colors.muted },
  });
