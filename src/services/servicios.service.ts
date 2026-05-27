import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { CategoriaSlug, Servicio, ServicioProfesional } from '@/types/models';

const COLLECTION = 'servicios_profesional';

export const serviciosService = {
  /** Lista todos los servicios activos de un profesional. */
  async listar(profesionalId: string): Promise<ServicioProfesional[]> {
    if (!profesionalId) return [];
    const q = query(
      collection(db, COLLECTION),
      where('profesionalId', '==', profesionalId),
      where('activo', '==', true),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ServicioProfesional))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  },

  /**
   * Lista servicios del profesional en el formato simplificado `Servicio`,
   * que es el que usa la pantalla de reserva del cliente.
   */
  async listarComoServicio(profesionalId: string): Promise<Servicio[]> {
    const items = await serviciosService.listar(profesionalId);
    return items.map((s) => ({
      id: s.id,
      profesionalId: s.profesionalId,
      nombre: s.nombre,
      precio: s.precio,
      duracionMin: s.duracionMin,
      categoria: s.categoria,
    }));
  },

  /** Agrega un servicio nuevo al profesional. */
  async agregar(
    profesionalId: string,
    datos: {
      catalogoId: string;
      nombre: string;
      precio: number;
      duracionMin: number;
      categoria: CategoriaSlug;
    },
  ): Promise<ServicioProfesional> {
    const nuevo = {
      profesionalId,
      catalogoId: datos.catalogoId,
      nombre: datos.nombre,
      precio: datos.precio,
      duracionMin: datos.duracionMin,
      categoria: datos.categoria,
      activo: true,
    };
    const ref = await addDoc(collection(db, COLLECTION), nuevo);
    return { id: ref.id, ...nuevo };
  },

  /** Edita precio y/o duración de un servicio existente. */
  async editar(
    servicioId: string,
    cambios: { precio?: number; duracionMin?: number },
  ): Promise<void> {
    const ref = doc(db, COLLECTION, servicioId);
    await updateDoc(ref, cambios);
  },

  /** Elimina (soft delete) un servicio. */
  async eliminar(servicioId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, servicioId));
  },
};
