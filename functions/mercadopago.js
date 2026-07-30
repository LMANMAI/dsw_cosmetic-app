/**
 * Mercado Pago — Marketplace (split de pagos).
 *
 * Pieza 1: OAuth para que cada vendedor (proveedor/profesional) conecte su
 * cuenta de Mercado Pago. La URL de `mpCallback` es la que se configura como
 * "Redirect URL" en el panel de MP.
 *
 * El client_secret se guarda en Secret Manager (MP_CLIENT_SECRET), nunca en el
 * código. El client_id no es secreto.
 */
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { getFirestore } = require('firebase-admin/firestore');

const MP_CLIENT_SECRET = defineSecret('MP_CLIENT_SECRET');

// Access token de la cuenta de MP del DUEÑO de la plataforma. Se usa para
// cobrar las tarifas de servicio mensuales (el dinero entra a esa cuenta).
// Se setea con: firebase functions:secrets:set MP_ACCESS_TOKEN
const MP_ACCESS_TOKEN = defineSecret('MP_ACCESS_TOKEN');

// Fallbacks si config/plataforma todavía no tiene los campos.
// Los valores reales se administran desde el panel admin (página Comisiones).
const MP_CLIENT_ID_DEFAULT = '7038717644366606';
const REGION = 'southamerica-east1';

// Comisión por defecto de la plataforma sobre pedidos (marketplace_fee), en %.
const COMISION_PEDIDOS_DEFAULT = 5; // 5%

/**
 * Lee la config de MP desde config/plataforma (editable en el panel admin).
 * Devuelve clientId y comisión de pedidos (fracción 0-1) con fallbacks.
 */
async function getMpConfig() {
  const db = getFirestore();
  let data = {};
  try {
    const snap = await db.doc('config/plataforma').get();
    data = snap.exists ? snap.data() : {};
  } catch (e) {
    console.error('No se pudo leer config/plataforma, uso defaults:', e);
  }
  const clientId =
    typeof data.mpClientId === 'string' && data.mpClientId
      ? data.mpClientId
      : MP_CLIENT_ID_DEFAULT;
  const pct =
    typeof data.mpComisionPedidosPorcentaje === 'number'
      ? data.mpComisionPedidosPorcentaje
      : COMISION_PEDIDOS_DEFAULT;
  return { clientId, comisionPedidos: pct / 100 };
}

// URLs de Mercado Pago.
const MP_OAUTH_TOKEN_URL = 'https://api.mercadopago.com/oauth/token';
const MP_PREF_URL = 'https://api.mercadopago.com/checkout/preferences';
const MP_PAYMENT_URL = 'https://api.mercadopago.com/v1/payments';

// Deep links de la app.
const APP_RETURN = 'beautyapp://mp-conectado';   // al conectar la cuenta
const APP_PAGO_RETURN = 'beautyapp://pedido-pago'; // al volver del checkout de pedido
const APP_SENA_RETURN = 'beautyapp://turno-pago';  // al volver del checkout de seña
const APP_COMISION_RETURN = 'beautyapp://comision-pago'; // al volver del pago de tarifa

// URLs públicas de las funciones (misma región/proyecto).
const CALLBACK_URL = 'https://southamerica-east1-yopi-demo.cloudfunctions.net/mpCallback';
const WEBHOOK_URL = 'https://southamerica-east1-yopi-demo.cloudfunctions.net/mpWebhook';

const ESTADOS_ACTIVOS_PEDIDO = ['pendiente_pago'];

/**
 * Callback de OAuth. MP redirige acá con ?code=...&state=<uid>.
 * Cambiamos el code por el token del vendedor, lo guardamos en mp_cuentas/{uid}
 * y volvemos a la app por deep link (?status=ok|error).
 *
 * La URL pública de esta función es la "Redirect URL" que va en el panel de MP
 * y la misma que la app usa al construir la URL de autorización.
 */
exports.mpCallback = onRequest(
  { region: REGION, secrets: [MP_CLIENT_SECRET], cors: true },
  async (req, res) => {
    const code = req.query.code;
    const uid = req.query.state;

    if (!code || !uid) {
      res.status(400).send('Faltan parámetros (code/state).');
      return;
    }

    // El redirect_uri debe coincidir EXACTO con el registrado en MP y con el
    // que usó la app. Lo dejamos fijo (no reconstruido) para evitar que en 2da
    // gen aparezca el host interno de Cloud Run y no matchee.
    const redirectUri = CALLBACK_URL;

    try {
      const { clientId } = await getMpConfig();
      const tokenRes = await fetch(MP_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: MP_CLIENT_SECRET.value(),
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });
      const data = await tokenRes.json();

      if (!data.access_token) {
        console.error('MP OAuth error:', JSON.stringify(data));
        res.redirect(`${APP_RETURN}?status=error`);
        return;
      }

      const db = getFirestore();
      // Guardamos el token del vendedor (colección bloqueada en las reglas).
      await db.doc(`mp_cuentas/${uid}`).set({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        mpUserId: data.user_id || null,
        publicKey: data.public_key || null,
        expiresIn: data.expires_in || null,
        conectadoEn: new Date().toISOString(),
      });
      // Bandera pública para que la app muestre "conectada".
      await db.doc(`usuarios/${uid}`).set({ mpConectado: true }, { merge: true });

      res.redirect(`${APP_RETURN}?status=ok`);
    } catch (e) {
      console.error('mpCallback error:', e);
      res.redirect(`${APP_RETURN}?status=error`);
    }
  },
);

