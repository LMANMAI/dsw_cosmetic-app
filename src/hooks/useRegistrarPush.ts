import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';

/**
 * Registra el dispositivo para recibir notificaciones push y guarda el
 * Expo push token en usuarios/{uid}.pushTokens. La Cloud Function usa esos
 * tokens para enviar el push (funciona con la app abierta o cerrada).
 *
 * En simulador o en Expo Go (SDK nuevos) el push remoto puede no estar
 * disponible; en ese caso falla silenciosamente.
 */
export function useRegistrarPush(uid: string) {
  useEffect(() => {
    if (!uid || Platform.OS === 'web') return;

    (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('pedidos', {
            name: 'Pedidos',
            importance: Notifications.AndroidImportance.HIGH,
          });
        }

        const actual = await Notifications.getPermissionsAsync();
        let granted = actual.granted;
        if (!granted) {
          granted = (await Notifications.requestPermissionsAsync()).granted;
        }
        if (!granted) return;

        const projectId =
          (Constants.expoConfig?.extra as any)?.eas?.projectId ??
          (Constants as any)?.easConfig?.projectId;

        const resp = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        const token = resp.data;
        if (token) {
          await updateDoc(doc(db, 'usuarios', uid), { pushTokens: arrayUnion(token) });
        }
      } catch {
        // dispositivo sin push / sin permisos: no bloqueamos nada
      }
    })();
  }, [uid]);
}
