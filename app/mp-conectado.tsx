import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { useSession } from '@/context/SessionContext';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';

/**
 * Pantalla de retorno del OAuth de Mercado Pago (deep link
 * beautyapp://mp-conectado?status=ok|error). Muestra el resultado de la
 * vinculación y refresca el usuario para reflejar el estado conectado.
 */
export default function MpConectadoScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, refreshUser } = useSession();
  const { status } = useLocalSearchParams<{ status?: string }>();
  const ok = status === 'ok';
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    if (ok) refreshUser().catch(() => {});
  }, [ok, refreshUser]);

  const volver = () => {
    if (user?.rol === 'proveedor') router.replace('/(proveedor)/perfil');
    else if (user?.rol === 'profesional') router.replace('/(profesional)/perfil');
    else router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View
          style={[
            styles.iconWrap,
            { borderColor: ok ? colors.success : colors.danger },
          ]}
        >
          <Ionicons
            name={ok ? 'checkmark-circle' : 'close-circle'}
            size={76}
            color={ok ? colors.success : colors.danger}
          />
        </View>

        <Text style={styles.title}>
          {ok ? 'Cuenta conectada' : 'No se pudo conectar'}
        </Text>
        <Text style={styles.sub}>
          {ok
            ? 'Tu cuenta de Mercado Pago quedó vinculada. Ya vas a recibir los pagos directamente en tu cuenta.'
            : 'Hubo un problema al vincular tu cuenta de Mercado Pago. Podés intentarlo de nuevo desde tu perfil.'}
        </Text>

        <Button
          label={ok ? 'Volver a mi perfil' : 'Volver e intentar de nuevo'}
          onPress={volver}
          fullWidth
          style={{ marginTop: spacing.xxl }}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
    },
    iconWrap: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      backgroundColor: c.surface,
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: c.ink,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    sub: {
      fontSize: 15,
      lineHeight: 22,
      color: c.muted,
      textAlign: 'center',
    },
  });
