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
import { configService } from './config.service';

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

  /** Crea un turno nuevo.
   *  - Si hay seña > 0: estado = pendiente_pago (espera pago por MercadoPago)
   *  - Si no hay seña y autoConfirmar: estado = confirmado
   *  - Si no hay seña y no autoConfirmar: estado = pendiente */
  async reservar(input: Omit<Turno, 'id' | 'estado'>, autoConfirmar?: boolean): Promise<Turno> {
    const tieneSeña = (input.montoSena ?? 0) > 0;
    let estado: EstadoTurno;
    if (tieneSeña) {
      estado = 'pendiente_pago';
    } else {
      estado = autoConfirmar ? 'confirmado' : 'pendiente';
    }
    const nuevo = { ...input, estado, senaPagada: false, autoConfirmar: !!autoConfirmar };
    const ref = await addDoc(collection(db, COLLECTION), nuevo);
    return { ...nuevo, id: ref.id };
  },

  /** Marca la seña como pagada y avanza el turno al estado correspondiente. */
  async confirmarPagoSena(turnoId: string, autoConfirmar?: boolean): Promise<void> {
    const estado: EstadoTurno = autoConfirmar ? 'confirmado' : 'pendiente';
    await updateDoc(doc(db, COLLECTION, turnoId), {
      senaPagada: true,
      metodoPago: 'mercado_pago',
      estado,
    });
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
    // (global de config/plataforma, personalizada del profesional, o 0 si
    // tiene exención vigente por premio de competencia).
    // Se snapshot-ea el % aplicado en el turno para que el histórico quede
    // congelado aunque después se ajuste la comisión.
    if (estado === 'completado') {
      const snap = await getDoc(ref);
      const turno = snap.data() as Turno;
      const { fraccion, porcentaje, exento, origen } =
        await configService.comisionDetallePara(turno.profesionalId);
      cambios.comisionPlataforma = Math.round(turno.monto * fraccion);
      cambios.comisionPorcentaje = porcentaje;
      cambios.comisionExento = exento;
      cambios.comisionOrigen = origen;
    }

    await updateDoc(ref, cambios);
    const snap = await getDoc(ref);
    return { id: snap.id, ...snap.data() } as Turno;
  },

  /** Actualiza la anticipación del recordatorio al cliente para un turno. */
  async actualizarRecordatorio(
    turnoId: string,
    recordatorioCliente: NonNullable<Turno['recordatorioCliente']>,
  ): Promise<void> {
    await updateDoc(doc(db, COLLECTION, turnoId), { recordatorioCliente });
  },

  /** Trae un turno puntual por id (lo usa la pantalla de detalle). */
  async obtener(turnoId: string): Promise<Turno | null> {
    const snap = await getDoc(doc(db, COLLECTION, turnoId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Turno) : null;
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
