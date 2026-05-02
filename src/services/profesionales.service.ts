import type { CategoriaSlug, PerfilProfesional, Servicio } from '@/types/models';
import { PROFESIONALES_MOCK, SERVICIOS_MOCK } from '@/data/profesionales.mock';
import { fakeDelay } from './api-client';

interface FiltrosBusqueda {
  categoria?: CategoriaSlug;
  textoLibre?: string;
  maxDistanciaKm?: number;
}

export const profesionalesService = {
  async listar(filtros: FiltrosBusqueda = {}): Promise<PerfilProfesional[]> {
    await fakeDelay();
    // TODO backend → GET /profesionales?categoria=&q=&maxKm=
    let result = [...PROFESIONALES_MOCK];

    if (filtros.categoria) {
      result = result.filter((p) => p.categorias.includes(filtros.categoria!));
    }
    if (filtros.textoLibre) {
      const q = filtros.textoLibre.toLowerCase();
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.zona.toLowerCase().includes(q) ||
          p.descripcion.toLowerCase().includes(q),
      );
    }
    if (filtros.maxDistanciaKm) {
      result = result.filter((p) => (p.distanciaKm ?? 99) <= filtros.maxDistanciaKm!);
    }

    return result.sort((a, b) => (a.distanciaKm ?? 99) - (b.distanciaKm ?? 99));
  },

  async obtenerPorId(id: string): Promise<PerfilProfesional | null> {
    await fakeDelay(150);
    return PROFESIONALES_MOCK.find((p) => p.id === id) ?? null;
  },

  async listarServiciosDe(profesionalId: string): Promise<Servicio[]> {
    await fakeDelay(150);
    return SERVICIOS_MOCK.filter((s) => s.profesionalId === profesionalId);
  },
};
