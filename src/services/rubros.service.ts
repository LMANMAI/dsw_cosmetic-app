import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { RUBROS, type Rubro } from '@/data/rubros';

/**
 * Servicio que expone los rubros de proveedores.
 *
 * Intenta leer de Firestore (colección 'rubros'); si está vacía o falla
 * (offline, sin permisos), cae a la lista local. Mismo patrón que
 * catalogoService.
 */
export const rubrosService = {
  /** Lista todos los rubros disponibles para el select del proveedor. */
  async listar(): Promise<Rubro[]> {
    try {
      const snap = await getDocs(collection(db, 'rubros'));
      if (snap.empty) return RUBROS;
      return snap.docs.map((d) => ({
        slug: d.id,
        nombre: d.data().nombre,
        emoji: d.data().emoji,
      }));
    } catch {
      return RUBROS;
    }
  },

  /**
   * Siembra la colección 'rubros' en Firestore a partir de la lista local.
   * Se puede disparar desde un botón de dev/admin. No pisa datos existentes.
   */
  async seed(): Promise<{ rubros: number }> {
    const snap = await getDocs(collection(db, 'rubros'));
    if (!snap.empty) {
      console.log('Los rubros ya existen en Firestore, salteando seed.');
      return { rubros: snap.size };
    }
    const batch = writeBatch(db);
    for (const r of RUBROS) {
      const ref = doc(db, 'rubros', r.slug);
      batch.set(ref, { nombre: r.nombre, emoji: r.emoji });
    }
    await batch.commit();
    console.log(`Seed de rubros completado: ${RUBROS.length} rubros`);
    return { rubros: RUBROS.length };
  },
};
