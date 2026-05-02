import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { colors, radius, spacing } from '@/theme';

export default function PerfilProfesionalScreen() {
  const { user, logout, switchRole } = useSession();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xxl }}>
        <ScreenHeader eyebrow="Tu negocio" title="Mi perfil profesional" />

        <View style={styles.userBox}>
          <Avatar nombre={user?.nombre ?? '—'} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.nombre}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <Text style={styles.tel}>📍 Villa Urquiza · Activa</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>87</Text>
            <Text style={styles.statLbl}>Reseñas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>4.9</Text>
            <Text style={styles.statLbl}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>3</Text>
            <Text style={styles.statLbl}>Servicios</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Button
              variant="dark"
              label="Cambiar a vista cliente"
              onPress={() => switchRole('cliente')}
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
  tel: { fontSize: 14, color: colors.success, marginTop: 4, fontWeight: '500' },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statVal: { fontSize: 24, fontWeight: '700', color: colors.rose },
  statLbl: { fontSize: 11, color: colors.muted, marginTop: 4 },
  section: { marginTop: spacing.xxl },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
});
