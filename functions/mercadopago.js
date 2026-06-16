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

// Client ID de PRODUCCIÓN de la aplicación (sirve para test y prod en OAuth).
const MP_CLIENT_ID = '7038717644366606';
const REGION = 'southamerica-east1';

// Comisión de la plataforma sobre cada pago (marketplace_fee). Ajustable.
const COMISION = 0.05; // 5%

// URLs de Mercado Pago.
const MP_OAUTH_TOKEN_URL = 'https://api.mercadopago.com/oauth/token';
const MP_PREF_URL = 'https://api.mercadopago.com/checkout/preferences';
const MP_PAYMENT_URL = 'https://api.mercadopago.com/v1/payments';

// Deep links de la app.
const APP_RETURN = 'beautyapp://mp-conectado';   // al conectar la cuenta
const APP_PAGO_RETURN = 'beautyapp://pedido-pago'; // al volver del checkout de pedido
const APP_SENA_RETURN = 'beautyapp://turno-pago';  // al volver del checkout de seña

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
      const tokenRes = await fetch(MP_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: MP_CLIENT_ID,
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

  const total = Number(pedido.total || 0);
  const fee = Math.round(total * COMISION * 100) / 100;
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
 * Webhook de Mercado Pago. Se invoca con ?pedido=<id> (insumos) o ?turno=<id>
 * (seña), seteado en la notification_url, más el id del pago. Verifica el pago
 * con el token del vendedor y, si está aprobado, confirma pedido o seña.
 */
exports.mpWebhook = onRequest({ region: REGION }, async (req, res) => {
  try {
    const pedidoId = req.query.pedido;
    const turnoId = req.query.turno;
    const topic = req.query.topic || req.query.type || (req.body && req.body.type);
    const paymentId =
      req.query['data.id'] || req.query.id || (req.body && req.body.data && req.body.data.id);

    if (!paymentId || (topic && topic !== 'payment') || (!pedidoId && !turnoId)) {
      res.sendStatus(200);
      return;
    }

    const db = getFirestore();

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
