import type { Turno } from '@/types/models';

const today = new Date();
const todayISO = today.toISOString().slice(0, 10);

const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const tomorrowISO = tomorrow.toISOString().slice(0, 10);

const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const yesterdayISO = yesterday.toISOString().slice(0, 10);

export const TURNOS_MOCK: Turno[] = [
  // HOY — para el profesional pro-1 (Carla)
  {
    id: 't-1',
    clienteId: 'u-cli-1',
    clienteNombre: 'Lucía B.',
    profesionalId: 'pro-1',
    servicioId: 's-1',
    servicioNombre: 'Diseño de cejas con henna',
    fecha: todayISO,
    hora: '10:00',
    duracionMin: 45,
    estado: 'confirmado',
    monto: 8500,
    metodoPago: 'efectivo',
  },
  {
    id: 't-2',
    clienteId: 'u-cli-2',
    clienteNombre: 'Martina G.',
    profesionalId: 'pro-1',
    servicioId: 's-2',
    servicioNombre: 'Esmaltado semipermanente',
    fecha: todayISO,
    hora: '11:30',
    duracionMin: 60,
    estado: 'confirmado',
    monto: 12000,
    metodoPago: 'mercado_pago',
  },
  {
    id: 't-3',
    clienteId: 'u-cli-3',
    clienteNombre: 'Romina S.',
    profesionalId: 'pro-1',
    servicioId: 's-3',
    servicioNombre: 'Lifting de pestañas',
    fecha: todayISO,
    hora: '15:00',
    duracionMin: 75,
    estado: 'pendiente',
    monto: 14000,
  },
  {
    id: 't-4',
    clienteId: 'u-cli-4',
    clienteNombre: 'Florencia M.',
    profesionalId: 'pro-1',
    servicioId: 's-2',
    servicioNombre: 'Esmaltado semipermanente',
    fecha: todayISO,
    hora: '17:00',
    duracionMin: 60,
    estado: 'confirmado',
    monto: 12000,
    metodoPago: 'transferencia',
  },
  // MAÑANA
  {
    id: 't-5',
    clienteId: 'u-cli-5',
    clienteNombre: 'Camila R.',
    profesionalId: 'pro-1',
    servicioId: 's-1',
    servicioNombre: 'Diseño de cejas con henna',
    fecha: tomorrowISO,
    hora: '09:30',
    duracionMin: 45,
    estado: 'confirmado',
    monto: 8500,
  },
  // AYER (completado)
  {
    id: 't-6',
    clienteId: 'u-cli-6',
    clienteNombre: 'Julieta P.',
    profesionalId: 'pro-1',
    servicioId: 's-3',
    servicioNombre: 'Lifting de pestañas',
    fecha: yesterdayISO,
    hora: '14:00',
    duracionMin: 75,
    estado: 'completado',
    monto: 14000,
    metodoPago: 'efectivo',
  },
];
