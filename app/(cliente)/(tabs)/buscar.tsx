import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import * as Location from 'expo-location';
import { CATEGORIAS } from '@/data/categorias';
import { profesionalesService } from '@/services';
import type { CategoriaSlug, PerfilProfesional } from '@/types/models';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { ScreenHeader } from '@/components/ScreenHeader';
import { MapaProfesionales } from '@/components/MapaProfesionales';
import { useSession } from '@/context/SessionContext';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing, shadow } from '@/theme';
import type { ThemeColors } from '@/theme';

export default function BuscarScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useSession();
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState<CategoriaSlug | null>(null);
  const [items, setItems] = useState<PerfilProfesional[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();

  // Función para obtener / actualizar ubicación del usuario
  const fetchLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLat(loc.coords.latitude);
        setUserLng(loc.coords.longitude);
      }
    } catch (e) {
      // En emulador sin GPS esto falla — no bloquear la UI
      console.log('Ubicación no disponible:', e);
    }
  }, []);

  // Obtener ubicación al montar
  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Buscar en otra zona (cuando el usuario mueve el mapa)
  const handleSearchArea = useCallback((lat: number, lng: number) => {
    setUserLat(lat);
    setUserLng(lng);
  }, []);

  useEffect(() => {
    setLoading(true);
    profesionalesService
      .listar({
        categoria: categoria ?? undefined,
        textoLibre: query || undefined,
        userLat,
        userLng,
        // Un profesional mirando la app como cliente no se ve a sí mismo
        excluirUsuarioId: user?.id,
      })
      .then(setItems)
      .catch((e: any) =>
        console.error('[buscar] falló listar profesionales:', e?.code ?? '', e?.message ?? e),
      )
      .finally(() => setLoading(false));
  }, [categoria, query, userLat, userLng, user?.id]);

  const seleccionada = useMemo(
    () => CATEGORIAS.find((c) => c.slug === categoria),
    [categoria],
  );

  const badgeText = seleccionada
    ? t('cliente.buscar.filtrando', { nombre: t(`categorias.${seleccionada.slug}`) })
    : t('cliente.buscar.cercanas', { count: items.length });

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        <View style={styles.headerWrap}>
          <ScreenHeader
            eyebrow={t('cliente.buscar.eyebrow')}
            title={t('cliente.buscar.titulo')}
            subtitle={t('cliente.buscar.subtitulo')}
          />
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('cliente.buscar.searchPlaceholder')}
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
            />
          </View>
        </View>

        {/* Mapa — nativo en dev build, estático en Expo Go */}
        <MapaProfesionales
          items={items}
          badgeText={badgeText}
          onMarkerPress={(p) => router.push(`/(cliente)/profesional/${p.id}`)}
          userLat={userLat}
          userLng={userLng}
          onRecenterPress={fetchLocation}
          onSearchArea={handleSearchArea}
        />

        {/* Categorías */}
        <Text style={styles.sectionTitle}>{t('cliente.buscar.categorias')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <Chip
            label={t('cliente.buscar.todas')}
            active={categoria === null}
            onPress={() => setCategoria(null)}
          />
          {CATEGORIAS.map((c) => (
            <Chip
              key={c.slug}
              label={`${c.emoji}  ${t(`categorias.${c.slug}`)}`}
              active={categoria === c.slug}
              onPress={() => setCategoria(c.slug)}
            />
          ))}
        </ScrollView>

        {/* Lista */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>
            {loading ? t('cliente.buscar.buscando') : t('cliente.buscar.resultados', { count: items.length })}
          </Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : null}
        </View>

        {items.length > 0
          ? items.map((item) => (
              <Pressable
                key={item.id}
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
                    <Text style={styles.metaPill}>{'📍'} {item.zona}</Text>
                    <Text style={styles.metaPill}>{'⭐'} {item.rating}</Text>
                    {item.distanciaKm != null ? (
                      <Text style={styles.metaPill}>{item.distanciaKm}km</Text>
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </Pressable>
            ))
          : !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{t('cliente.buscar.sinResultados')}</Text>
                <Text style={styles.emptyText}>{t('cliente.buscar.sinResultadosMsg')}</Text>
              </View>
            ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  container: { paddingBottom: spacing.huge },
  headerWrap: {
    backgroundColor: c.background,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.lg,
    fontSize: 15,
    color: c.ink,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.ink,
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
    backgroundColor: c.surface,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.border,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
  },
  proName: {
    fontSize: 16,
    fontWeight: '700',
    color: c.ink,
  },
  proDesc: {
    fontSize: 13,
    color: c.muted,
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
    color: c.muted,
    backgroundColor: c.bone2,
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
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.ink },
  emptyText: { fontSize: 14, color: c.muted, marginTop: 6, textAlign: 'center' },
});
