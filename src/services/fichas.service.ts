import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { turnosService } from './turnos.service';
import type { FichaCliente, ResumenCliente, Turno } from '@/types/models';

const COLLECTION = 'fichas_cliente';

/** ID determinístico: una ficha por par profesional-cliente. */
const fichaId = (profesionalId: string, clienteId: string) =>
  `${profesionalId}_${clienteId}`;

export const fichasService = {
  /**
   * Crea una ficha manual para un cliente que no usa la app.
   * Genera un clienteId propio (prefijo "manual_").
   */
  async crearManual(
    profesionalId: string,
    datos: { nombre: string; telefono?: string; email?: string; notas?: string },
  ): Promise<string> {
    const clienteId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await setDoc(doc(db, COLLECTION, fichaId(profesionalId, clienteId)), {
      profesionalId,
      clienteId,
      clienteNombre: datos.nombre,
      telefono: datos.telefono ?? '',
      email: datos.email ?? '',
      notas: datos.notas ?? '',
      esManual: true,
      actualizadoEn: new Date().toISOString(),
    });
    return clienteId;
  },

  /**
   * Lista de clientes del profesional: derivada automáticamente de sus
   * turnos + las fichas creadas a mano (clientes sin cuenta en la app).
   */
  async listarClientes(profesionalId: string): Promise<ResumenCliente[]> {
    const [turnos, fichasSnap] = await Promise.all([
      turnosService.listarDelProfesional(profesionalId),
      getDocs(
        query(collection(db, COLLECTION), where('profesionalId', '==', profesionalId)),
      ),
    ]);
    const porCliente = new Map<string, ResumenCliente>();

    // Fichas manuales (clientes sin turnos en la app).
    fichasSnap.docs.forEach((d) => {
      const f = d.data() as FichaCliente;
      if (!f.esManual || !f.clienteId) return;
      porCliente.set(f.clienteId, {
        clienteId: f.clienteId,
        nombre: f.clienteNombre || '—',
        cantTurnos: 0,
        completados: 0,
        totalGastado: 0,
        ultimoTurno: '',
        esManual: true,
      });
    });

    for (const t of turnos) {
      if (!t.clienteId) continue;
      const prev = porCliente.get(t.clienteId);
      const completado = t.estado === 'completado';
      if (!prev) {
        porCliente.set(t.clienteId, {
          clienteId: t.clienteId,
          nombre: t.clienteNombre || '—',
          cantTurnos: 1,
          completados: completado ? 1 : 0,
          totalGastado: completado ? t.monto ?? 0 : 0,
          ultimoTurno: t.fecha,
          ultimoServicio: t.servicioNombre,
        });
      } else {
        prev.cantTurnos += 1;
        if (completado) {
          prev.completados += 1;
          prev.totalGastado += t.monto ?? 0;
        }
        if (t.fecha > prev.ultimoTurno) {
          prev.ultimoTurno = t.fecha;
          prev.ultimoServicio = t.servicioNombre;
        }
      }
    }

    return [...porCliente.values()].sort((a, b) =>
      a.ultimoTurno < b.ultimoTurno ? 1 : -1,
    );
  },

  /** Historial de turnos del profesional con un cliente puntual. */
  async historialConCliente(
    profesionalId: string,
    clienteId: string,
  ): Promise<Turno[]> {
    const turnos = await turnosService.listarDelProfesional(profesionalId);
    return turnos
      .filter((t) => t.clienteId === clienteId)
      .sort((a, b) => (a.fecha + a.hora < b.fecha + b.hora ? 1 : -1));
  },

  /** Trae la ficha guardada (notas/contacto), o null si nunca se editó. */
  async obtener(
    profesionalId: string,
    clienteId: string,
  ): Promise<FichaCliente | null> {
    const snap = await getDoc(doc(db, COLLECTION, fichaId(profesionalId, clienteId)));
    return snap.exists() ? (snap.data() as FichaCliente) : null;
  },

  /** Crea/actualiza la ficha (merge, así no pisa campos no enviados). */
  async guardar(
    profesionalId: string,
    clienteId: string,
    datos: Partial<Pick<FichaCliente, 'telefono' | 'email' | 'notas' | 'clienteNombre'>>,
  ): Promise<void> {
    await setDoc(
      doc(db, COLLECTION, fichaId(profesionalId, clienteId)),
      {
        profesionalId,
        clienteId,
        ...datos,
        actualizadoEn: new Date().toISOString(),
      },
      { merge: true },
    );
  },
};
