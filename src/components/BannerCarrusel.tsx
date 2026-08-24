import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Banner } from '@/types/models';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';

const ANCHO_PANTALLA = Dimensions.get('window').width;
const MARGEN = spacing.xxl;
const ANCHO_TARJETA = ANCHO_PANTALLA - MARGEN * 2;
const ALTO_TARJETA = 168;

/** Cada cuánto pasa solo al siguiente banner. */
const INTERVALO_MS = 5000;
/** Cuánto espera antes de volver a girar solo después de que el usuario tocó. */
const PAUSA_TRAS_TOQUE_MS = 10000;

/**
 * Carrusel de banners promocionales del home.
 * Se desplaza de a una tarjeta y muestra puntitos de posición.
 * Los banners los carga el dueño desde el panel admin.
 */
export function BannerCarrusel({
  banners,
  marca,
  onPress,
}: {
  banners: Banner[];
  /** Nombre de la app, se muestra arriba del título. */
  marca: string;
  onPress?: (banner: Banner) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [indice, setIndice] = useState(0);
  /** Se pausa el giro automático mientras el usuario desliza a mano. */
  const [pausado, setPausado] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const reanudarRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const paso = ANCHO_TARJETA + spacing.md;
  const total = banners.length;

  // Giro automático: avanza una tarjeta cada INTERVALO_MS y vuelve al principio
  // al llegar a la última.
  useEffect(() => {
    if (total <= 1 || pausado) return;
    const timer = setInterval(() => {
      setIndice((actual) => {
        const siguiente = (actual + 1) % total;
        scrollRef.current?.scrollTo({ x: siguiente * paso, animated: true });
        return siguiente;
      });
    }, INTERVALO_MS);
    return () => clearInterval(timer);
  }, [total, pausado, paso]);

  // Limpieza del temporizador de reanudación al desmontar.
  useEffect(() => () => {
    if (reanudarRef.current) clearTimeout(reanudarRef.current);
  }, []);

  if (total === 0) return null;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / paso);
    if (i !== indice) setIndice(i);
  };

  /** Al tocar, se corta el giro automático y se reanuda un rato después. */
  const pausarUnRato = () => {
    setPausado(true);
    if (reanudarRef.current) clearTimeout(reanudarRef.current);
    reanudarRef.current = setTimeout(() => setPausado(false), PAUSA_TRAS_TOQUE_MS);
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={total === 1}
        snapToInterval={paso}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onScrollBeginDrag={pausarUnRato}
        scrollEventThrottle={16}
        contentContainerStyle={styles.fila}
      >
        {banners.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => {
              pausarUnRato();
              onPress?.(b);
            }}
            style={({ pressed }) => [styles.tarjeta, pressed && { opacity: 0.92 }]}
          >
            <ImageBackground
              source={{ uri: b.imagenUrl }}
              style={StyleSheet.absoluteFill}
              imageStyle={{ borderRadius: radius.xl }}
              resizeMode="cover"
            />
            {/* Degradado para que el texto se lea sobre cualquier foto. */}
            <LinearGradient
              colors={['rgba(10,14,30,0.75)', 'rgba(10,14,30,0.15)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]}
            />
            <View style={styles.contenido}>
              <Text style={styles.marca}>{marca}</Text>
              <Text style={styles.titulo} numberOfLines={2}>
                {b.titulo}
              </Text>
              {!!b.subtitulo && (
                <Text style={styles.subtitulo} numberOfLines={2}>
                  {b.subtitulo}
                </Text>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {banners.length > 1 && (
        <View style={styles.puntos}>
          {banners.map((b, i) => (
            <View key={b.id} style={[styles.punto, i === indice && styles.puntoActivo]} />
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  fila: { paddingHorizontal: MARGEN, gap: spacing.md },
  tarjeta: {
    width: ANCHO_TARJETA,
    height: ALTO_TARJETA,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: c.navy,
    justifyContent: 'flex-end',
  },
  contenido: { padding: spacing.xl, gap: 2 },
  marca: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#FFFFFF',
    opacity: 0.85,
    textTransform: 'uppercase',
  },
  titulo: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', lineHeight: 27 },
  subtitulo: { fontSize: 13, color: '#F3F4F6', opacity: 0.9, lineHeight: 18 },
  puntos: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.border,
  },
  puntoActivo: { width: 18, backgroundColor: c.primary },
});
