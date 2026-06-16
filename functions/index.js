/**
 * Cloud Functions de YOFI — notificaciones push.
 *
 * Viven en el mismo repo y se despliegan al mismo proyecto de Firebase.
 * El push lo entrega el sistema operativo (APNs/FCM) vía Expo Push API, así
 * que llega con la app abierta o cerrada.
 *
 *  1. notificarPedidoProveedor   → al proveedor cuando entra un pedido pagado
 *  2. notificarTurnoProfesional  → al profesional cuando recibe un turno
 *  3. recordatoriosTurnosCliente → al cliente antes de su turno (programada)
 */
const { onDocumentWritten, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

// Mercado Pago (OAuth marketplace + split) — definidas en ./mercadopago.js
const mp = require('./mercadopago');
exports.mpCallback = mp.mpCallback;
exports.crearPreferenciaPedido = mp.crearPreferenciaPedido;
exports.mpWebhook = mp.mpWebhook;

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Envía uno o varios push a los tokens dados. Filtra tokens inválidos. */
async function enviarPush(tokens, { title, body, data, channelId }) {
  const validos = (Array.isArray(tokens) ? tokens : []).filter(
    (t) => typeof t === 'string' && t.startsWith('ExponentPushToken'),
  );
  if (validos.length === 0) return;

  const mensajes = validos.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    data: data || {},
    ...(channelId ? { channelId } : {}),
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(mensajes),
    });
    console.log('Push enviado', JSON.stringify(await res.json()));
  } catch (err) {
    console.error('Error enviando push', err);
  }
}

async function getUsuario(uid) {
  const snap = await db.doc(`usuarios/${uid}`).get();
  return snap.exists ? snap.data() : null;
}

/**
 * Encola un email escribiendo en la colección `mail`, que envía la extensión
 * oficial "Trigger Email from Firestore". Si la extensión todavía no está
 * instalada, el documento simplemente queda guardado sin enviarse.
 */