/**
 * Crea una preferencia de Checkout Pro para un pedido, con SPLIT:
 * el pago va a la cuenta del proveedor y la plataforma se queda el
 * marketplace_fee. Devuelve el init_point para abrir el checkout.
 */
exports.crearPreferenciaPedido = onCall({ region: REGION }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Necesitás iniciar sesión.');

  const pedidoId = request.data && request.data.pedidoId;
  if (!pedidoId) throw new HttpsError('invalid-argument', 'Falta pedidoId.');

  const db = getFirestore();
  const pedidoSnap = await db.doc(`pedidos/${pedidoId}`).get();
  if (!pedidoSnap.exists) throw new HttpsError('not-found', 'Pedido no encontrado.');
  const pedido = pedidoSnap.data();

  if (pedido.compradorId !== uid) {
    throw new HttpsError('permission-denied', 'Ese pedido no es tuyo.');
  }

  const cuentaSnap = await db.doc(`mp_cuentas/${pedido.proveedorId}`).get();
  const cuenta = cuentaSnap.exists ? cuentaSnap.data() : null;
  if (!cuenta || !cuenta.accessToken) {
    throw new HttpsError('failed-precondition', 'El proveedor todavía no conectó su cuenta de Mercado Pago.');
  }

  const { comisionPedidos } = await getMpConfig();
  const total = Number(pedido.total || 0);
  const fee = Math.round(total * comisionPedidos * 100) / 100;
  const items = (pedido.items || []).map((it) => ({
    title: it.productoNombre,
    quantity: it.cantidad,
    unit_price: it.precioUnitario,
    currency_id: 'ARS',
  }));

  const body = {
    items,
    marketplace_fee: fee,
    external_reference: pedidoId,
    back_urls: { success: APP_PAGO_RETURN, failure: APP_PAGO_RETURN, pending: APP_PAGO_RETURN },
    auto_return: 'approved',
    notification_url: `${WEBHOOK_URL}?pedido=${encodeURIComponent(pedidoId)}`,
  };

  const res = await fetch(MP_PREF_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cuenta.accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.init_point) {
    console.error('MP preferencia error:', JSON.stringify(data));
    throw new HttpsError('internal', 'No se pudo crear la preferencia de pago.');
  }
  return { initPoint: data.init_point, preferenceId: data.id };
});

/**
 * Crea una preferencia de Checkout Pro para la SEÑA de un turno.
 * La seña va 100% a la cuenta del profesional (sin marketplace_fee).
 * Devuelve el init_point para abrir el checkout.
 */
exports.crearPreferenciaSena = onCall({ region: REGION }, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Necesitás iniciar sesión.');

  const turnoId = request.data && request.data.turnoId;
  if (!turnoId) throw new HttpsError('invalid-argument', 'Falta turnoId.');

  const db = getFirestore();
  const turnoSnap = await db.doc(`turnos/${turnoId}`).get();
  if (!turnoSnap.exists) throw new HttpsError('not-found', 'Turno no encontrado.');
  const turno = turnoSnap.data();

  if (turno.clienteId !== uid) {
    throw new HttpsError('permission-denied', 'Ese turno no es tuyo.');
  }

  const monto = Number(turno.montoSena || 0);
  if (monto <= 0) throw new HttpsError('failed-precondition', 'Este turno no tiene seña.');

  const cuentaSnap = await db.doc(`mp_cuentas/${turno.profesionalId}`).get();
  const cuenta = cuentaSnap.exists ? cuentaSnap.data() : null;
  if (!cuenta || !cuenta.accessToken) {
    throw new HttpsError(
      'failed-precondition',
      'El profesional todavía no conectó su cuenta de Mercado Pago.',
    );
  }

  // Seña 100% al profesional → NO se envía marketplace_fee.
  const body = {
    items: [
      {
        title: `Seña — ${turno.servicioNombre || 'Turno'}`,
        quantity: 1,
        unit_price: monto,
        currency_id: 'ARS',
      },
    ],
    external_reference: turnoId,
    back_urls: { success: APP_SENA_RETURN, failure: APP_SENA_RETURN, pending: APP_SENA_RETURN },
    auto_return: 'approved',
    notification_url: `${WEBHOOK_URL}?turno=${encodeURIComponent(turnoId)}`,
  };

  const res = await fetch(MP_PREF_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cuenta.accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.init_point) {
    console.error('MP preferencia seña error:', JSON.stringify(data));
    throw new HttpsError('internal', 'No se pudo crear la preferencia de la seña.');
  }
  return { initPoint: data.init_point, preferenceId: data.id };
});

