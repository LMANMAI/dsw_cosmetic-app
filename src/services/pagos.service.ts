import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { ItemPedido } from '@/types/models';

/**
 * Pagos de pedidos con Mercado Pago.
 *
 * IMPORTANTE: la preferencia se crea con el access token de la app. Igual que
 * en comisiones.service, en producción esto debería hacerse desde un backend
 * seguro (Cloud Function) para no exponer el token, y la confirmación del pago
 * debería llegar por webhook. Acá se sigue el patrón cliente del prototipo.
 *
 * Reemplazá MP_ACCESS_TOKEN por el access token de tu cuenta de Mercado Pago.
 */
/**
 * Flag para activar/desactivar el cobro con Mercado Pago.
 *
 * Mientras está en `false`, el checkout NO abre Mercado Pago: el pedido se
 * marca como pagado directamente para poder completar los flujos en pruebas.
 * Cuando la integración esté lista, ponelo en `true` (y cargá el access token).
 */
export const PAGOS_HABILITADOS = false;

const MP_ACCESS_TOKEN = 'APP_MP_ACCESS_TOKEN';
const MP_PREFERENCES_URL = 'https://api.mercadopago.com/checkout/preferences';

/** URL de retorno al cerrar el checkout (deep link de la app). */
const RETURN_URL = Linking.createURL('pedido-pago');

export type EstadoPago = 'approved' | 'pending' | 'rejected' | 'cancelado' | 'error';

export interface CrearPreferenciaInput {
  orderIds: string[];
  items: ItemPedido[];
  /** Email del comprador (opcional, mejora la experiencia de MP). */
  email?: string;
}

/** Extrae el estado del pago de la URL de retorno de Mercado Pago. */
function parseEstado(url: string): EstadoPago {
  const match = /[?&](?:collection_status|status)=([^&]+)/.exec(url);
  const raw = match ? decodeURIComponent(match[1]) : '';
  if (raw === 'approved') return 'approved';
  if (raw === 'pending' || raw === 'in_process') return 'pending';
  if (raw === 'rejected' || raw === 'failure') return 'rejected';
  return 'cancelado';
}

export const pagosService = {
  /** Crea una preferencia de pago en Mercado Pago y devuelve el link de checkout. */
  async crearPreferenciaPedido(
    input: CrearPreferenciaInput,
  ): Promise<{ initPoint: string; preferenceId: string }> {
    const body = {
      items: input.items.map((it) => ({
        title: it.productoNombre,
        quantity: it.cantidad,
        unit_price: it.precioUnitario,
        currency_id: 'ARS',
      })),
      payer: input.email ? { email: input.email } : undefined,
      external_reference: input.orderIds.join(','),
      back_urls: { success: RETURN_URL, failure: RETURN_URL, pending: RETURN_URL },
      auto_return: 'approved',
    };

    const res = await fetch(MP_PREFERENCES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detalle = await res.text();
      throw new Error(`No pudimos iniciar el pago (${res.status}): ${detalle}`);
    }

    const data = await res.json();
    return { initPoint: data.init_point as string, preferenceId: data.id as string };
  },

  /**
   * Abre el checkout de Mercado Pago y espera el retorno a la app.
   * Devuelve el estado final del pago.
   */
  async abrirCheckout(initPoint: string): Promise<EstadoPago> {
    try {
      const result = await WebBrowser.openAuthSessionAsync(initPoint, RETURN_URL);
      if (result.type === 'success' && result.url) {
        return parseEstado(result.url);
      }
      // El usuario cerró el navegador sin completar el pago.
      return 'cancelado';
    } catch {
      return 'error';
    }
  },
};
