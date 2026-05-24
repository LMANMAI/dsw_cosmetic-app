import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { useTheme, radius, spacing } from '@/theme';
import type { PerfilProveedor } from '@/types/models';

export default function ProveedorInicioScreen() {
  const { colors } = useTheme();
  const { user } = useSession();
  const perfil = user?.perfil as PerfilProveedor | undefined;
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xxl }}>
        <ScreenHeader eyebrow="Panel proveedor" title={`Hola, ${user?.nombre ?? ''}`} />

        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="construct-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Tu cuenta de proveedor está activa</Text>
          <Text style={styles.body}>
            Estamos terminando el panel para que puedas cargar tu catálogo, recibir pedidos y
            gestionar envíos. Te avisamos en cuanto esté disponible.
          </Text>
        </View>

        {perfil ? (
          <View style={styles.dataCard}>
            <Text style={styles.dataTitle}>Datos del comercio</Text>
            <DataRow label="Razón social" value={perfil.razonSocial} styles={styles} />
            <DataRow label="CUIT" value={perfil.cuit} styles={styles} />
            <DataRow label="Rubro" value={perfil.rubro} styles={styles} />
            <DataRow label="Ciudad" value={perfil.ciudad} styles={styles} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function DataRow({ label, value, styles }: { label: string; value?: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value || '—'}</Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof import('@/theme').useTheme>['colors']) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bone },
    card: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    title: { fontSize: 17, fontWeight: '700', color: colors.ink, textAlign: 'center' },
    body: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 19,
    },
    dataCard: {
      marginTop: spacing.xl,
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    dataTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: spacing.sm,
    },
    dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.bone2,
    },
    dataLabel: { fontSize: 13, color: colors.muted },
    dataValue: { fontSize: 13, fontWeight: '600', color: colors.ink },
  });
