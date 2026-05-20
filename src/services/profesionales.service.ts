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
import type { CategoriaSlug, PerfilProfesional, Servicio, PerfilProfesionalSignup } from '@/types/models';
import { SERVICIOS_MOCK } from '@/data/profesionales.mock';

const USERS_COLLECTION = 'usuarios';

interface FiltrosBusqueda {
  categoria?: CategoriaSlug;
  textoLibre?: string;
  maxDistanciaKm?: number;
  userLat?: number;
  userLng?: number;
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
    'pestañas': 'pestanas',
    'pestanas': 'pestanas',
    'cejas': 'cejas',
    'masaje': 'masajes',
    'masajes': 'masajes',
    'nutricion': 'nutricion',
    'nutrición': 'nutricion',
    'estilismo': 'estilismo',
    'pelo': 'estilismo',
    'cabello': 'estilismo',
    'peluquería': 'estilismo',
    'peluqueria': 'estilismo',
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
    const q = query(
      collection(db, USERS_COLLECTION),
      where('rol', '==', 'profesional'),
    );

    const snapshot = await getDocs(q);
    let result: PerfilProfesional[] = [];

    snapshot.forEach((docSnap) => {
      const perfil = docToPerfilProfesional(
        docSnap.id,
        docSnap.data(),
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

    // Ordenar por cercanía
    return result.sort((a, b) => (a.distanciaKm ?? 99) - (b.distanciaKm ?? 99));
  },

  /**
   * Obtiene un profesional por su ID de usuario.
   */
  async obtenerPorId(id: string): Promise<PerfilProfesional | null> {
    const docSnap = await getDoc(doc(db, USERS_COLLECTION, id));
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    if (data.rol !== 'profesional') return null;
    return docToPerfilProfesional(docSnap.id, data);
  },

  /**
   * Lista servicios de un profesional.
   * TODO: migrar a Firestore cuando se implemente la gestión de servicios.
   */
  async listarServiciosDe(profesionalId: string): Promise<Servicio[]> {
    // Por ahora sigue con mock hasta que se implemente la gestión de servicios
    return SERVICIOS_MOCK.filter((s) => s.profesionalId === profesionalId);
  },
};
