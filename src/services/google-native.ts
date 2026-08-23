/**
 * Wrapper del SDK nativo de Google Sign-In (@react-native-google-signin/google-signin).
 *
 * Por que nativo y no expo-auth-session:
 *   expo-auth-session abre el navegador y usa un redirect con custom scheme
 *   (com.beautyapp.mobile:/oauthredirect). Google rechaza esos redirects cuando
 *   el OAuth client es de tipo "Web" -> "Custom scheme URIs are not allowed for
 *   'WEB' client type" (Error 400: invalid_request).
 *
 * El SDK nativo no usa redirect URIs: Google valida la app por package name +
 * huella SHA-1. Ver docs/GOOGLE-SIGNIN.md para el setup en Google Cloud.
 *
 * Este archivo NO importa React ni el SessionContext a proposito, para poder
 * usarse desde el hook y desde el logout sin ciclos de imports.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * En Expo Go el binario nativo no incluye RNGoogleSignin. Ni siquiera alcanza
 * con envolver el require en try/catch: Metro reporta el error al LogBox antes
 * de re-lanzarlo, y aparece la pantalla roja igual. Por eso ni lo intentamos.
 */
const enExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Los client IDs viven en app.json (`extra.google`) y app.config.js los puede
 * sobreescribir con env vars. Una sola fuente de verdad: el config plugin de iOS
 * deriva el `iosUrlScheme` del mismo valor, asi no se desincronizan.
 */
const extraGoogle = (Constants.expoConfig?.extra?.google ?? {}) as {
  webClientId?: string | null;
  iosClientId?: string | null;
};

/** Web Client ID: es el que define el `aud` del id_token que consume Firebase. */
export const GOOGLE_WEB_CLIENT_ID =
  extraGoogle.webClientId ??
  '410806601848-m0fo806e5p0hqbvcu6lc776ih0hlu8o5.apps.googleusercontent.com';

/**
 * iOS Client ID (OAuth client tipo iOS, bundle com.beautyapp.mobile).
 * Se setea en app.json > extra.google.iosClientId o con GOOGLE_IOS_CLIENT_ID.
 * Mientras sea null, el login en iOS no funciona.
 */
export const GOOGLE_IOS_CLIENT_ID: string | null = extraGoogle.iosClientId ?? null;

export const GOOGLE_SCOPES = ['openid', 'profile', 'email'];

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

let mod: GoogleSigninModule | null = null;
let configurado = false;

/**
 * Carga perezosa: el modulo nativo no existe en web ni en Expo Go, y un import
 * estatico romperia el bundle en esos entornos.
 */
function getModule(): GoogleSigninModule | null {
  if (Platform.OS === 'web' || enExpoGo) return null;
  if (mod) return mod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    mod = null;
  }
  return mod;
}

/** true si podemos usar el SDK nativo (build con dev-client o standalone). */
export function googleNativoDisponible(): boolean {
  const m = getModule();
  return !!m?.GoogleSignin;
}

export class GoogleIosClientIdFaltanteError extends Error {
  constructor() {
    super(
      'Falta el iOS Client ID. Crealo en Google Cloud (tipo iOS, bundle ' +
        'com.beautyapp.mobile) y ponelo en app.json > extra.google.iosClientId. ' +
        'Despues hay que volver a compilar: el URL scheme se agrega en el prebuild.',
    );
    this.name = 'GoogleIosClientIdFaltanteError';
  }
}

function configurar(m: GoogleSigninModule) {
  if (configurado) return;
  // En iOS el SDK necesita el client de iOS + su URL scheme en el Info.plist.
  // Sin esto el signIn falla con un error opaco del SDK.
  if (Platform.OS === 'ios' && !GOOGLE_IOS_CLIENT_ID) {
    throw new GoogleIosClientIdFaltanteError();
  }
  m.GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
    scopes: GOOGLE_SCOPES,
    offlineAccess: false,
  });
  configurado = true;
}

export interface GoogleNativeResult {
  cancelado: boolean;
  idToken?: string;
  accessToken?: string;
}

/** true si estamos corriendo dentro de Expo Go (ahi Google queda deshabilitado). */
export function esExpoGo(): boolean {
  return enExpoGo;
}

export class GoogleNativoNoDisponibleError extends Error {
  constructor() {
    super(
      enExpoGo
        ? 'Estas en Expo Go, donde Google Sign-In no puede funcionar: el binario ' +
          'de Expo Go no incluye el modulo nativo y Google rechaza los redirects ' +
          'exp://. Para probarlo corre `npm run dev:android` (o ' +
          '`npm run build:dev`) una sola vez y despues `npm run start:dev`. ' +
          'El login con email si funciona en Expo Go.'
        : 'El modulo nativo de Google Sign-In no esta en esta build. ' +
          'Volve a compilar la app despues de instalar la dependencia ' +
          '(`npx expo run:android` o `eas build --profile development`).',
    );
    this.name = 'GoogleNativoNoDisponibleError';
  }
}

/**
 * Abre el selector de cuentas nativo y devuelve los tokens.
 * Nunca lanza por cancelacion del usuario: devuelve `{ cancelado: true }`.
 */
export async function signInNativo(): Promise<GoogleNativeResult> {
  const m = getModule();
  if (!m?.GoogleSignin) throw new GoogleNativoNoDisponibleError();
  configurar(m);

  if (Platform.OS === 'android') {
    await m.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  try {
    const res: any = await m.GoogleSignin.signIn();

    // v13+ devuelve { type: 'success' | 'cancelled', data }; versiones viejas
    // devuelven el user directo y lanzan en cancelacion.
    if (res?.type === 'cancelled') return { cancelado: true };

    const data = res?.data ?? res;
    let idToken: string | undefined = data?.idToken ?? undefined;
    let accessToken: string | undefined;

    if (!idToken) {
      const tokens = await m.GoogleSignin.getTokens();
      idToken = tokens?.idToken ?? undefined;
      accessToken = tokens?.accessToken ?? undefined;
    }

    return { cancelado: false, idToken, accessToken };
  } catch (err: any) {
    if (err?.code === m.statusCodes.SIGN_IN_CANCELLED) return { cancelado: true };
    throw err;
  }
}

/**
 * Cierra la sesion de Google en el dispositivo. Sin esto, el proximo login
 * reusa la cuenta anterior sin mostrar el selector.
 */
export async function signOutNativo(): Promise<void> {
  const m = getModule();
  if (!m?.GoogleSignin) return;
  try {
    configurar(m);
    await m.GoogleSignin.signOut();
  } catch {
    // no bloqueamos el logout de la app si falla
  }
}

/**
 * Traduce los codigos de error del SDK a mensajes accionables.
 * DEVELOPER_ERROR (codigo 10) es casi siempre SHA-1 o package name mal
 * configurados en Google Cloud.
 */
export function describirErrorGoogle(err: any): string {
  const m = getModule();
  const codes = m?.statusCodes;
  if (codes && err?.code === codes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'Google Play Services no esta disponible o esta desactualizado.';
  }
  if (err?.code === 'DEVELOPER_ERROR' || err?.code === '10' || err?.code === 10) {
    return (
      'DEVELOPER_ERROR: la huella SHA-1 de esta build o el package name no ' +
      'coinciden con el OAuth client de Android en Google Cloud.'
    );
  }
  if (codes && err?.code === codes.IN_PROGRESS) {
    return 'Ya hay un inicio de sesion en curso.';
  }
  return err?.message ?? 'Error desconocido de Google Sign-In.';
}
