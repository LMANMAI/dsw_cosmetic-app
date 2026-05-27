import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Disponibilidad, Franja } from '@/types/models';

/**
 * Colección en Firestore: "disponibilidad"
 * Cada documento tiene como ID el profesionalId.
 * Estructura del documento:
 *   { slots: { diaSemana: number; franjas: Franja[] }[] }
 */
const COLLECTION = 'disponibilidad';

/** Genera slots HH:mm dentro de una franja según duracionMin. */
function slotsDeFragja(franja: Franja, duracionMin: number): string[] {
  const slots: string[] = [];
  const [hiH, hiM] = franja.horaInicio.split(':').map(Number);
  const [hfH, hfM] = franja.horaFin.split(':').map(Number);
  const inicioMin = hiH * 60 + hiM;
  const finMin = hfH * 60 + hfM;
  for (let m = inicioMin; m + duracionMin <= finMin; m += duracionMin) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  }
  return slots;
}

export const disponibilidadService = {
  /**
   * Devuelve la disponibilidad configurada para un profesional.
   * Array vacío = nunca configuró horarios.
   */
  async listar(profesionalId: string): Promise<Disponibilidad[]> {
    if (!profesionalId) return [];
    const ref = doc(db, COLLECTION, profesionalId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];

    const data = snap.data() as { slots: any[] };
    return (data.slots ?? [])
      .map((s): Disponibilidad => {
        // Compatibilidad con el formato viejo ({ horaInicio, horaFin } directo)
        const franjas: Franja[] = s.franjas ?? [
          { horaInicio: s.horaInicio, horaFin: s.horaFin },
        ];
        return { diaSemana: s.diaSemana, franjas, profesionalId };
      })
      .sort((a, b) => a.diaSemana - b.diaSemana);
  },

  /** Indica si el profesional ya configuró al menos un día. */
  async tieneAgenda(profesionalId: string): Promise<boolean> {
    if (!profesionalId) return false;
    const ref = doc(db, COLLECTION, profesionalId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const data = snap.data() as { slots: unknown[] };
    return Array.isArray(data.slots) && data.slots.length > 0;
  },

  /**
   * Guarda (reemplaza) toda la disponibilidad de un profesional.
   * Recibe un array con los días activos, cada uno con sus franjas.
   */
  async guardar(
    profesionalId: string,
    slots: Omit<Disponibilidad, 'profesionalId'>[],
  ): Promise<Disponibilidad[]> {
    const ref = doc(db, COLLECTION, profesionalId);
    await setDoc(ref, { slots });
    return slots.map((s) => ({ ...s, profesionalId }));
  },

  /** Elimina toda la disponibilidad de un profesional. */
  async eliminar(profesionalId: string): Promise<void> {
    const ref = doc(db, COLLECTION, profesionalId);
    await deleteDoc(ref);
  },

  /**
   * Dado un día de la semana y una fecha concreta, devuelve los horarios libres
   * en intervalos según la duración del servicio, descontando los ya reservados.
   * Soporta múltiples franjas por día (ej: 10-14 y 16-20).
   *
   * @param fecha  Fecha en formato YYYY-MM-DD. Si se omite no se descontarán turnos.
   */
  async horariosDisponibles(
    profesionalId: string,
    diaSemana: number,
    duracionMin: number,
    fecha?: string,
  ): Promise<string[]> {
    const todos = await disponibilidadService.listar(profesionalId);
    const dia = todos.find((d) => d.diaSemana === diaSemana);
    if (!dia) return [];

    // Generar todos los slots posibles uniendo todas las franjas del día
    const slots = dia.franjas.flatMap((f) => slotsDeFragja(f, duracionMin));

    // Descontar los slots ya ocupados (pendiente o confirmado) para esa fecha
    if (fecha) {
      const q = query(
        collection(db, 'turnos'),
        where('profesionalId', '==', profesionalId),
        where('fecha', '==', fecha),
      );
      const snap = await getDocs(q);
      const horasOcupadas = new Set(
        snap.docs
          .filter((d) => ['pendiente', 'confirmado'].includes(d.data().estado))
          .map((d) => d.data().hora as string),
      );
      return slots.filter((s) => !horasOcupadas.has(s));
    }

    return slots;
  },
};
