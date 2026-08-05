import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { CATEGORIAS, CATALOGO_SERVICIOS } from '@/data/catalogo';
import type { Categoria, CategoriaSlug, ServicioCatalogo } from '@/types/models';

/**
 * Servicio que expone el catálogo global de categorías y servicios.
 *
 * Intenta leer de Firestore; si la colección está vacía (todavía no se
 * corrió el seed), devuelve los datos locales del mock.
 */
export const catalogoService = {
  /** Lista todas las categorías disponibles. */
  async listarCategorias(): Promise<Categoria[]> {
    try {
      const snap = await getDocs(collection(db, 'categorias'));
      if (snap.empty) return CATEGORIAS;
      return snap.docs.map((d) => ({
        slug: d.id as CategoriaSlug,
        nombre: d.data().nombre,
        emoji: d.data().emoji,
        imagenUrl: d.data().imagenUrl as string | undefined,
      }));
    } catch {
      // Fallback al mock si Firestore falla (offline, sin permisos, etc.)
      return CATEGORIAS;
    }
  },

  /** Lista todos los servicios del catálogo, opcionalmente filtrados por categoría. */
  async listarServicios(categoriaSlug?: CategoriaSlug): Promise<ServicioCatalogo[]> {
    try {
      let q;
      if (categoriaSlug) {
        q = query(
          collection(db, 'catalogo_servicios'),
          where('categoria', '==', categoriaSlug),
        );
      } else {
        q = query(collection(db, 'catalogo_servicios'));
      }
      const snap = await getDocs(q);
      if (snap.empty) {
        // Fallback al mock
        return categoriaSlug
          ? CATALOGO_SERVICIOS.filter((s) => s.categoria === categoriaSlug)
          : CATALOGO_SERVICIOS;
      }
      return snap.docs.map((d) => ({
        id: d.id,
        nombre: d.data().nombre,
        categoria: d.data().categoria as CategoriaSlug,
        duracionEstimadaMin: d.data().duracionEstimadaMin,
        genero: d.data().genero ?? 'unisex',
      }));
    } catch {
      return categoriaSlug
        ? CATALOGO_SERVICIOS.filter((s) => s.categoria === categoriaSlug)
        : CATALOGO_SERVICIOS;
    }
  },

  /** Busca servicios por texto libre. */
  async buscar(texto: string): Promise<ServicioCatalogo[]> {
    // Firestore no soporta full-text search nativo,
    // así que buscamos en el array completo (client-side).
    const todos = await this.listarServicios();
    const t = texto.toLowerCase();
    return todos.filter(
      (s) =>
        s.nombre.toLowerCase().includes(t) ||
        s.categoria.includes(t),
    );
  },
};
