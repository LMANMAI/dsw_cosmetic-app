import * as WebBrowser from 'expo-web-browser';

/**
 * Conexión de la cuenta de Mercado Pago del vendedor (OAuth marketplace).
 *
 * La app abre la pantalla de autorización de MP; el vendedor entra con SU
 * cuenta y autoriza. MP redirige a la Cloud Function `mpCallback`, que cambia
 * el código por el token y lo guarda. Al terminar, vuelve a la app por deep
 * link (?status=ok|error).
 */
const MP_CLIENT_ID = '7038717644366606';
const MP_REDIRECT_URI = 'https://southamerica-east1-yopi-demo.cloudfunctions.net/mpCallback';
const MP_AUTH_URL = 'https://auth.mercadopago.com.ar/authorization';
const RETURN_URL = 'beautyapp://mp-conectado';

export type ResultadoConexionMP = 'ok' | 'error' | 'cancelado';

/** Abre el OAuth de Mercado Pago para que el usuario conecte su cuenta. */
export async function conectarMercadoPago(uid: string): Promise<ResultadoConexionMP> {
  if (!uid) return 'error';

  const authUrl =
    `${MP_AUTH_URL}?client_id=${MP_CLIENT_ID}` +
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
