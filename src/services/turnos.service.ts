import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { CierreCaja, DetalleCobro, EstadoTurno, MetodoPago, Turno } from '@/types/models';
import { COMISION_PLATAFORMA } from '@/types/models';

const COLLECTION = 'turnos';

export const turnosService = {
  /**
   * Trae los turnos de un profesional, opcionalmente filtrados por fecha (YYYY-MM-DD).
   * Consulta por profesionalId y filtra fecha en cliente para evitar índice compuesto.
   */
  async listarDelProfesional(profesionalId: string, fecha?: string): Promise<Turno[]> {
    const q = query(
      collection(db, COLLECTION),
      where('profesionalId', '==', profesionalId),
    );
    const snap = await getDocs(q);
    let res = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Turno));
    if (fecha) res = res.filter((t) => t.fecha === fecha);
    return res.sort((a, b) => (a.hora < b.hora ? -1 : 1));
  },

  /** Trae todos los turnos de un cliente, ordenados del más reciente al más viejo. */
  async listarDelCliente(clienteId: string): Promise<Turno[]> {
    const q = query(
      collection(db, COLLECTION),
      where('clienteId', '==', clienteId),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Turno))
      .sort((a, b) => (a.fecha + a.hora < b.fecha + b.hora ? 1 : -1));
  },

  /** Crea un turno nuevo con estado "pendiente". */
  async reservar(input: Omit<Turno, 'id' | 'estado'>): Promise<Turno> {
    const nuevo = { ...input, estado: 'pendiente' as const };
    const ref = await addDoc(collection(db, COLLECTION), nuevo);
    return { ...nuevo, id: ref.id };
  },

  /** Cambia el estado de un turno y, opcionalmente, registra el método de pago.
   *  Al completar un turno se calcula automáticamente la comisión de la plataforma. */
  async actualizarEstado(
    turnoId: string,
    estado: EstadoTurno,
    metodo?: MetodoPago,
  ): Promise<Turno> {
    const ref = doc(db, COLLECTION, turnoId);
    const cambios: Record<string, unknown> = { estado };
    if (metodo) cambios.metodoPago = metodo;

    // Al completar, calcular comisión de la plataforma
    if (estado === 'completado') {
      const snap = await getDoc(ref);
      const turno = snap.data() as Turno;
      cambios.comisionPlataforma = Math.round(turno.monto * COMISION_PLATAFORMA);
    }

    await updateDoc(ref, cambios);
    const snap = await getDoc(ref);
    return { id: snap.id, ...snap.data() } as Turno;
  },

  /** Marca un turno como cancelado. */
  async cancelar(turnoId: string): Promise<void> {
    const ref = doc(db, COLLECTION, turnoId);
    await updateDoc(ref, { estado: 'cancelado' });
  },

  /** Resumen mensual de caja para el profesional. */
  async cierreCajaMensual(
    profesionalId: string,
    mes: number,
    anio: number,
  ): Promise<CierreCaja> {
    const q = query(
      collection(db, COLLECTION),
      where('profesionalId', '==', profesionalId),
    );
    const snap = await getDocs(q);
    const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Turno));

    const completados = todos.filter((t) => {
      if (t.estado !== 'completado') return false;
      // fecha está en formato YYYY-MM-DD; new Date() puede dar +1 día por zona horaria.
      const [y, m] = t.fecha.split('-').map(Number);
      return m - 1 === mes && y === anio;
    });

    const porMetodo: Record<MetodoPago, number> = {
      efectivo: 0,
      transferencia: 0,
      mercado_pago: 0,
      mixto: 0,
    };
    let total = 0;
    let totalComision = 0;
    completados.forEach((t) => {
      total += t.monto;
      if (t.metodoPago) porMetodo[t.metodoPago] += t.monto;
    });

    // Detalle individual de cada cobro, ordenado por fecha + hora
    const detalleCobros: DetalleCobro[] = completados
      .sort((a, b) => (a.fecha + a.hora < b.fecha + b.hora ? -1 : 1))
      .map((t) => {
        const comision = t.comisionPlataforma ?? Math.round(t.monto * COMISION_PLATAFORMA);
        totalComision += comision;
        return {
          turnoId: t.id,
          fecha: t.fecha,
          clienteNombre: t.clienteNombre,
          servicioNombre: t.servicioNombre,
          monto: t.monto,
          metodoPago: t.metodoPago ?? 'efectivo',
          comision,
          netoProfesional: t.monto - comision,
        };
      });

    return {
      mes,
      anio,
      totalCobrado: total,
      porMetodo,
      cantidadTurnos: completados.length,
      insumosComprados: 0, // se completa desde pedidosService
      totalComisionPlataforma: totalComision,
      gananciaNeta: total - totalComision,
      detalleCobros,
    };
  },
};
