import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';

/** Cloud Functions del proyecto (misma región que el backend). */
const functions = getFunctions(app, 'southamerica-east1');

/**
 * Pagos de pedidos con Mercado Pago.
 *
 * IMPORTANTE (seguridad): la app NUNCA maneja el access token de Mercado Pago.
 * Todas las preferencias se crean desde Cloud Functions, que leen el token
 * desde Secret Manager (MP_ACCESS_TOKEN) o el token OAuth del vendedor
 * guardado en `mp_cuentas/{uid}`. La app solo abre el `init_point` que le
 * devuelve la función y espera el deep link de retorno.
 */
/**
 * Flag para activar/desactivar el cobro con Mercado Pago.
 *
 * Mientras está en `false`, el checkout NO abre Mercado Pago: el pedido se
 * marca como pagado directamente para poder completar los flujos en pruebas.
 */
export const PAGOS_HABILITADOS = true;

/** URLs de retorno al cerrar el checkout (deep links de la app). */
const RETURN_URL = Linking.createURL('pedido-pago');
const SENA_RETURN_URL = Linking.createURL('turno-pago');

export type EstadoPago = 'approved' | 'pending' | 'rejected' | 'cancelado' | 'error';

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
  /**
   * SPLIT — crea la preferencia de un pedido vía Cloud Function (callable).
   * El pago va a la cuenta del proveedor y la plataforma retiene su comisión.
   */
  async crearPreferenciaPedidoSplit(
    pedidoId: string,
  ): Promise<{ initPoint: string; preferenceId: string }> {
    const fn = httpsCallable(functions, 'crearPreferenciaPedido');
    const res: any = await fn({ pedidoId });
    return { initPoint: res.data.initPoint, preferenceId: res.data.preferenceId };
  },

  /**
   * Crea la preferencia de la SEÑA de un turno vía Cloud Function (callable).
   * La seña va 100% a la cuenta del profesional (sin comisión).
   */
  async crearPreferenciaSena(
    turnoId: string,
  ): Promise<{ initPoint: string; preferenceId: string }> {
    const fn = httpsCallable(functions, 'crearPreferenciaSena');
    const res: any = await fn({ turnoId });
    return { initPoint: res.data.initPoint, preferenceId: res.data.preferenceId };
  },

  /** Abre el checkout de una seña y espera el retorno a la app. */
  async abrirCheckoutSena(initPoint: string): Promise<EstadoPago> {
    return pagosService.abrirCheckout(initPoint, SENA_RETURN_URL);
  },

  /**
   * Abre el checkout de Mercado Pago y espera el retorno a la app.
   * Devuelve el estado final del pago.
   */
  async abrirCheckout(initPoint: string, returnUrl: string = RETURN_URL): Promise<EstadoPago> {
    try {
      const result = await WebBrowser.openAuthSessionAsync(initPoint, returnUrl);
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
