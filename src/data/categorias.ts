import type { Categoria } from '@/types/models';

/**
 * Categorías de servicios para la app.
 * Fuente única de verdad para chips de filtro, búsquedas, etc.
 */
export const CATEGORIAS: Categoria[] = [
  { slug: 'pestanas_cejas', nombre: 'Pestañas y cejas', emoji: '👁️' },
  { slug: 'unas', nombre: 'Uñas', emoji: '💅' },
  { slug: 'depilacion', nombre: 'Depilación', emoji: '✨' },
  { slug: 'facial', nombre: 'Facial', emoji: '🧖‍♀️' },
  { slug: 'corporal', nombre: 'Corporal', emoji: '💆‍♀️' },
  { slug: 'capilar', nombre: 'Capilar / Peluquería', emoji: '💇‍♀️' },
  { slug: 'maquillaje', nombre: 'Maquillaje', emoji: '💄' },
  { slug: 'barberia', nombre: 'Barbería', emoji: '💈' },
  { slug: 'estetica_masculina', nombre: 'Estética masculina', emoji: '🧔' },
  { slug: 'bienestar_spa', nombre: 'Bienestar y spa', emoji: '🧘‍♀️' },
  { slug: 'fitness_salud', nombre: 'Fitness y salud', emoji: '🏋️' },
  { slug: 'peluqueria_canina', nombre: 'Peluquería canina', emoji: '🐕' },
  { slug: 'bienestar_animal', nombre: 'Bienestar animal', emoji: '🐾' },
];