async function enviarEmail(to, subject, html) {
  if (!to) return;
  try {
    await db.collection('mail').add({ to: [to], message: { subject, html } });
  } catch (err) {
    console.error('Error encolando email', err);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * 1. Pedido pagado → push al proveedor
 * ──────────────────────────────────────────────────────────────────────── */
exports.notificarPedidoProveedor = onDocumentWritten('pedidos/{pedidoId}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!after) return;

  const reciénPagado = after.estado === 'pendiente' && (!before || before.estado !== 'pendiente');
  if (!reciénPagado || !after.proveedorId) return;

  const prov = await getUsuario(after.proveedorId);
  if (!prov) return;

  // Si el comprador eligió "retiro en local", le revelamos la dirección del
  // local recién ahora (al pagarse), copiándola al pedido.
  if (
    after.metodoEntrega === 'retiro' &&
    prov.perfil &&
    prov.perfil.direccion &&
    !after.direccionRetiro
  ) {
    await event.data.after.ref.update({ direccionRetiro: prov.perfil.direccion });
  }

  const total = Number(after.total || 0).toLocaleString('es-AR');
  const comprador = after.compradorNombre || 'Un profesional';

  // Push al proveedor (respeta el toggle "Notificaciones push").
  if (!prov.perfil || prov.perfil.notifPush !== false) {
    await enviarPush(prov.pushTokens, {
      title: 'Nuevo pedido',
      body: `${comprador} compró por $${total}.`,
      data: { tipo: 'pedido', pedidoId: event.params.pedidoId },
      channelId: 'pedidos',
    });
  }

  // Email al proveedor (respeta el toggle "Email por cada pedido").
  if (!prov.perfil || prov.perfil.emailPedidos !== false) {
    await enviarEmail(
      prov.email,
      'Nuevo pedido en YOFI',
      `<h2>Tenés un nuevo pedido 🎉</h2>
       <p><strong>${comprador}</strong> compró por <strong>$${total}</strong>.</p>
       <p>Entrá a la app para confirmarlo y gestionar el envío.</p>`,
    );
  }
});

/* ──────────────────────────────────────────────────────────────────────────
 * 2. Turno nuevo → push al profesional
 * ──────────────────────────────────────────────────────────────────────── */
exports.notificarTurnoProfesional = onDocumentCreated('turnos/{turnoId}', async (event) => {
  const turno = event.data?.data();
  if (!turno || !turno.profesionalId) return;

  const prof = await getUsuario(turno.profesionalId);
  if (!prof) return;
  if (prof.preferencias && prof.preferencias.pushEnabled === false) return;

  const cliente = turno.clienteNombre || 'Un cliente';
  const servicio = turno.servicioNombre || 'un servicio';

  await enviarPush(prof.pushTokens, {
    title: 'Nuevo turno',
    body: `${cliente} reservó ${servicio} el ${turno.fecha} a las ${turno.hora} hs.`,
    data: { tipo: 'turno', turnoId: event.params.turnoId },
    channelId: 'recordatorios',
  });

  // Email al profesional.
  await enviarEmail(
    prof.email,
    'Nuevo turno reservado',
    `<h2>Nuevo turno 📅</h2>
     <p><strong>${cliente}</strong> reservó <strong>${servicio}</strong>
     el ${turno.fecha} a las ${turno.hora} hs.</p>
     <p>Revisá tu agenda en la app.</p>`,
  );
});

/* ──────────────────────────────────────────────────────────────────────────
 * 3. Recordatorio de turno → push al cliente (corre cada 15 min)
 * ──────────────────────────────────────────────────────────────────────── */
const OFFSET_MIN = { '1h': 60, '2h': 120, '24h': 1440 };
const ESTADOS_ACTIVOS = ['pendiente', 'confirmado'];

exports.recordatoriosTurnosCliente = onSchedule(
  { schedule: 'every 15 minutes', timeZone: 'America/Argentina/Buenos_Aires' },
  async () => {
    const ahora = Date.now();
    // Traemos turnos de hoy en adelante (incluye ayer por seguridad de zona horaria).
    const desde = new Date(ahora - 24 * 3600 * 1000).toISOString().slice(0, 10);
    const snap = await db.collection('turnos').where('fecha', '>=', desde).get();

    const cacheUsuarios = new Map();

    for (const docu of snap.docs) {
      const t = docu.data();
      if (!ESTADOS_ACTIVOS.includes(t.estado)) continue;
      if (t.recordatorioEnviado) continue;

      const offsetKey = t.recordatorioCliente || '24h';
      if (offsetKey === 'off') continue;
      const offsetMin = OFFSET_MIN[offsetKey] ?? 1440;

      // Instante del turno en horario de Argentina (UTC-3).
      const turnoInstant = new Date(`${t.fecha}T${t.hora}:00-03:00`).getTime();
      if (Number.isNaN(turnoInstant)) continue;
      const recordatorioInstant = turnoInstant - offsetMin * 60 * 1000;

      // Solo si ya pasó el momento del recordatorio y el turno todavía no ocurrió.
      if (ahora < recordatorioInstant || ahora >= turnoInstant) continue;

      let cliente = cacheUsuarios.get(t.clienteId);
      if (cliente === undefined) {
        cliente = await getUsuario(t.clienteId);
        cacheUsuarios.set(t.clienteId, cliente);
      }
      if (!cliente) continue;
      if (cliente.preferencias && cliente.preferencias.pushEnabled === false) continue;

      await enviarPush(cliente.pushTokens, {
        title: 'Recordatorio de turno',
        body: `${t.servicioNombre || 'Tu turno'} el ${t.fecha} a las ${t.hora} hs.`,
        data: { tipo: 'recordatorio', turnoId: docu.id },
        channelId: 'recordatorios',
      });

      await docu.ref.update({ recordatorioEnviado: true });
    }
  },
);
