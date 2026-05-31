import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Valoracion } from '@/types/models';

const COLLECTION = 'valoraciones';

export const valoracionesService = {
  /** Lista todas las valoraciones de un profesional, ordenadas por fecha desc. */
  async listarDelProfesional(profesionalId: string): Promise<Valoracion[]> {
    const q = query(
      collection(db, COLLECTION),
      where('profesionalId', '==', profesionalId),
    );
    const snap = await getDocs(q);
    const res = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Valoracion));
    return res.sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
  },

  /** Calcula el rating promedio y la cantidad de reseñas. */
  async obtenerResumen(profesionalId: string): Promise<{ rating: number; cantidad: number }> {
    const valoraciones = await this.listarDelProfesional(profesionalId);
    if (valoraciones.length === 0) return { rating: 0, cantidad: 0 };
    const suma = valoraciones.reduce((acc, v) => acc + v.puntuacion, 0);
    return {
      rating: Math.round((suma / valoraciones.length) * 10) / 10,
      cantidad: valoraciones.length,
    };
  },

  /** Verifica si ya existe una valoración para un turno específico. */
  async existeParaTurno(turnoId: string): Promise<boolean> {
    const q = query(
      collection(db, COLLECTION),
      where('turnoId', '==', turnoId),
    );
    const snap = await getDocs(q);
    return !snap.empty;
  },

  /** Devuelve los IDs de turnos que ya fueron valorados por un cliente. */
  async turnosValoradosPorCliente(clienteId: string): Promise<Set<string>> {
    const q = query(
      collection(db, COLLECTION),
      where('clienteId', '==', clienteId),
    );
    const snap = await getDocs(q);
    return new Set(snap.docs.map((d) => d.data().turnoId as string));
  },

  /** Crea una valoración (la usa el cliente tras completar un turno). */
  async crear(data: Omit<Valoracion, 'id'>): Promise<string> {
    // Prevenir duplicados: verificar que no exista ya una valoración para este turno
    const yaExiste = await this.existeParaTurno(data.turnoId);
    if (yaExiste) {
      throw new Error('Ya valoraste este servicio.');
    }
    const docRef = await addDoc(collection(db, COLLECTION), data);
    return docRef.id;
  },
};
