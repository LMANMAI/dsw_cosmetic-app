import type { Disponibilidad } from '@/types/models';
import { fakeDelay } from './api-client';

/** Store in-memory — vacío al inicio (profesional nuevo sin agenda). */
let _store: Disponibilidad[] = [];

export const disponibilidadService = {
  /**
   * Devuelve la disponibilidad configurada para un profesional.
   * Array vacío = nunca configuró horarios.
   */
  async listar(profesionalId: string): Promise<Disponibilidad[]> {
    await fakeDelay(200);
    return _store
      .filter((d) => d.profesionalId === profesionalId)
      .sort((a, b) => a.diaSemana - b.diaSemana);
  },

  /** Indica si el profesional ya configuró al menos un día. */
  async tieneAgenda(profesionalId: string): Promise<boolean> {
    await fakeDelay(100);
    return _store.some((d) => d.profesionalId === profesionalId);
  },

  /**
   * Guarda (reemplaza) toda la disponibilidad de un profesional.
   * Recibe un array con los días activos y sus franjas horarias.
   */
  async guardar(profesionalId: string, slots: Omit<Disponibilidad, 'profesionalId'>[]): Promise<Disponibilidad[]> {
    await fakeDelay(400);
    // Eliminar disponibilidad previa
    _store = _store.filter((d) => d.profesionalId !== profesionalId);
    // Insertar los nuevos
    const nuevos: Disponibilidad[] = slots.map((s) => ({
      ...s,
      profesionalId,
    }));
    _store.push(...nuevos);
    return nuevos;
  },

  /** Elimina toda la disponibilidad de un profesional. */
  async eliminar(profesionalId: string): Promise<void> {
    await fakeDelay(150);
    _store = _store.filter((d) => d.profesionalId !== profesionalId);
  },

  /**
   * Dado un día de la semana, devuelve los horarios disponibles
   * en intervalos según la duración del servicio.
   */
  async horariosDisponibles(
    profesionalId: string,
    diaSemana: number,
    duracionMin: number,
  ): Promise<string[]> {
    await fakeDelay(150);
    const dia = _store.find(
      (d) => d.profesionalId === profesionalId && d.diaSemana === diaSemana,
    );
    if (!dia) return [];

    const slots: string[] = [];
    const [hiH, hiM] = dia.horaInicio.split(':').map(Number);
    const [hfH, hfM] = dia.horaFin.split(':').map(Number);
    const inicioMin = hiH * 60 + hiM;
    const finMin = hfH * 60 + hfM;

    for (let m = inicioMin; m + duracionMin <= finMin; m += duracionMin) {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    }
    return slots;
  },
};
