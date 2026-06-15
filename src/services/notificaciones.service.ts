import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { PreferenciasNotificaciones, RecordatorioTurnos, Turno } from '@/types/models';

/** Preferencias por defecto si el usuario nunca configuró nada. */
export const PREFERENCIAS_DEFAULT: PreferenciasNotificaciones = {
  pushEnabled: true,
  recordatorioTurnos: '24h',
};

/** Minutos de anticipación según la preferencia elegida. */
const OFFSET_MIN: Record<Exclude<RecordatorioTurnos, 'off'>, number> = {
  '30m': 30,
  '1h': 60,
  '2h': 120,
  '24h': 1440,
};

export const RECORDATORIO_LABELS: Record<RecordatorioTurnos, string> = {
  '30m': '30 min antes',
  '1h': '1h antes',
  '2h': '2h antes',
  '24h': '24h antes',
  off: 'Sin recordatorio',
};

// iOS permite hasta 64 notificaciones programadas; dejamos margen.
const MAX_PROGRAMADAS = 30;

const soportado = Platform.OS !== 'web';

if (soportado) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Convierte fecha (YYYY-MM-DD) y hora (HH:mm) del turno a Date local. */
function fechaHoraTurno(t: Turno): Date {
  return new Date(`${t.fecha}T${t.hora}:00`);
}

export const notificacionesService = {
  /** Pide permiso de notificaciones. Devuelve true si está concedido. */
  async pedirPermisos(): Promise<boolean> {
    if (!soportado) return false;
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('recordatorios', {
          name: 'Recordatorios de turnos',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      const actual = await Notifications.getPermissionsAsync();
      if (actual.granted) return true;
      const pedido = await Notifications.requestPermissionsAsync();
      return pedido.granted;
    } catch {
      return false;
    }
  },

  /**
   * Dispara una notificación local inmediata (p. ej. al entrar un pedido
   * nuevo mientras la app está abierta). Pide permisos si hace falta.
   */
  async notificarLocal(title: string, body: string, data?: Record<string, unknown>): Promise<void> {
    if (!soportado) return;
    try {
      const ok = await this.pedirPermisos();
      if (!ok) return;
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data: data ?? {} },
        trigger: null, // inmediata
      });
    } catch {
      // no bloqueamos la UI por errores de notificaciones
    }
  },

  /** Cancela todos los recordatorios programados. */
  async cancelarTodos(): Promise<void> {
    if (!soportado) return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // sin permisos o no disponible; nada que cancelar
    }
  },

  /**
   * Reprograma los recordatorios locales según los turnos del cliente
   * y sus preferencias. Cancela lo anterior y agenda lo nuevo.
   */
  async sincronizarRecordatorios(
    turnos: Turno[],
    preferencias?: PreferenciasNotificaciones,
  ): Promise<void> {
    if (!soportado) return;
    const prefs = preferencias ?? PREFERENCIAS_DEFAULT;

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      if (!prefs.pushEnabled || prefs.recordatorioTurnos === 'off') return;

      const ok = await this.pedirPermisos();
      if (!ok) return;

      const offsetMs = OFFSET_MIN[prefs.recordatorioTurnos] * 60 * 1000;
      const ahora = Date.now();

      const proximos = turnos
        .filter((t) => t.estado === 'confirmado' || t.estado === 'pendiente')
        .map((t) => ({ turno: t, disparo: fechaHoraTurno(t).getTime() - offsetMs }))
        .filter((x) => x.disparo > ahora)
        .sort((a, b) => a.disparo - b.disparo)
        .slice(0, MAX_PROGRAMADAS);

      for (const { turno, disparo } of proximos) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Recordatorio de turno',
            body: `${turno.servicioNombre} el ${turno.fecha} a las ${turno.hora} hs.`,
            data: { turnoId: turno.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(disparo),
            ...(Platform.OS === 'android' ? { channelId: 'recordatorios' } : {}),
          },
        });
      }
    } catch {
      // No bloqueamos la UI por errores de notificaciones
    }
  },
};
