import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type { Banner, CategoriaSlug } from '@/types/models';

const COLLECTION = 'banners';

/**
 * Banners promocionales del home del cliente.
 * Se cargan desde el panel admin (sección Banners). Si la colección está
 * vacía o falla la lectura, la app simplemente no muestra el carrusel.
 */
export const bannersService = {
  /** Banners activos, ordenados por `orden` (menor primero). */
  async listarActivos(): Promise<Banner[]> {
    try {
      const q = query(collection(db, COLLECTION), where('activo', '==', true));
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            titulo: (data.titulo as string) ?? '',
            subtitulo: data.subtitulo as string | undefined,
            imagenUrl: (data.imagenUrl as string) ?? '',
            categoriaSlug: data.categoriaSlug as CategoriaSlug | undefined,
            orden: typeof data.orden === 'number' ? data.orden : 0,
            activo: data.activo !== false,
            creadoEn: data.creadoEn as string | undefined,
          } satisfies Banner;
        })
        .filter((b) => !!b.imagenUrl)
        .sort((a, b) => a.orden - b.orden);
    } catch {
      // Sin conexión o sin permisos: el home se muestra sin banners.
      return [];
    }
  },
};
