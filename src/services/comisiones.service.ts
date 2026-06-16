import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Linking } from 'react-native';
import { db } from './firebase';
import type { ComisionMensual, EstadoComision } from '@/types/models';

const COLLECTION = 'comisiones';

/**
 * Configuración de MercadoPago para generar el link de pago.
 * TODO: mover a variables de entorno / config remota.
 */
const MP_CONFIG = {
  /** Access token del dueño de la app (vendedor). Se usa server-side idealmente. */
  accessToken: 'APP_MP_ACCESS_TOKEN',
  /** URL base del checkout de MP (producción). */
  checkoutBaseUrl: 'https://api.mercadopago.com/checkout/preferences',
  /** URL a la que MP redirige tras el pago exitoso. */
  successUrl: 'beautyapp://comision/success',
  /** URL a la que MP redirige si falla o se cancela. */
  failureUrl: 'beautyapp://comision/failure',
};

export const comisionesService = {
  /**
   * Obtiene la comisión de un mes específico para un profesional.
   * Retorna null si no existe todavía (el mes no cerró o no hay turnos).
   */
  async obtener(
    profesionalId: string,
    mes: number,
    anio: number,
  ): Promise<ComisionMensual | null> {
    const q = query(
      collection(db, COLLECTION),
      where('profesionalId', '==', profesionalId),
      where('mes', '==', mes),
      where('anio', '==', anio),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as ComisionMensual;
  },

  /**
   * Lista todas las comisiones de un profesional, ordenadas por más reciente.
   */
  async listar(profesionalId: string): Promise<ComisionMensual[]> {
    const q = query(
      collection(db, COLLECTION),
      where('profesionalId', '==', profesionalId),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ComisionMensual))
      .sort((a, b) => (a.anio * 12 + a.mes > b.anio * 12 + b.mes ? -1 : 1));
  },

  /**
   * Crea o actualiza la comisión mensual con el monto calculado.
   * Se llama desde cierreCajaMensual o al completar un turno.
   */
  async generarOActualizar(
    profesionalId: string,
    mes: number,
    anio: number,
    montoTotal: number,
  ): Promise<ComisionMensual> {
    const existente = await this.obtener(profesionalId, mes, anio);

    if (existente) {
      // Actualizar monto si cambió (nuevo turno completado)
      if (existente.montoTotal !== montoTotal && existente.estado !== 'pagada') {
        const ref = doc(db, COLLECTION, existente.id);
        await updateDoc(ref, { montoTotal });
        return { ...existente, montoTotal };
      }
      return existente;
    }

    const nueva: Omit<ComisionMensual, 'id'> = {
      profesionalId,
      mes,
      anio,
      montoTotal,
      estado: 'pendiente',
      creadoEn: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, COLLECTION), nueva);
    return { ...nueva, id: ref.id };
  },

  /**
   * Genera una preferencia de pago en MercadoPago y retorna el link de checkout.
   * El profesional hace clic en "Pagar comisión" → se abre este link en MP.
   *
   * NOTA: En producción, esta llamada debería hacerse desde un backend seguro
   * para no exponer el access_token. Acá se deja como referencia de la lógica.
   */
  async generarLinkPago(comision: ComisionMensual): Promise<string> {
    const nombreMes = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ][comision.mes];

    const body = {
      items: [
        {
          title: `Comisión YOFI - ${nombreMes} ${comision.anio}`,
          description: `Comisión de servicios del mes de ${nombreMes} ${comision.anio}`,
          quantity: 1,
          unit_price: comision.montoTotal,
          currency_id: 'ARS',
        },
      ],
      external_reference: comision.id, // para identificar el pago en el webhook
      back_urls: {
        success: MP_CONFIG.successUrl,
        failure: MP_CONFIG.failureUrl,
        pending: MP_CONFIG.failureUrl,
      },
      auto_return: 'approved',
    };

    const res = await fetch(MP_CONFIG.checkoutBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_CONFIG.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    const initPoint: string = data.init_point;

    // Guardar el preferenceId en la comisión
    const ref = doc(db, COLLECTION, comision.id);
    await updateDoc(ref, { mercadoPagoPreferenceId: data.id });

    return initPoint;
  },

  /**
   * Abre el link de pago de MercadoPago en el navegador/app de MP.
   */
  async pagarComision(comision: ComisionMensual): Promise<void> {
    const link = await this.generarLinkPago(comision);
    await Linking.openURL(link);
  },

  /**
   * Marca una comisión como pagada. Se llama desde el webhook de MP
   * o manualmente tras verificar el pago.
   */
  async marcarPagada(
    comisionId: string,
    paymentId: string,
  ): Promise<void> {
    const ref = doc(db, COLLECTION, comisionId);
    const snap = await getDoc(ref);
    const profesionalId = (snap.data() as ComisionMensual)?.profesionalId;

    await updateDoc(ref, {
      estado: 'pagada' as EstadoComision,
      fechaPago: new Date().toISOString(),
      mercadoPagoPaymentId: paymentId,
    });

    // Si ya no tiene comisiones vencidas, reactivar la cuenta
    if (profesionalId) {
      await this.reactivarSiAlDia(profesionalId);
    }
  },

  /**
   * Marca como vencidas todas las comisiones pendientes de meses anteriores.
   * Retorna los IDs de profesionales con comisiones vencidas (para suspenderlos).
   */
  async verificarVencimientos(): Promise<string[]> {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    const q = query(
      collection(db, COLLECTION),
      where('estado', '==', 'pendiente'),
    );
    const snap = await getDocs(q);
    const profesionalesASuspender: string[] = [];

    for (const d of snap.docs) {
      const com = { id: d.id, ...d.data() } as ComisionMensual;
      // Si la comisión es de un mes anterior al actual → vencida
      const esMesAnterior =
        com.anio < anioActual || (com.anio === anioActual && com.mes < mesActual);

      if (esMesAnterior) {
        await updateDoc(doc(db, COLLECTION, com.id), { estado: 'vencida' });
        if (!profesionalesASuspender.includes(com.profesionalId)) {
          profesionalesASuspender.push(com.profesionalId);
        }
      }
    }

    // Suspender a los profesionales con comisiones vencidas
    const USERS = 'usuarios';
    for (const profId of profesionalesASuspender) {
      await updateDoc(doc(db, USERS, profId), { suspendida: true });
    }

    return profesionalesASuspender;
  },

  /**
   * Reactiva la cuenta de un profesional tras pagar todas sus comisiones vencidas.
   */
  async reactivarSiAlDia(profesionalId: string): Promise<boolean> {
    const tieneDeuda = await this.tieneComisionVencida(profesionalId);
    if (!tieneDeuda) {
      await updateDoc(doc(db, 'usuarios', profesionalId), { suspendida: false });
      return true;
    }
    return false;
  },

  /**
   * Verifica si un profesional tiene comisiones vencidas impagas.
   */
  async tieneComisionVencida(profesionalId: string): Promise<boolean> {
    const q = query(
      collection(db, COLLECTION),
      where('profesionalId', '==', profesionalId),
      where('estado', '==', 'vencida'),
    );
    const snap = await getDocs(q);
    return !snap.empty;
  },

  /**
   * Obtiene todas las comisiones vencidas de un profesional (para mostrar cuánto debe).
   */
  async obtenerVencidas(profesionalId: string): Promise<ComisionMensual[]> {
    const q = query(
      collection(db, COLLECTION),
      where('profesionalId', '==', profesionalId),