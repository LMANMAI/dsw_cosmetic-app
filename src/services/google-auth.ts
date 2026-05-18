import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { useSession } from '@/context/SessionContext';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_CLIENT_IDS = {
  webClientId: '883387668629-qcc0h7q4ha6drnuoa5tbtjrjj7l1b8lo.apps.googleusercontent.com',
  iosClientId: 'REEMPLAZAR.apps.googleusercontent.com',
  // expo-auth-session usa flujo web con custom scheme, por eso se usa el Web Client ID
  androidClientId: '883387668629-qcc0h7q4ha6drnuoa5tbtjrjj7l1b8lo.apps.googleusercontent.com',
};

interface UseGoogleSignInOptions {
  onError?: (err: unknown) => void;
}

export function useGoogleSignIn(options: UseGoogleSignInOptions = {}) {
  const { loginWithGoogleIdToken, loginWithGoogleAccessToken } = useSession();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.webClientId,
    iosClientId: GOOGLE_CLIENT_IDS.iosClientId,
    androidClientId: GOOGLE_CLIENT_IDS.androidClientId,
    scopes: ['openid', 'profile', 'email'],
  });

  // Loguear el redirect URI exacto cuando el request este listo.
  useEffect(() => {
    if (request && __DEV__) {
      // eslint-disable-next-line no-console
      console.log(
        '[google-auth] Autoriza este redirect URI en Google Cloud Console:\n   ' +
          request.redirectUri,
      );
    }
  }, [request]);

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken =
        response.authentication?.idToken ?? (response.params as any)?.id_token;
      const accessToken =
        response.authentication?.accessToken ??
        (response.params as any)?.access_token;
      if (idToken) {
        loginWithGoogleIdToken(idToken).catch((err) => options.onError?.(err));
      } else if (accessToken) {
        // fallback: con solo access_token tambien podemos firmar con Firebase.
        loginWithGoogleAccessToken(accessToken).catch((err) =>
          options.onError?.(err),
        );
      } else {
        options.onError?.(new Error('Google no devolvio token de autenticacion.'));
      }
    } else if (response?.type === 'error') {
      options.onError?.(response.error ?? new Error('Error de Google Sign-In'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return {
    request,
    promptAsync,
  };
}
