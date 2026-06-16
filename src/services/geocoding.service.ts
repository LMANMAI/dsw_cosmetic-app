/**
 * Geocoding usando Nominatim (OpenStreetMap).
 * Gratis, sin API key. Límite: 1 request por segundo.
 * https://nominatim.org/release-docs/develop/api/Search/
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export interface GeoResult {
  latitud: number;
  longitud: number;
}

export interface DireccionSugerida {
  displayName: string;    // dirección completa formateada
  direccion: string;      // calle y número
  ciudad: string;
  latitud: number;
  longitud: number;
}

/**
 * Busca sugerencias de direcciones mientras el usuario escribe.
 * Retorna hasta 5 resultados.
 */
export async function buscarDirecciones(texto: string): Promise<DireccionSugerida[]> {
  if (texto.trim().length < 4) return [];

  try {
    const response = await fetch(
      `${NOMINATIM_URL}?${new URLSearchParams({
        q: `${texto.trim()}, Argentina`,
        format: 'json',
        limit: '5',
        countrycodes: 'ar',
        addressdetails: '1',
      })}`,
      {
        headers: {
          'User-Agent': 'YOFI/1.0 (contacto: lcasmanmaidana@gmail.com)',
        },
      },
    );

    if (!response.ok) return [];

    const results = await response.json();
    return results.map((r: any) => {
      const addr = r.address ?? {};
      const calle = [addr.road, addr.house_number].filter(Boolean).join(' ');
      const ciudad = addr.city || addr.town || addr.village || addr.suburb || addr.state || '';

      return {
        displayName: r.display_name,
        direccion: calle || r.display_name.split(',')[0],
        ciudad,
        latitud: parseFloat(r.lat),
        longitud: parseFloat(r.lon),
      };
    });
  } catch (error) {
    console.warn('[geocoding] Error buscando direcciones:', error);
    return [];
  }
}

/**
 * Convierte una dirección + ciudad en coordenadas lat/lng.
 * Retorna null si no se encontró la ubicación.
 */
export async function geocodificarDireccion(
  direccion: string,
  ciudad: string,
): Promise<GeoResult | null> {
  const query = `${direccion}, ${ciudad}, Argentina`;

  try {
    const response = await fetch(
      `${NOMINATIM_URL}?${new URLSearchParams({
        q: query,
        format: 'json',
        limit: '1',
        countrycodes: 'ar',
      })}`,
      {
        headers: {
          // Nominatim requiere un User-Agent identificable
          'User-Agent': 'YOFI/1.0 (contacto: lcasmanmaidana@gmail.com)',
        },
      },
    );

    if (!response.ok) return null;

    const results = await response.json();
    if (!results.length) return null;

    return {
      latitud: parseFloat(results[0].lat),
      longitud: parseFloat(results[0].lon),
    };
  } catch (error) {
    console.warn('[geocoding] Error al geocodificar:', error);
    return null;
  }
}

/**
 * Calcula la distancia en km entre dos puntos (fórmula de Haversine).
 */
export function calcularDistanciaKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // 1 decimal
}
