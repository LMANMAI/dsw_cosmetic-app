import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { colors, radius, spacing } from '@/theme';

export default function PerfilClienteScreen() {
  const { user, logout, switchRole } = useSession();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xxl }}>
        <ScreenHeader eyebrow="Tu cuenta" title="Mi perfil" />

        <View style={styles.userBox}>
          <Avatar nombre={user?.nombre ?? '—'} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.nombre}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <Text style={styles.tel}>{user?.telefono}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cambiar de modo</Text>
          <Text style={styles.sectionHint}>
            Si también sos profesional, podés alternar entre ambas vistas.
          </Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Button
              variant="dark"
              label="Entrar como profesional"
              onPress={() => switchRole('profesional')}
              fullWidth
            />
            <Button label="Cerrar sesión" variant="secondary" onPress={logout} fullWidth />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bone },
  userBox: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 18, fontWeight: '700', color: colors.ink },
  email: { fontSize: 14, color: colors.muted, marginTop: 2 },
  tel: { fontSize: 14, color: colors.muted, marginTop: 2 },
  section: { marginTop: spacing.xxl },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  sectionHint: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
});
