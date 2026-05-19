import React, { useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, shadow } from '@/theme';
import type { PerfilProfesional } from '@/types/models';

interface MapaProfesionalesProps {
  items: PerfilProfesional[];
  badgeText: string;
  onMarkerPress?: (profesional: PerfilProfesional) => void;
}

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

function calcRegion(items: PerfilProfesional[]): MapRegion {
  if (items.length === 0) {
    return { latitude: -34.5759, longitude: -58.4892, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  }
  const lats = items.map((p) => p.latitud);
  const lngs = items.map((p) => p.longitud);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const deltaLat = Math.max((maxLat - minLat) * 1.5, 0.02);
  const deltaLng = Math.max((maxLng - minLng) * 1.5, 0.02);
  return { latitude: centerLat, longitude: centerLng, latitudeDelta: deltaLat, longitudeDelta: deltaLng };
}

function calcZoom(latitudeDelta: number): number {
  const zoom = Math.round(Math.log2(360 / latitudeDelta)) - 1;
  return Math.min(Math.max(zoom, 10), 16);
}

function buildLeafletHtml(items: PerfilProfesional[], region: MapRegion): string {
  const zoom = calcZoom(region.latitudeDelta);
  const markersJs = items
    .map(
      (p) => `
      L.marker([${p.latitud}, ${p.longitud}], { icon: pinIcon })
        .addTo(map)
        .bindPopup('<b>${p.nombre.replace(/'/g, "\\'")}</b><br>${p.zona.replace(/'/g, "\\'")} · ${p.distanciaKm}km · ⭐ ${p.rating}')
        .on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker', id: '${p.id}' }));
        });`,
    )
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; }
    .custom-pin {
      width: 28px;
      height: 28px;
      background: #B84968;
      border: 3px solid #fff;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .leaflet-popup-content { margin: 10px 14px; font-size: 13px; line-height: 1.4; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
    }).setView([${region.latitude}, ${region.longitude}], ${zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    var pinIcon = L.divIcon({
      className: '',
      html: '<div class="custom-pin"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    });

    ${markersJs}
  </script>
</body>
</html>`;
}

export function MapaProfesionales({ items, badgeText, onMarkerPress }: MapaProfesionalesProps) {
  const region = useMemo(() => calcRegion(items), [items]);
  const html = useMemo(() => buildLeafletHtml(items, region), [items, region]);
  const webViewRef = useRef<WebView>(null);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'marker' && onMarkerPress) {
        const pro = items.find((p) => p.id === data.id);
        if (pro) onMarkerPress(pro);
      }
    } catch {
      // ignore
    }
  };

  return (
    <View style={styles.mapBox}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.map}
        scrollEnabled={false}
        nestedScrollEnabled
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
      />
      <Badge text={badgeText} />
    </View>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View style={styles.mapBadge} pointerEvents="none">
      <Ionicons name="map-outline" size={14} color={colors.muted} />
      <Text style={styles.mapBadgeText}>{text}</Text>
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