/**
 * Crea una preferencia de Checkout Pro para la TARIFA DE SERVICIO mensual.
 * A diferencia de señas y pedidos, acá cobra la PLATAFORMA: la preferencia
 * se crea con el access token del dueño (MP_ACCESS_TOKEN) y el dinero entra
 * a su cuenta. Devuelve el init_point para abrir el checkout.
 */
exports.crearPreferenciaComision = onCall(
  { region: REGION, secrets: [MP_ACCESS_TOKEN] },
  async (request) => {
    const uid = request.auth && request.auth.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Necesitás iniciar sesión.');

    const comisionId = request.data && request.data.comisionId;
    if (!comisionId) throw new HttpsError('invalid-argument', 'Falta comisionId.');

    const db = getFirestore();
    const snap = await db.doc(`comisiones/${comisionId}`).get();
    if (!snap.exists) throw new HttpsError('not-found', 'Tarifa de servicio no encontrada.');
    const comision = snap.data();

    if (comision.profesionalId !== uid) {
      throw new HttpsError('permission-denied', 'Esa tarifa de servicio no es tuya.');
    }
    if (comision.estado === 'pagada') {
      throw new HttpsError('failed-precondition', 'Esta tarifa de servicio ya está pagada.');
    }
    const monto = Number(comision.montoTotal || 0);
    if (monto <= 0) throw new HttpsError('failed-precondition', 'La tarifa no tiene monto.');

    const MESES = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const periodo = `${MESES[comision.mes] || ''} ${comision.anio || ''}`.trim();

    const body = {
      items: [
        {
          title: `Tarifa de servicio YOFI - ${periodo}`,
          description: `Tarifa de servicio del mes de ${periodo}`,
          quantity: 1,
          unit_price: monto,
          currency_id: 'ARS',
        },
      ],
      external_reference: comisionId,
      back_urls: {
        success: APP_COMISION_RETURN,
        failure: APP_COMISION_RETURN,
        pending: APP_COMISION_RETURN,
      },
      auto_return: 'approved',
      notification_url: `${WEBHOOK_URL}?comision=${encodeURIComponent(comisionId)}`,
    };

    const res = await fetch(MP_PREF_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_ACCESS_TOKEN.value()}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.init_point) {
      console.error('MP preferencia comisión error:', JSON.stringify(data));
      throw new HttpsError('internal', 'No se pudo crear la preferencia de pago.');
    }

    await snap.ref.update({ mercadoPagoPreferenceId: data.id });
    return { initPoint: data.init_point, preferenceId: data.id };
  },
);

/** Marca un pedido como pagado: descuenta stock (transacción) y pasa a 'pendiente'. */
async function marcarPedidoPagado(db, pedidoRef, pedido) {
  const { runTransaction } = require('firebase-admin/firestore');
  await runTransaction(db, async (tx) => {
    const fresh = await tx.get(pedidoRef);
    if (!fresh.exists || fresh.data().estado !== 'pendiente_pago') return;
    const items = pedido.items || [];
    const refs = items.map((it) => db.doc(`productos/${it.productoId}`));
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    snaps.forEach((snap, i) => {
      if (snap.exists) {
        const stock = snap.data().stock || 0;
        tx.update(refs[i], { stock: Math.max(0, stock - items[i].cantidad) });
      }
    });
    tx.update(pedidoRef, { estado: 'pendiente' });
  });
}

/**
 * Confirma la seña de un turno desde el webhook: verifica el pago con el token
 * del profesional y, si está aprobado, marca senaPagada + el estado final.
 */
