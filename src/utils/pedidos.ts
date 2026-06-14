import type { EstadoPedido } from '@/types/models';

/** Clave de color del tema asociada a cada estado. */
export type EstadoTone = 'warning' | 'primary' | 'info' | 'success' | 'danger';

/** Etiqueta legible y tono de color para cada estado de pedido. */
export const ESTADO_PEDIDO: Record<EstadoPedido, { label: string; tone: EstadoTone }> = {
  pendiente_pago: { label: 'Esperando pago', tone: 'info' },
  pendiente: { label: 'Pendiente', tone: 'warning' },
  confirmado: { label: 'Confirmado', tone: 'primary' },
  enviado: { label: 'En camino', tone: 'info' },
  entregado: { label: 'Entregado', tone: 'success' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
};

/** Estados de pedidos ya pagados (los que el proveedor gestiona). */
export const ESTADOS_PAGADOS: EstadoPedido[] = [
  'pendiente',
  'confirmado',
  'enviado',
  'entregado',
];

/** Correos disponibles para el envío por privado. */
export const CORREOS: string[] = [
  'Correo Argentino',
  'Andreani',
  'OCA',
  'Vía Cargo',
  'Otro',
];

/** Estados que cuentan como "en curso" (requieren acción o seguimiento). */
export const ESTADOS_ABIERTOS: EstadoPedido[] = ['pendiente', 'confirmado', 'enviado'];

/** Próximo estado natural en el flujo del proveedor (o null si no avanza). */
export function siguienteEstado(estado: EstadoPedido): EstadoPedido | null {
  switch (estado) {
    case 'pendiente':
      return 'confirmado';
    case 'confirmado':
      return 'enviado';
    case 'enviado':
      return 'entregado';
    default:
      return null;
  }
}

/** Texto del botón para avanzar el pedido al siguiente estado. */
export function accionSiguiente(estado: EstadoPedido): string | null {
  switch (estado) {
    case 'pendiente':
      return 'Confirmar pedido';
    case 'confirmado':
      return 'Marcar como enviado';
    case 'enviado':
      return 'Marcar como entregado';
    default:
      return null;
  }
}
