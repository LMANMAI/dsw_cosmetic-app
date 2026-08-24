import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { COMISION_PLATAFORMA, TARIFA_CLIENTE } from '@/types/models';
import type { ComisionOrigen, PerfilProfesionalSignup, Usuario } from '@/types/models';

/* ── Mercado Pago ────────────────────────────────────────────────────
 * Datos NO secretos de la aplicación de MP de la plataforma. Se administran
 * desde el panel admin (config/plataforma); estos son solo el fallback.
 *
 * El access token y el client secret NUNCA viven en la app: están en Secret
 * Manager (MP_ACCESS_TOKEN / MP_CLIENT_SECRET) y solo los usan las Cloud
 * Functions.
 */
export const MP_CLIENT_ID_DEFAULT = '8659117657714110';
export const MP_PUBLIC_KEY_DEFAULT = 'APP_USR-c4656812-fec4-4c2e-9d36-e3549d7a81d4';

/**
 * Configuración remota de la plataforma (doc Firestore: config/plataforma).
 * Editable desde el panel admin (beautyapp-admin → Configuración).
 */
export const configService = {
  /** Public key de Mercado Pago (para Checkout Bricks / tokenización). */
  async mpPublicKey(): Promise<string> {
    try {
      const snap = await getDoc(doc(db, 'config', 'plataforma'));
      const pk = snap.data()?.mpPublicKey;
      if (typeof pk === 'string' && pk) return pk;
    } catch {
      // sin conexión o sin permiso → fallback
    }
    return MP_PUBLIC_KEY_DEFAULT;
  },

  /** Comisión global de la plataforma como fracción (0-1). */
  async comisionGlobal(): Promise<number> {
    try {
      const snap = await getDoc(doc(db, 'config', 'plataforma'));
      const pct = snap.data()?.comisionPorcentaje;
      if (typeof pct === 'number' && pct >= 0 && pct <= 100) return pct / 100;
    } catch {
      // sin conexión o sin permiso → fallback
    }
    return COMISION_PLATAFORMA;
  },

  /**
   * Comisión efectiva para un profesional como fracción (0-1):
   * 1. Si tiene exención vigente (premio de competencia) → 0.
   * 2. Si tiene porcentaje personalizado → ese valor.
   * 3. Si no → la comisión global.
   */
  async comisionPara(profesionalId: string): Promise<number> {
    return (await this.comisionDetallePara(profesionalId)).fraccion;
  },

  /**
   * Igual que comisionPara pero devuelve el detalle para poder snapshot-earlo
   * en el turno al completarlo:
   *  - fraccion:   comisión como fracción (0-1), lista para multiplicar el monto.
   *  - porcentaje: el mismo valor como porcentaje (0-100), para persistir el %.
   *  - exento:     true si la comisión es 0 por exención vigente (premio).
   *  - origen:     qué regla se aplicó: 'exencion' | 'personalizada' | 'global'.
   */
  async comisionDetallePara(
    profesionalId: string,
  ): Promise<{
    fraccion: number;
    porcentaje: number;
    exento: boolean;
    origen: ComisionOrigen;
  }> {
    try {
      const snap = await getDoc(doc(db, 'usuarios', profesionalId));
      const perfil = (snap.data() as Usuario | undefined)?.perfil as
        | PerfilProfesionalSignup
        | undefined;

      const hoy = new Date().toISOString().slice(0, 10);
      if (perfil?.comisionExentaHasta && perfil.comisionExentaHasta >= hoy) {
        return { fraccion: 0, porcentaje: 0, exento: true, origen: 'exencion' };
      }
      const pct = perfil?.comisionPorcentaje;
      if (typeof pct === 'number' && pct >= 0 && pct <= 100) {
        return {
          fraccion: pct / 100,
          porcentaje: pct,
          exento: false,
          origen: 'personalizada',
        };
      }
    } catch {
      // fallback a la global
    }
    const fraccion = await this.comisionGlobal();
    return {
      fraccion,
      porcentaje: Math.round(fraccion * 100),
      exento: false,
      origen: 'global',
    };
  },

  /* ── Tarifa de uso de la app (la paga el CLIENTE) ─────────────────── */

  /** Tarifa global que paga el cliente, como fracción (0-1). */
  async tarifaClienteGlobal(): Promise<number> {
    try {
      const snap = await getDoc(doc(db, 'config', 'plataforma'));
      const pct = snap.data()?.tarifaClientePorcentaje;
      if (typeof pct === 'number' && pct >= 0 && pct <= 100) return pct / 100;
    } catch {
      // sin conexión o sin permiso → fallback
    }
    return TARIFA_CLIENTE;
  },

  /**
   * Tarifa efectiva para un cliente, con el mismo orden de prioridad que la
   * comisión del profesional:
   * 1. Exención vigente → 0.
   * 2. Porcentaje personalizado del cliente.
   * 3. Porcentaje global.
   */
  async tarifaClienteDetallePara(clienteId: string): Promise<{
    fraccion: number;
    porcentaje: number;
    exento: boolean;
    origen: ComisionOrigen;
  }> {
    try {
      const snap = await getDoc(doc(db, 'usuarios', clienteId));
      // El override se guarda en `perfil`, sea cual sea el tipo de perfil:
      // una misma cuenta puede ser profesional y reservar como cliente.
      const perfil = (snap.data() as Usuario | undefined)?.perfil as
        | { tarifaClientePorcentaje?: number; tarifaClienteExentaHasta?: string }
        | undefined;

      const hoy = new Date().toISOString().slice(0, 10);
      if (perfil?.tarifaClienteExentaHasta && perfil.tarifaClienteExentaHasta >= hoy) {
        return { fraccion: 0, porcentaje: 0, exento: true, origen: 'exencion' };
      }
      const pct = perfil?.tarifaClientePorcentaje;
      if (typeof pct === 'number' && pct >= 0 && pct <= 100) {
        return {
          fraccion: pct / 100,
          porcentaje: pct,
          exento: false,
          origen: 'personalizada',
        };
      }
    } catch {
      // fallback a la global
    }
    const fraccion = await this.tarifaClienteGlobal();
    return {
      fraccion,
      porcentaje: Math.round(fraccion * 10000) / 100,
      exento: false,
      origen: 'global',
    };
  },
};

/** Calcula el monto de tarifa de uso sobre un precio, redondeado a peso. */
export function calcularTarifaCliente(precio: number, fraccion: number): number {
  return Math.round(precio * fraccion);
}
