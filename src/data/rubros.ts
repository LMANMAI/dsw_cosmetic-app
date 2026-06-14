import { CATEGORIAS } from './catalogo';

/**
 * Rubro de un proveedor: la "familia" de insumos que vende.
 *
 * Se alinea con las categorías de servicio que el profesional usa al cargar
 * sus servicios y precios, para que un proveedor de "Insumos para uñas"
 * matchee con los profesionales del rubro "Uñas".
 */
export interface Rubro {
  slug: string;
  nombre: string;
  emoji: string;
}

/** Rubros derivados de las categorías de servicio. */
const RUBROS_CATEGORIA: Rubro[] = CATEGORIAS.map((c) => ({
  slug: c.slug,
  nombre: `Insumos para ${c.nombre.toLowerCase()}`,
  emoji: c.emoji,
}));

/** Rubros generales que no dependen de una categoría puntual. */
const RUBROS_GENERALES: Rubro[] = [
  { slug: 'cosmetica_perfumeria', nombre: 'Cosmética y perfumería', emoji: '🧴' },
  { slug: 'equipamiento_mobiliario', nombre: 'Equipamiento y mobiliario', emoji: '🪑' },
  { slug: 'descartables_higiene', nombre: 'Descartables e higiene', emoji: '🧤' },
  { slug: 'otros_insumos', nombre: 'Otros insumos', emoji: '📦' },
];

/**
 * Fuente única de verdad para el select de rubro del proveedor.
 * Se usa como fallback cuando Firestore todavía no tiene la colección 'rubros'.
 */
export const RUBROS: Rubro[] = [...RUBROS_CATEGORIA, ...RUBROS_GENERALES];
