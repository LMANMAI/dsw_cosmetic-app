/**
 * Borra una cuenta de Firebase Authentication (y, opcionalmente, su doc de
 * `usuarios`). Sirve para liberar un email que quedo "tomado" en Auth sin
 * doc en Firestore -- el estado en el que queda una cuenta borrada desde el
 * panel admin, que solo borra el documento.
 *
 * Uso:
 *   node scripts/borrar-cuenta-auth.cjs <email>              -> simulacion
 *   node scripts/borrar-cuenta-auth.cjs <email> --confirmar  -> borra de verdad
 *
 * Por seguridad se niega a borrar una cuenta que TODAVIA tiene doc en
 * `usuarios` (es un usuario vivo). Para ese caso, --con-doc borra las dos cosas.
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const sa = require('../claves/yofi-prod-sa.json');
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const args = process.argv.slice(2);
const confirmar = args.includes('--confirmar');
const conDoc = args.includes('--con-doc');
const email = args.find((a) => !a.startsWith('--'));

if (!email) {
  console.error('Falta el email. Uso: node scripts/borrar-cuenta-auth.cjs <email> [--confirmar] [--con-doc]');
  process.exit(1);
}

(async () => {
  console.log('proyecto:', sa.project_id);

  let u;
  try {
    u = await getAuth().getUserByEmail(email);
  } catch (e) {
    console.log('No hay cuenta en Auth para', email, '(' + e.code + ')');
    console.log('El email esta libre: se puede registrar.');
    process.exit(0);
  }

  console.log('Auth uid:', u.uid, '| emailVerified:', u.emailVerified, '| creado:', u.metadata.creationTime);

  const ref = db.collection('usuarios').doc(u.uid);
  const snap = await ref.get();

  if (snap.exists && !conDoc) {
    const d = snap.data();
    console.log('\nEsta cuenta SI tiene doc en usuarios (rol:', d.rol + ', nombre:', d.nombre + ').');
    console.log('Es un usuario vivo, no un huerfano. No se borra nada.');
    console.log('Si igual queres borrarlo entero, agrega --con-doc.');
    process.exit(0);
  }

  console.log(snap.exists
    ? '\nTiene doc en usuarios y se pidio --con-doc: se borran los dos.'
    : '\nNo tiene doc en usuarios: es una cuenta huerfana en Auth.');

  if (!confirmar) {
    console.log('\n[SIMULACION] No se borro nada. Volve a correrlo con --confirmar.');
    process.exit(0);
  }

  if (snap.exists) {
    await ref.delete();
    console.log('Borrado usuarios/' + u.uid);
  }
  await getAuth().deleteUser(u.uid);
  console.log('Borrada la cuenta de Auth', u.uid);
  console.log('\nListo:', email, 'quedo libre para registrarse de nuevo.');
  process.exit(0);
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
