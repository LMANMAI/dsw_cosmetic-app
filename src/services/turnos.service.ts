import type { CierreCaja, EstadoTurno, MetodoPago, Turno } from '@/types/models';
import { TURNOS_MOCK } from '@/data/turnos.mock';
import { fakeDelay } from './api-client';

let _store: Turno[] = [...TURNOS_MOCK];

export const turnosService = {
  async listarDelProfesional(profesionalId: string, fecha?: string): Promise<Turno[]> {
    await fakeDelay();
    let res = _store.filter((t) => t.profesionalId === profesionalId);
    if (fecha) res = res.filter((t) => t.fecha === fecha);
    return res.sort((a, b) => (a.hora < b.hora ? -1 : 1));
  },

  async listarDelCliente(clienteId: string): Promise<Turno[]> {
    await fakeDelay();
    return _store
      .filter((t) => t.clienteId === clienteId)
      .sort((a, b) => (a.fecha + a.hora < b.fecha + b.hora ? 1 : -1));
  },

  async reservar(input: Omit<Turno, 'id' | 'estado'>): Promise<Turno> {
    await fakeDelay(450);
    const nuevo: Turno = {
      ...input,
      id: `t-${Date.now()}`,
      estado: 'pendiente',
    };
    _store.push(nuevo);
    return nuevo;
  },

  async actualizarEstado(turnoId: string, estado: EstadoTurno, metodo?: MetodoPago): Promise<Turno> {
    await fakeDelay(150);
    _store = _store.map((t) =>
      t.id === turnoId ? { ...t, estado, metodoPago: metodo ?? t.metodoPago } : t,
    );
    return _store.find((t) => t.id === turnoId)!;
  },

  async cancelar(turnoId: string): Promise<void> {
    await fakeDelay(150);
    _store = _store.map((t) => (t.id === turnoId ? { ...t, estado: 'cancelado' as const } : t));
  },

  async cierreCajaMensual(profesionalId: string, mes: number, anio: number): Promise<CierreCaja> {
    await fakeDelay();
    const completados = _store.filter(
      (t) =>
        t.profesionalId === profesionalId &&
        t.estado === 'completado' &&
        new Date(t.fecha).getMonth() === mes &&
        new Date(t.fecha).getFullYear() === anio,
    );
    const porMetodo: Record<MetodoPago, number> = {
      efectivo: 0,
      transferencia: 0,
      mercado_pago: 0,
      mixto: 0,
    };
    let total = 0;
    completados.forEach((t) => {
      total += t.monto;
      if (t.metodoPago) porMetodo[t.metodoPago] += t.monto;
    });
    return {
      mes,
      anio,
      totalCobrado: total,
      porMetodo,
      cantidadTurnos: completados.length,
      insumosComprados: 0, // se completa desde pedidosService
      gananciaNeta: total,
    };
  },
};
