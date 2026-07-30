import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { calcularDistanciaKm } from './geocoding.service';
import { serviciosService } from './servicios.service';
import { valoracionesService } from './valoraciones.service';
import type { CategoriaSlug, PerfilProfesional, Servicio, PerfilProfesionalSignup } from '@/types/models';

const USERS_COLLECTION = 'usuarios';

interface FiltrosBusqueda {
  categoria?: CategoriaSlug;
  textoLibre?: string;
  maxDistanciaKm?: number;
  userLat?: number;
  userLng?: number;
  /** Id del usuario que busca: se excluye para que nadie se reserve a sí mismo. */
  excluirUsuarioId?: string;
}

/**
 * Una cuenta cuenta como profesional si tiene el flag `esProfesional` (nuevo)
 * o si su rol es 'profesional' (cuentas anteriores al flag). El flag es
 * necesario porque un profesional puede estar navegando en vista cliente
 * (rol == 'cliente') y no debe desaparecer de las búsquedas.
 */
function esCuentaProfesional(data: any): boolean {
  return data?.esProfesional === true || data?.rol === 'profesional';
}

/**
 * Convierte un documento de Firestore (usuario profesional) a PerfilProfesional
 * para que la UI de búsqueda lo pueda mostrar.
 */
function docToPerfilProfesional(
  docId: string,
  data: any,
  userLat?: number,
  userLng?: number,
): PerfilProfesional | null {
  const perfil = data.perfil as PerfilProfesionalSignup | undefined;
  if (!perfil) return null;

  // Solo mostramos profesionales que tengan coordenadas y trabajen en salón o ambos
  // (los de domicilio no tienen ubicación fija para mostrar en el mapa)
  const tieneUbicacion = perfil.latitud != null && perfil.longitud != null;

  let distanciaKm: number | undefined;
  if (tieneUbicacion && userLat != null && userLng != null) {
    distanciaKm = calcularDistanciaKm(userLat, userLng, perfil.latitud!, perfil.longitud!);
  }

  return {
    id: docId,
    usuarioId: docId,
    nombre: data.nombre ?? '',
    descripcion: perfil.especialidad ?? '',
    zona: perfil.ciudad ?? '',
    direccion: perfil.direccion ?? '',
    ciudad: perfil.ciudad ?? '',
    latitud: perfil.latitud ?? 0,
    longitud: perfil.longitud ?? 0,
    telefono: data.telefono ?? '',
    instagram: perfil.instagram ?? '',
    modalidad: perfil.modalidad ?? 'domicilio',
    fotoSalon: perfil.fotoSalonUrl,
    rating: 0,     // nuevo profesional, sin calificaciones
    reviews: 0,
    activa: true,
    categorias: mapEspecialidadACategorias(perfil.especialidad),
    fotoUrl: data.avatarUrl,
    distanciaKm,
    autoConfirmarTurnos: perfil.autoConfirmarTurnos ?? false,
    anticipoPorcentaje: perfil.anticipoPorcentaje ?? 20,
  };
}

/**
 * Mapea la especialidad de texto libre a categorías del sistema.
 */
function mapEspecialidadACategorias(especialidad: string): CategoriaSlug[] {
  const esp = (especialidad ?? '').toLowerCase();
  const map: Record<string, CategoriaSlug> = {
    'uñas': 'unas',
    'unas': 'unas',
    'manicura': 'unas',
    'pedicura': 'unas',
    'pestañas': 'pestanas_cejas',
    'pestanas': 'pestanas_cejas',
    'cejas': 'pestanas_cejas',
    'masaje': 'corporal',
    'masajes': 'corporal',
    'corporal': 'corporal',
    'drenaje': 'corporal',
    'facial': 'facial',
    'limpieza facial': 'facial',
    'depilación': 'depilacion',
    'depilacion': 'depilacion',
    'láser': 'depilacion',
    'nutricion': 'bienestar_spa',
    'nutrición': 'bienestar_spa',
    'bienestar': 'bienestar_spa',
    'spa': 'bienestar_spa',
    'estilismo': 'capilar',
    'pelo': 'capilar',
    'cabello': 'capilar',
    'peluquería': 'capilar',
    'peluqueria': 'capilar',
    'corte': 'capilar',
    'maquillaje': 'maquillaje',
    'barbería': 'barberia',
    'barberia': 'barberia',
    'barba': 'barberia',
    'canino': 'peluqueria_canina',
    'mascota': 'peluqueria_canina',
  };

  const categorias: CategoriaSlug[] = [];
  for (const [keyword, cat] of Object.entries(map)) {
    if (esp.includes(keyword) && !categorias.includes(cat)) {
      categorias.push(cat);
    }
  }
  return categorias;
}

