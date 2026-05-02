import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIAS } from '@/data/categorias';
import { profesionalesService } from '@/services';
import type { CategoriaSlug, PerfilProfesional } from '@/types/models';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, radius, spacing, shadow } from '@/theme';

export default function BuscarScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState<CategoriaSlug | null>(null);
  const [items, setItems] = useState<PerfilProfesional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    profesionalesService
      .listar({ categoria: categoria ?? undefined, textoLibre: query || undefined })
      .then(setItems)
      .finally(() => setLoading(false));
  }, [categoria, query]);

  const seleccionada = useMemo(
    () => CATEGORIAS.find((c) => c.slug === categoria),
    [categoria],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        <View style={styles.headerWrap}>
          <ScreenHeader
            eyebrow="Encuentrá cerca tuyo"
            title="¿Qué te hacés hoy?"
            subtitle="Profesionales verificadas en tu zona"
          />
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre, zona o servicio…"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
            />
          </View>
        </View>

        {/* Mapa placeholder */}
        <View style={styles.mapBox}>
          <View style={styles.mapGrid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={styles.mapCell} />
            ))}
          </View>
          <View style={styles.mapPinUser}>
            <Ionicons name="locate" size={20} color={colors.white} />
          </View>
          {items.slice(0, 4).map((p, i) => {
            const positions = [
              { top: 24, left: 56 },
              { top: 48, right: 40 },
              { bottom: 32, left: 88 },
              { bottom: 18, right: 70 },
            ];
            return (
              <View key={p.id} style={[styles.mapPin, positions[i] as any]}>
                <Ionicons name="location" size={22} color={colors.rose} />
                <Text style={styles.mapPinLabel}>{p.distanciaKm}km</Text>
              </View>
            );
          })}
          <View style={styles.mapBadge}>
            <Ionicons name="map-outline" size={14} color={colors.muted} />
            <Text style={styles.mapBadgeText}>
              {seleccionada ? `Filtrando: ${seleccionada.nombre}` : 'Mostrando profesionales cercanas'}
            </Text>
          </View>
        </View>

        {/* Categorías */}
        <Text style={styles.sectionTitle}>Categorías</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <Chip
            label="Todas"
            active={categoria === null}
            onPress={() => setCategoria(null)}
          />
          {CATEGORIAS.map((c) => (
            <Chip
              key={c.slug}
              label={`${c.emoji}  ${c.nombre}`}
              active={categoria === c.slug}
              onPress={() => setCategoria(c.slug)}
            />
          ))}
        </ScrollView>

        {/* Lista */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>
            {loading ? 'Buscando…' : `${items.length} profesionales`}
          </Text>
          {loading ? <ActivityIndicator color={colors.rose} /> : null}
        </View>

        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(cliente)/profesional/${item.id}`)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
            >
              <Avatar nombre={item.nombre} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={styles.proName}>{item.nombre}</Text>
                <Text style={styles.proDesc} numberOfLines={2}>
                  {item.descripcion}
                </Text>
                <View style={styles.proMeta}>
                  <Text style={styles.metaPill}>📍 {item.zona}</Text>
                  <Text style={styles.metaPill}>⭐ {item.rating}</Text>
                  <Text style={styles.metaPill}>{item.distanciaKm}km</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Sin resultados</Text>
                <Text style={styles.emptyText}>
                  Probá cambiar la categoría o ampliar la búsqueda.
                </Text>
              </View>
            ) : null
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bone },
  container: { paddingBottom: spacing.huge },
  headerWrap: {
    backgroundColor: colors.bone,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.lg,
    fontSize: 15,
    color: colors.ink,
  },
  mapBox: {
    marginHorizontal: spacing.xxl,
    height: 220,
    borderRadius: radius.xl,
    backgroundColor: '#E8DED4',
    overflow: 'hidden',
    position: 'relative',
    ...shadow.card,
  },
  mapGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mapCell: {
    width: '25%',
    height: '33.33%',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  mapPinUser: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  mapPin: {
    position: 'absolute',
    alignItems: 'center',
  },
  mapPinLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.rose,
    backgroundColor: colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: -4,
  },
  mapBadge: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  mapBadgeText: { fontSize: 12, color: colors.muted, fontWeight: '500' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  chipsRow: {
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.xxl,
  },
  proName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  proDesc: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 18,
  },
  proMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  metaPill: {
    fontSize: 12,
    color: colors.muted,
    backgroundColor: colors.bone2,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xxl,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  emptyText: { fontSize: 14, color: colors.muted, marginTop: 6, textAlign: 'center' },
});