async function confirmarSenaDesdeWebhook(db, turnoId, paymentId) {
  const turnoRef = db.doc(`turnos/${turnoId}`);
  const snap = await turnoRef.get();
  if (!snap.exists) return;
  const turno = snap.data();
  if (turno.estado !== 'pendiente_pago' || turno.senaPagada) return;

  const cuentaSnap = await db.doc(`mp_cuentas/${turno.profesionalId}`).get();
  const cuenta = cuentaSnap.exists ? cuentaSnap.data() : null;
  if (!cuenta || !cuenta.accessToken) return;

  const payRes = await fetch(`${MP_PAYMENT_URL}/${paymentId}`, {
    headers: { Authorization: `Bearer ${cuenta.accessToken}` },
  });
  const pago = await payRes.json();

  if (pago.status === 'approved') {
    const estado = turno.autoConfirmar ? 'confirmado' : 'pendiente';
    await turnoRef.update({ senaPagada: true, metodoPago: 'mercado_pago', estado });
    console.log(`Seña del turno ${turnoId} confirmada (payment ${paymentId}).`);
  }
}

/**
 * Confirma el pago de una tarifa de servicio desde el webhook: verifica el
 * pago con el token del DUEÑO (la plataforma es quien cobra) y, si está
 * aprobado, marca la tarifa como pagada y reactiva al profesional si quedó
 * al día.
 */
async function confirmarComisionDesdeWebhook(db, comisionId, paymentId) {
  const ref = db.doc(`comisiones/${comisionId}`);
  const snap = await ref.get();
  if (!snap.exists) return;
  const comision = snap.data();
  if (comision.estado === 'pagada') return;

  const payRes = await fetch(`${MP_PAYMENT_URL}/${paymentId}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN.value()}` },
  });
  const pago = await payRes.json();
  if (pago.status !== 'approved') return;

  await ref.update({
    estado: 'pagada',
    fechaPago: new Date().toISOString(),
    mercadoPagoPaymentId: String(paymentId),
  });
  console.log(`Tarifa de servicio ${comisionId} pagada (payment ${paymentId}).`);

  // Si el profesional ya no tiene tarifas vencidas, reactivar su cuenta.
  const profesionalId = comision.profesionalId;
  if (!profesionalId) return;
  const vencidas = await db
    .collection('comisiones')
    .where('profesionalId', '==', profesionalId)
    .where('estado', '==', 'vencida')
    .get();
  if (vencidas.empty) {
    await db.doc(`usuarios/${profesionalId}`).set({ suspendida: false }, { merge: true });
  }
}

/**
 * Webhook de Mercado Pago. Se invoca con ?pedido=<id> (insumos), ?turno=<id>
 * (seña) o ?comision=<id> (tarifa de servicio), seteado en la
 * notification_url, más el id del pago. Verifica el pago con el token que
 * corresponda y confirma pedido, seña o tarifa.
 */
exports.mpWebhook = onRequest(
  { region: REGION, secrets: [MP_ACCESS_TOKEN] },
  async (req, res) => {
  try {
    const pedidoId = req.query.pedido;
    const turnoId = req.query.turno;
    const comisionId = req.query.comision;
    const topic = req.query.topic || req.query.type || (req.body && req.body.type);
    const paymentId =
      req.query['data.id'] || req.query.id || (req.body && req.body.data && req.body.data.id);

    if (!paymentId || (topic && topic !== 'payment') || (!pedidoId && !turnoId && !comisionId)) {
      res.sendStatus(200);
      return;
    }

    const db = getFirestore();

    // Rama tarifa de servicio mensual.
    if (comisionId) {
      await confirmarComisionDesdeWebhook(db, comisionId, paymentId);
      res.sendStatus(200);
      return;
    }

    // Rama seña de turno.
    if (turnoId) {
      await confirmarSenaDesdeWebhook(db, turnoId, paymentId);
      res.sendStatus(200);
      return;
    }

    // Rama pedido de insumos.
    const pedidoRef = db.doc(`pedidos/${pedidoId}`);
    const pedidoSnap = await pedidoRef.get();
    if (!pedidoSnap.exists) {
      res.sendStatus(200);
      return;
    }
    const pedido = pedidoSnap.data();
    if (!ESTADOS_ACTIVOS_PEDIDO.includes(pedido.estado)) {
      res.sendStatus(200);
      return;
    }

    const cuentaSnap = await db.doc(`mp_cuentas/${pedido.proveedorId}`).get();
    const cuenta = cuentaSnap.exists ? cuentaSnap.data() : null;
    if (!cuenta || !cuenta.accessToken) {
      res.sendStatus(200);
      return;
    }

    const payRes = await fetch(`${MP_PAYMENT_URL}/${paymentId}`, {
      headers: { Authorization: `Bearer ${cuenta.accessToken}` },
    });
    const pago = await payRes.json();

    if (pago.status === 'approved') {
      await marcarPedidoPagado(db, pedidoRef, pedido);
      console.log(`Pedido ${pedidoId} marcado como pagado (payment ${paymentId}).`);
    }
    res.sendStatus(200);
  } catch (e) {
    console.error('mpWebhook error:', e);
    res.sendStatus(200); // siempre 200 para que MP no reintente en loop
  }
});
