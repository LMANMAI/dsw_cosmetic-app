import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, shadow } from '@/theme';
import type { PerfilProfesional } from '@/types/models';

interface MapaProfesionalesProps {
  items: PerfilProfesional[];
  badgeText: string;
  onMarkerPress?: (profesional: PerfilProfesional) => void;
  userLat?: number;
  userLng?: number;
  onRecenterPress?: () => void;
  onSearchArea?: (lat: number, lng: number) => void;
}

function calcRegion(items: PerfilProfesional[], userLat?: number, userLng?: number): Region {
  if (items.length === 0) {
    return {
      latitude: userLat ?? -34.5759,
      longitude: userLng ?? -58.4892,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };
  }
  const lats = items.map((p) => p.latitud);
  const lngs = items.map((p) => p.longitud);
  // Incluir ubicación del usuario en el cálculo de bounds
  if (userLat != null && userLng != null) {
    lats.push(userLat);
    lngs.push(userLng);
  }
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const deltaLat = Math.max((maxLat - minLat) * 1.4, 0.015);
  const deltaLng = Math.max((maxLng - minLng) * 1.4, 0.015);
  return { latitude: centerLat, longitude: centerLng, latitudeDelta: deltaLat, longitudeDelta: deltaLng };
}

export function MapaProfesionales({ items, badgeText, onMarkerPress, userLat, userLng, onRecenterPress, onSearchArea }: MapaProfesionalesProps) {
  const mapRef = useRef<MapView>(null);
  const itemsConUbicacion = useMemo(
    () => items.filter((p) => p.latitud !== 0 && p.longitud !== 0),
    [items],
  );
  const region = useMemo(() => calcRegion(itemsConUbicacion, userLat, userLng), [itemsConUbicacion, userLat, userLng]);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  // Guardar la región "base" para detectar movimiento
  const baseRegionRef = useRef<{ lat: number; lng: number }>({ lat: region.latitude, lng: region.longitude });
  const pendingRecenterRef = useRef(false);

  // Cuando las coordenadas del usuario cambian y hay un recentrado pendiente, animar el mapa
  useEffect(() => {
    if (pendingRecenterRef.current && userLat != null && userLng != null && mapRef.current) {
      const newRegion: Region = {
        latitude: userLat,
        longitude: userLng,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
      mapRef.current.animateToRegion(newRegion, 500);
      baseRegionRef.current = { lat: userLat, lng: userLng };
      setShowSearchHere(false);
      pendingRecenterRef.current = false;
    }
  }, [userLat, userLng]);

  const handleRegionChangeComplete = useCallback(
    (newRegion: Region) => {
      const base = baseRegionRef.current;
      const moved =
        Math.abs(newRegion.latitude - base.lat) > 0.005 ||
        Math.abs(newRegion.longitude - base.lng) > 0.005;
      lastCenterRef.current = { lat: newRegion.latitude, lng: newRegion.longitude };
      setShowSearchHere(moved);
    },
    [],
  );

  const handleSearchHere = useCallback(() => {
    if (lastCenterRef.current && onSearchArea) {
      onSearchArea(lastCenterRef.current.lat, lastCenterRef.current.lng);
      // Actualizar la base para que el botón desaparezca
      baseRegionRef.current = { lat: lastCenterRef.current.lat, lng: lastCenterRef.current.lng };
      setShowSearchHere(false);
    }
  }, [onSearchArea]);

  const handleRecenter = useCallback(() => {
    pendingRecenterRef.current = true;
    // Pedir nueva ubicación al padre (fetchLocation)
    if (onRecenterPress) onRecenterPress();
    // Si ya tenemos coordenadas, animar inmediatamente
    if (userLat != null && userLng != null && mapRef.current) {
      const newRegion: Region = {
        latitude: userLat,
        longitude: userLng,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
      mapRef.current.animateToRegion(newRegion, 500);
      baseRegionRef.current = { lat: userLat, lng: userLng };
      setShowSearchHere(false);
      pendingRecenterRef.current = false;
    }
  }, [onRecenterPress, userLat, userLng]);

  return (
    <View style={styles.mapBox}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        mapPadding={{ top: 0, right: 0, bottom: 40, left: 0 }}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {/* Marker del usuario */}
        {userLat != null && userLng != null ? (
          <Marker
            coordinate={{ latitude: userLat, longitude: userLng }}
            title="Tu ubicación"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userMarker}>
              <View style={styles.userDot} />
            </View>
          </Marker>
        ) : null}

        {/* Markers de profesionales (pines) */}
        {itemsConUbicacion.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitud, longitude: p.longitud }}
            title={p.nombre}
            description={`${p.zona} · ${p.distanciaKm ?? '?'}km · ⭐ ${p.rating}`}
            onCalloutPress={() => onMarkerPress?.(p)}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.pinWrap}>
              <View style={styles.pinHead}>
                <Ionicons name="cut" size={12} color={colors.white} />
              </View>
              <View style={styles.pinTail} />
              {p.distanciaKm != null ? (
                <Text style={styles.markerLabel}>{p.distanciaKm}km</Text>
              ) : null}
            </View>
          </Marker>
        ))}
      </MapView>
      {/* Botón "Buscar en esta zona" */}
      {showSearchHere ? (
        <Pressable style={styles.searchHereBtn} onPress={handleSearchHere}>
          <Ionicons name="refresh-outline" size={14} color={colors.white} />
          <Text style={styles.searchHereTxt}>Buscar en esta zona</Text>
        </Pressable>
      ) : null}

      {/* Botón recentrar ubicación */}
      {onRecenterPress ? (
        <Pressable style={styles.recenterBtn} onPress={handleRecenter}>
          <Ionicons name="locate-outline" size={18} color={colors.rose} />
        </Pressable>
      ) : null}

      <View style={styles.mapBadge} pointerEvents="none">
        <Ionicons name="map-outline" size={14} color={colors.muted} />
        <Text style={styles.mapBadgeText}>{badgeText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: {
    marginHorizontal: spacing.xxl,
    height: 240,
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
    ...shadow.card,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  userMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4A90D9',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#4A90D9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  pinWrap: {
    alignItems: 'center',
  },
  pinHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.rose,
    borderWidth: 2.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.rose,
    marginTop: -1,
  },
  markerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.rose,
    backgroundColor: colors.white,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
    overflow: 'hidden',
  },
  searchHereBtn: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.rose,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  searchHereTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  recenterBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
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
});
