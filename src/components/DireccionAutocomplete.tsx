import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buscarDirecciones, type DireccionSugerida } from '@/services/geocoding.service';
import { useTheme, radius, spacing } from '@/theme';

// react-native-maps no soporta web, lo cargamos solo en nativo
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
}

export interface DireccionSeleccionada {
  direccion: string;
  ciudad: string;
  latitud: number;
  longitud: number;
}

interface DireccionAutocompleteProps {
  onSelect: (resultado: DireccionSeleccionada) => void;
  placeholder?: string;
}

export function DireccionAutocomplete({
  onSelect,
  placeholder = 'Buscá tu dirección...',
}: DireccionAutocompleteProps) {
  const { colors } = useTheme();
  const [texto, setTexto] = useState('');
  const [sugerencias, setSugerencias] = useState<DireccionSugerida[]>([]);
  const [seleccionada, setSeleccionada] = useState<DireccionSugerida | null>(null);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce: buscar después de 600ms sin escribir
  const buscar = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 4) {
      setSugerencias([]);
      return;
    }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      const results = await buscarDirecciones(q);
      setSugerencias(results);
      setBuscando(false);
    }, 600);
  }, []);

  useEffect(() => {
    // Solo buscar si no hay seleccionada (el usuario está escribiendo)
    if (!seleccionada) buscar(texto);
  }, [texto, seleccionada, buscar]);

  const elegir = (s: DireccionSugerida) => {
    setSeleccionada(s);
    setTexto(s.displayName.split(',').slice(0, 2).join(','));
    setSugerencias([]);
    onSelect({
      direccion: s.direccion,
      ciudad: s.ciudad,
      latitud: s.latitud,
      longitud: s.longitud,
    });
  };

  const limpiar = () => {
    setTexto('');
    setSeleccionada(null);
    setSugerencias([]);
  };

  return (
    <View style={styles.container}>
      {/* Input de búsqueda */}
      <View style={[styles.inputWrap, { backgroundColor: colors.bone }]}>
        <Ionicons name="search-outline" size={18} color={colors.muted} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={[styles.input, { color: colors.ink }]}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          value={texto}
          onChangeText={(t) => {
            setTexto(t);
            if (seleccionada) setSeleccionada(null);
          }}
        />
        {texto.length > 0 ? (
          <Pressable onPress={limpiar} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {/* Indicador de búsqueda */}
      {buscando ? (
        <Text style={[styles.hint, { color: colors.muted }]}>Buscando direcciones...</Text>
      ) : null}

      {/* Lista de sugerencias */}
      {sugerencias.length > 0 && !seleccionada ? (
        <View style={[styles.suggestionsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {sugerencias.map((s, i) => (
            <Pressable
              key={`${s.latitud}-${s.longitud}-${i}`}
              style={({ pressed }) => [
                styles.suggestion,
                pressed && { backgroundColor: colors.surfaceAlt },
                i < sugerencias.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt },
              ]}
              onPress={() => elegir(s)}
            >
              <Ionicons name="location-outline" size={16} color={colors.primary} />
              <Text style={[styles.suggestionText, { color: colors.ink }]} numberOfLines={2}>
                {s.displayName}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Mini mapa de confirmación (solo nativo) o badge en web */}
      {seleccionada ? (
        MapView ? (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={{
                latitude: seleccionada.latitud,
                longitude: seleccionada.longitud,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: seleccionada.latitud,
                  longitude: seleccionada.longitud,
                }}
              >
                <View style={styles.pinWrap}>
                  <View style={[styles.pin, { backgroundColor: colors.primary, borderColor: colors.surface }]} />
                </View>
              </Marker>
            </MapView>
            <View style={[styles.mapOverlay, { backgroundColor: colors.surface }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.mapOverlayText, { color: colors.success }]}>Ubicación confirmada</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.confirmBadge, { backgroundColor: colors.bone }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={[styles.confirmText, { color: colors.ink }]}>
              Ubicación confirmada: {seleccionada.direccion}, {seleccionada.ciudad}
            </Text>
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: spacing.md,
  },
  hint: {
    fontSize: 12,
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
  suggestionsBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  mapContainer: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    height: 150,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  pinWrap: {
    alignItems: 'center',
  },
  pin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  mapOverlayText: {
    fontSize: 11,
    fontWeight: '600',
  },
  confirmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  confirmText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
});
