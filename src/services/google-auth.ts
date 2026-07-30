import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useSession } from '@/context/SessionContext';
import {
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_SCOPES,
  GOOGLE_WEB_CLIENT_ID,
  GoogleNativoNoDisponibleError,
  describirErrorGoogle,
  googleNativoDisponible,
  signInNativo,
} from './google-native';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_CLIENT_IDS = {
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
};

interface UseGoogleSignInOptions {
  onError?: (err: unknown) => void;
}

export interface GoogleSignInApi {
  /** true si el boton se puede presionar (el flujo esta inicializado). */
  ready: boolean;
  /**
   * false cuando el entorno no soporta Google (Expo Go, o build sin el modulo
   * nativo). El boton igual queda habilitado para poder mostrar el motivo.
   */
  disponible: boolean;
  loading: boolean;
  promptAsync: () => Promise<void>;
}

const esWeb = Platform.OS === 'web';

/** Entrega los tokens de Google a Firebase via SessionContext. */
function useEntrarConTokens() {
  const { loginWithGoogleIdToken, loginWithGoogleAccessToken } = useSession();
  return useCallback(
    async (idToken?: string, accessToken?: string) => {
      if (idToken) {
        await loginWithGoogleIdToken(idToken);
      } else if (accessToken) {
        await loginWithGoogleAccessToken(accessToken);
      } else {
        throw new Error('Google no devolvio token de autenticacion.');
      }
    },
    [loginWithGoogleIdToken, loginWithGoogleAccessToken],
  );
}

/**
 * Android / iOS: SDK nativo. No toca expo-auth-session, asi que no necesita
 * client IDs por plataforma ni redirect URIs.
 */
function useGoogleSignInNativo(options: UseGoogleSignInOptions): GoogleSignInApi {
  const entrarConTokens = useEntrarConTokens();
  const [loading, setLoading] = useState(false);
  // Se evalua una sola vez: el modulo nativo esta o no esta.
  const [disponible] = useState(() => googleNativoDisponible());

  const promptAsync = useCallback(async () => {
    if (loading) return;
    // El boton queda habilitado aunque falte el modulo nativo: asi el usuario
    // recibe un mensaje claro en vez de un boton que no hace nada.
    if (!disponible) {
      options.onError?.(new GoogleNativoNoDisponibleError());
      return;
    }
    setLoading(true);
    try {
      const { cancelado, idToken, accessToken } = await signInNativo();
      if (cancelado) return;
      await entrarConTokens(idToken, accessToken);
    } catch (err) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[google-auth]', describirErrorGoogle(err));
      }
      options.onError?.(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, disponible, entrarConTokens]);

  return { ready: true, disponible, loading, promptAsync };
}

/**
 * Web: expo-auth-session con el Web Client ID. Aca el redirect es https, que si
 * es valido para un OAuth client de tipo Web.
 */
function useGoogleSignInWeb(options: UseGoogleSignInOptions): GoogleSignInApi {
  const entrarConTokens = useEntrarConTokens();
  const [loading, setLoading] = useState(false);

  const [request, response, webPromptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: GOOGLE_SCOPES,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken =
        response.authentication?.idToken ?? (response.params as any)?.id_token;
      const accessToken =
        response.authentication?.accessToken ??
        (response.params as any)?.access_token;
      setLoading(true);
      entrarConTokens(idToken, accessToken)
        .catch((err) => options.onError?.(err))
        .finally(() => setLoading(false));
    } else if (response.type === 'error') {
      options.onError?.(response.error ?? new Error('Error de Google Sign-In'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const promptAsync = useCallback(async () => {
    await webPromptAsync();
  }, [webPromptAsync]);

  return { ready: !!request, disponible: true, loading, promptAsync };
}

/**
 * Login con Google, complementario al login con email/password.
 *
 * La eleccion se hace a nivel de modulo (Platform.OS no cambia en runtime), asi
 * el orden de hooks es estable y en nativo nunca se monta useAuthRequest.
 *
 * `ready` false = el flujo todavia no esta inicializado (solo pasa en web).
 * `disponible` false = el entorno no soporta Google (Expo Go): el boton sigue
 * habilitado y al tocarlo explica que hace falta una dev build. El login con
 * email funciona igual en todos los entornos.
 */
export const useGoogleSignIn: (
  options?: UseGoogleSignInOptions,
) => GoogleSignInApi = esWeb
  ? (options = {}) => useGoogleSignInWeb(options)
  : (options = {}) => useGoogleSignInNativo(options);
