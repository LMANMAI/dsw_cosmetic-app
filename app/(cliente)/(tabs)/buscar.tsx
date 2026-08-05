import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { CATEGORIAS } from '@/data/categorias';
import { bannersService, catalogoService, profesionalesService } from '@/services';
import type { Banner, Categoria, CategoriaSlug, PerfilProfesional } from '@/types/models';
import { Avatar } from '@/components/Avatar';
import { BannerCarrusel } from '@/components/BannerCarrusel';
import { CategoriaCard } from '@/components/CategoriaCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { MapaProfesionales } from '@/components/MapaProfesionales';
import { useSession } from '@/context/SessionContext';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing, shadow } from '@/theme';
import type { ThemeColors } from '@/theme';

/** Nombre visible de la app: se muestra como marca sobre los banners. */
const APP_NOMBRE = 'YOFI';

/** Grilla de categorías: 3 por fila. */
const COLUMNAS_CATEGORIA = 3;

/**
 * Ancho de cada celda a partir del ancho REAL que mide la grilla en pantalla.
 * Calcularlo con Dimensions daba de a 2 por fila: el ancho de la ventana no
 * descuenta el padding del contenedor y por unos pocos píxeles de más la
 * tercera celda se iba a la fila siguiente.
 */
function anchoCelda(anchoGrilla: number): number {
  const util = anchoGrilla - spacing.xxl * 2 - spacing.md * (COLUMNAS_CATEGORIA - 1);
  return Math.floor(util / COLUMNAS_CATEGORIA);
}

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
  const [banners, setBanners] = useState<Banner[]>([]);
  /** Ancho real de la grilla de categorías, medido al renderizar. */
  const [anchoGrilla, setAnchoGrilla] = useState(0);
  // Categorías del catálogo (traen la foto que cargó el admin). Si Firestore
  // todavía no tiene nada, caen a las locales con emoji.
  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS);

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

  // Banners y categorías del home (se cargan una vez, no dependen del filtro)
  useEffect(() => {
    if (!user?.id) return;
    let activo = true;
    bannersService.listarActivos().then((b) => { if (activo) setBanners(b); });
    catalogoService.listarCategorias().then((c) => {
      if (activo && c.length > 0) setCategorias(c);
    });
    return () => { activo = false; };
  }, [user?.id]);

  // Buscar en otra zona (cuando el usuario mueve el mapa)
  const handleSearchArea = useCallback((lat: number, lng: number) => {
    setUserLat(lat);
    setUserLng(lng);
  }, []);

  useEffect(() => {
    // Al cerrar sesión el usuario queda en null mientras la pantalla sigue
    // montada: sin auth toda query da permission-denied.
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }

    let activo = true;
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
      .then((data) => {
        if (activo) setItems(data);
      })
      .catch((e: any) => {
        if (!activo) return;
        console.error('[buscar] falló listar profesionales:', e?.code ?? '', e?.message ?? e);
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [categoria, query, userLat, userLng, user?.id]);

  const seleccionada = useMemo(
    () => categorias.find((c) => c.slug === categoria),
    [categoria, categorias],
  );

  /** Nombre traducido de la categoría; si el slug es propio del panel (no
   *  está en los diccionarios), usa el nombre cargado en Firestore. */
  const nombreCategoria = useCallback(
    (c: Categoria) => {
      const clave = `categorias.${c.slug}`;
      const traducido = t(clave);
      return traducido === clave ? c.nombre : traducido;
    },
    [t],
  );

  const badgeText = seleccionada
    ? t('cliente.buscar.filtrando', { nombre: nombreCategoria(seleccionada) })
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

        {/* Banners promocionales (los carga el admin desde el panel) */}
        {banners.length > 0 && (
          <View style={{ marginTop: spacing.sm }}>
            <BannerCarrusel
              banners={banners}
              marca={APP_NOMBRE}
              onPress={(b) => {
                if (b.categoriaSlug) setCategoria(b.categoriaSlug);
              }}
            />
          </View>
        )}

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

        {/* Categorías — grilla con foto (la foto se carga desde el panel) */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>{t('cliente.buscar.categorias')}</Text>
          {categoria !== null && (
            <Pressable onPress={() => setCategoria(null)} hitSlop={8}>
              <Text style={styles.verTodas}>{t('cliente.buscar.todas')}</Text>
            </Pressable>
          )}
        </View>
        <View
          style={styles.grilla}
          onLayout={(e) => setAnchoGrilla(e.nativeEvent.layout.width)}
        >
          {anchoGrilla > 0 &&
            categorias.map((c) => (
              <CategoriaCard
                key={c.slug}
                categoria={c}
                nombre={nombreCategoria(c)}
                activa={categoria === c.slug}
                ancho={anchoCelda(anchoGrilla)}
                onPress={() => setCategoria(categoria === c.slug ? null : c.slug)}
              />
            ))}
        </View>

        {/* Lista */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>
            {loading ? t('cliente.buscar.buscando') : t('cliente.buscar.resultados', { count: items.length })}
          </Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : null}
        </View>

        {items.length > 0
          ? items.map((item) => {
              const foto = item.fotoSalon || item.fotoUrl;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/(cliente)/profesional/${item.id}`)}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
                >
                  {/* Portada: foto del salón si la cargó, si no un fondo suave */}
                  <View style={styles.portada}>
                    {foto ? (
                      <Image
                        source={{ uri: foto }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, styles.portadaVacia]}>
                        <Ionicons name="sparkles-outline" size={30} color={colors.muted} />
                      </View>
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(10,14,30,0.72)']}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.portadaPills}>
                      <Text style={styles.pillOscura}>{'⭐'} {item.rating}</Text>
                      {item.distanciaKm != null && (
                        <Text style={styles.pillOscura}>{item.distanciaKm} km</Text>
                      )}
                    </View>
                    <Text style={styles.portadaZona} numberOfLines={1}>
                      {'📍'} {item.zona}
                    </Text>
                  </View>

                  <View style={styles.cardBody}>
                    <Avatar nombre={item.nombre} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.proName} numberOfLines={1}>{item.nombre}</Text>
                      <Text style={styles.proDesc} numberOfLines={2}>
                        {item.descripcion}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                  </View>
                </Pressable>
              );
            })
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
  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  verTodas: {
    fontSize: 13,
    fontWeight: '600',
    color: c.primary,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.xxl,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.border,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  portada: {
    height: 132,
    backgroundColor: c.bone2,
    justifyContent: 'flex-end',
  },
  portadaVacia: { alignItems: 'center', justifyContent: 'center' },
  portadaPills: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pillOscura: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: 'rgba(10,14,30,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  portadaZona: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
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