export const profesionalesService = {
  /**
   * Lista profesionales desde Firestore.
   * Filtra por categoría, texto libre y distancia máxima.
   */
  async listar(filtros: FiltrosBusqueda = {}): Promise<PerfilProfesional[]> {
    // Dos consultas en vez de un OR: por el flag nuevo y por el rol (cuentas
    // viejas sin flag). Se deduplica por id de documento.
    const [porFlag, porRol] = await Promise.all([
      getDocs(query(collection(db, USERS_COLLECTION), where('esProfesional', '==', true))),
      getDocs(query(collection(db, USERS_COLLECTION), where('rol', '==', 'profesional'))),
    ]);

    const docs = new Map<string, any>();
    [porFlag, porRol].forEach((snap) =>
      snap.forEach((d) => {
        if (!docs.has(d.id)) docs.set(d.id, d.data());
      }),
    );

    let result: PerfilProfesional[] = [];

    docs.forEach((data, docId) => {
      // No mostrar profesionales suspendidos o con perfil oculto
      if (data.suspendida) return;
      if (!esCuentaProfesional(data)) return;
      // Un profesional en vista cliente no se ve a sí mismo en la búsqueda
      if (filtros.excluirUsuarioId && docId === filtros.excluirUsuarioId) return;
      const perfilData = data.perfil as PerfilProfesionalSignup | undefined;
      if (perfilData?.perfilVisible === false) return;

      const perfil = docToPerfilProfesional(
        docId,
        data,
        filtros.userLat,
        filtros.userLng,
      );
      if (perfil) result.push(perfil);
    });

    // Filtro por categoría
    if (filtros.categoria) {
      result = result.filter((p) => p.categorias.includes(filtros.categoria!));
    }

    // Filtro por texto libre
    if (filtros.textoLibre) {
      const texto = filtros.textoLibre.toLowerCase();
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(texto) ||
          p.zona.toLowerCase().includes(texto) ||
          p.descripcion.toLowerCase().includes(texto),
      );
    }

    // Filtro por distancia máxima
    if (filtros.maxDistanciaKm) {
      result = result.filter((p) => (p.distanciaKm ?? 99) <= filtros.maxDistanciaKm!);
    }

    // Enriquecer con valoraciones reales (no bloquear si falla)
    await Promise.all(
      result.map(async (p) => {
        try {
          const resumen = await valoracionesService.obtenerResumen(p.id);
          p.rating = resumen.rating;
          p.reviews = resumen.cantidad;
        } catch { /* permisos pendientes, mostrar 0 */ }
      }),
    );

    // Ordenar por cercanía
    return result.sort((a, b) => (a.distanciaKm ?? 99) - (b.distanciaKm ?? 99));
  },

  /**
   * Obtiene un profesional por su ID de usuario.
   */
  async obtenerPorId(id: string): Promise<PerfilProfesional | null> {
    const [docSnap, resumen] = await Promise.all([
      getDoc(doc(db, USERS_COLLECTION, id)),
      valoracionesService.obtenerResumen(id).catch(() => ({ rating: 0, cantidad: 0 })),
    ]);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    if (!esCuentaProfesional(data)) return null;
    const perfil = docToPerfilProfesional(docSnap.id, data);
    if (perfil) {
      perfil.rating = resumen.rating;
      perfil.reviews = resumen.cantidad;
    }
    return perfil;
  },

  /** Lista los servicios activos de un profesional desde Firestore. */
  async listarServiciosDe(profesionalId: string): Promise<Servicio[]> {
    return serviciosService.listarComoServicio(profesionalId);
  },
};
