import * as WebBrowser from 'expo-web-browser';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { MP_CLIENT_ID_DEFAULT } from './config.service';

/**
 * Conexión de la cuenta de Mercado Pago del vendedor (OAuth marketplace).
 *
 * La app abre la pantalla de autorización de MP; el vendedor entra con SU
 * cuenta y autoriza. MP redirige a la Cloud Function `mpCallback`, que cambia
 * el código por el token y lo guarda. Al terminar, vuelve a la app por deep
 * link (?status=ok|error).
 *
 * El Client ID se administra desde el panel admin (config/plataforma).
 * El fallback vive en config.service (MP_CLIENT_ID_DEFAULT).
 */
const MP_REDIRECT_URI = 'https://southamerica-east1-yofi-db.cloudfunctions.net/mpCallback';
const MP_AUTH_URL = 'https://auth.mercadopago.com.ar/authorization';
const RETURN_URL = 'beautyapp://mp-conectado';

export type ResultadoConexionMP = 'ok' | 'error' | 'cancelado';

/** Lee el Client ID de MP desde config/plataforma, con fallback local. */
async function obtenerMpClientId(): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'config', 'plataforma'));
    const id = snap.data()?.mpClientId;
    if (typeof id === 'string' && id) return id;
  } catch {
    // sin conexión o sin permisos → usamos el fallback
  }
  return MP_CLIENT_ID_DEFAULT;
}

/** Abre el OAuth de Mercado Pago para que el usuario conecte su cuenta. */
export async function conectarMercadoPago(uid: string): Promise<ResultadoConexionMP> {
  if (!uid) return 'error';

  const clientId = await obtenerMpClientId();
  const authUrl =
    `${MP_AUTH_URL}?client_id=${clientId}` +
    `&response_type=code&platform_id=mp` +
    `&redirect_uri=${encodeURIComponent(MP_REDIRECT_URI)}` +
    `&state=${encodeURIComponent(uid)}`;

  try {
    const result = await WebBrowser.openAuthSessionAsync(authUrl, RETURN_URL);
    if (result.type === 'success' && result.url) {
      const m = /[?&]status=([^&]+)/.exec(result.url);
      return m && m[1] === 'ok' ? 'ok' : 'error';
    }
    return 'cancelado';
  } catch {
    return 'error';
  }
}
