import { useEffect, useState } from 'react';
import { catalogoService } from '@/services/catalogo.service';
import type { Categoria } from '@/types/models';

/**
 * Trae las categorías del catálogo (colección `categorias` de Firestore, con
 * fallback al mock local). Son las mismas que usa el profesional para armar
 * sus servicios, así que también alimentan el selector de especialidades.
 *
 * @param enabled permite diferir la carga hasta que la pantalla la necesite.
 */
export function useCategorias(enabled = true) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || categorias.length > 0) return;
    let activo = true;
    setLoading(true);
    catalogoService
      .listarCategorias()
      .then((data) => {
        if (activo) setCategorias(data);
      })
      .catch(() => {
        if (activo) setCategorias([]);
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, [enabled, categorias.length]);

  return { categorias, loading };
}
