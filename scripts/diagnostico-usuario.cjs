/**
 * Diagnostico de cuentas: cruza Firebase Auth con los docs de `usuarios`.
 *
 * Uso:
 *   node scripts/diagnostico-usuario.cjs                 -> audita TODAS las cuentas
 *   node scripts/diagnostico-usuario.cjs <email> [...]   -> detalle de esos emails
 *
 * Necesita claves/yofi-prod-sa.json (service account, NO se commitea).
 * Usa el Admin SDK, asi que saltea las reglas de Firestore.
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const sa = require('../claves/yofi-prod-sa.json');
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const emails = process.argv.slice(2);

/**
 * La regla isValidatedCoherente() de firestore.rules exige que, si el doc
 * resultante tiene isValidated == true, el ID token traiga email_verified.
 * Como es el doc RESULTANTE (no solo los campos que cambian), una cuenta con
 * isValidated:true en Firestore pero emailVerified:false en Auth no puede
 * escribir NADA sobre su propio doc: todo update le da permission-denied.
 */
function diagnosticar(docValidated, authVerified) {
  if (docValidated === true && !authVerified) {
    return 'BLOQUEADA: doc isValidated:true pero Auth emailVerified:false. ' +
      'La regla isValidatedCoherente() le rechaza CUALQUIER escritura sobre su ' +
      'propio doc (permission-denied), y subscribe() la desloguea en silencio.';
  }
  if (docValidated === false && authVerified) {
    return 'Desincronizada: ya hizo clic en el link pero el doc sigue en false. ' +
      'Se arregla sola al abrir la app (o con "Ya valide mi email").';
  }
  if (docValidated === false && !authVerified) {
    return 'Pendiente: todavia no confirmo el mail. Queda en verificar-email.';
  }
  if (docValidated === undefined) {
    return 'Sin flag: cuenta previa a la validacion, derivarIsValidated() la ' +
      'considera validada. Entra normal.';
  }
  return 'OK';
}

async function detalle(email) {
  console.log('\n===', email, '===');
  let u;
  try {
    u = await getAuth().getUserByEmail(email);
  } catch (e) {
    console.log('  Auth: NO EXISTE (' + e.code + ')');
    return;
  }
  console.log('  Auth uid:', u.uid);
  console.log('  Auth emailVerified:', u.emailVerified);
  console.log('  Auth creado:', u.metadata.creationTime);
  console.log('  Auth proveedores:', u.providerData.map((p) => p.providerId).join(', ') || '(ninguno)');

  const snap = await db.collection('usuarios').doc(u.uid).get();
  if (!snap.exists) {
    console.log('  Firestore usuarios/' + u.uid + ': *** NO EXISTE ***');
    console.log('  -> el alta creo el usuario en Auth pero no escribio Firestore.');
    return;
  }
  const d = snap.data();
  console.log('  Firestore rol:', d.rol, '| isValidated:', d.isValidated, '| esProfesional:', d.esProfesional);
  console.log('  Firestore nombre:', d.nombre);
  console.log('  ->', diagnosticar(d.isValidated, u.emailVerified));
}

async function auditoria() {
  const snap = await db.collection('usuarios').get();
  console.log('\n=== auditoria de', snap.size, 'docs en usuarios ===');
  const conDoc = new Set();
  const problemas = [];

  for (const s of snap.docs) {
    const d = s.data();
    conDoc.add(s.id);
    let verified = null;
    try {
      verified = (await getAuth().getUser(s.id)).emailVerified;
    } catch {
      console.log(' -', d.email, '| SIN usuario en Auth (doc huerfano, uid ' + s.id + ')');
      problemas.push(d.email + ': doc sin cuenta en Auth');
      continue;
    }
    const msg = diagnosticar(d.isValidated, verified);
    console.log(
      ' -', String(d.email || '(sin email)').padEnd(32),
      '| rol:', String(d.rol).padEnd(12),
      '| doc:', String(d.isValidated).padEnd(9),
      '| auth:', String(verified).padEnd(5),
      '|', msg.split(':')[0],
    );
    if (!msg.startsWith('OK') && !msg.startsWith('Sin flag')) problemas.push(d.email + ': ' + msg);
  }

  // Cuentas en Auth que no tienen doc: no aparecen en el panel y no pueden
  // volver a registrarse (auth/email-already-in-use).
  let page = await getAuth().listUsers(1000);
  const huerfanos = page.users.filter((u) => !conDoc.has(u.uid));
  if (huerfanos.length) {
    console.log('\n=== en Auth pero SIN doc en usuarios ===');
    huerfanos.forEach((u) => console.log(' -', u.email, '| uid:', u.uid, '| emailVerified:', u.emailVerified));
  }

  if (problemas.length) {
    console.log('\n=== a revisar ===');
    problemas.forEach((p) => console.log(' *', p));
  } else {
    console.log('\nSin problemas detectados.');
  }
}

(async () => {
  console.log('proyecto:', sa.project_id);
  for (const email of emails) await detalle(email);
  await auditoria();
  process.exit(0);
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
