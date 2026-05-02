import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { turnosService } from '@/services';
import type { Turno } from '@/types/models';
import { Badge } from '@/components/Badge';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { colors, radius, spacing } from '@/theme';
import { formatARS, formatFecha } from '@/utils/format';

export default function MisTurnosScreen() {
  const { user } = useSession();
  const [items, setItems] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    turnosService
      .listarDelCliente(user.id)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          eyebrow="Tu agenda personal"
          title="Mis turnos"
          subtitle="Recordatorios automáticos · 24h y 2h antes"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.rose} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: spacing.xxl, gap: spacing.md }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{item.servicioNombre}</Text>
                <Badge
                  label={item.estado}
                  tone={
                    item.estado === 'confirmado'
                      ? 'success'
                      : item.estado === 'pendiente'
                      ? 'warning'
                      : item.estado === 'completado'
                      ? 'info'
                      : 'danger'
                  }
                />
              </View>
              <View style={styles.row}>
                <Ionicons name="calendar-outline" size={16} color={colors.muted} />
                <Text style={styles.meta}>{formatFecha(item.fecha)} · {item.hora}</Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="person-outline" size={16} color={colors.muted} />
                <Text style={styles.meta}>Profesional: {item.profesionalId}</Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="cash-outline" size={16} color={colors.muted} />
                <Text style={styles.meta}>{formatARS(item.monto)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Todavía no reservaste turnos</Text>
              <Text style={styles.emptyText}>
                Buscá una profesional cerca tuyo y reservá en un toque.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bone },
  headerWrap: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { fontSize: 14, color: colors.muted, textTransform: 'capitalize' },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  emptyText: { fontSize: 14, color: colors.muted, marginTop: 6, textAlign: 'center' },
});
