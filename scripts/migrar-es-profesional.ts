/**
 * Backfill del flag `esProfesional` en la colección `usuarios`.
 *
 * Contexto: el rol (`rol`) pasó a representar la VISTA activa del usuario
 * (cliente / profesional / proveedor), porque un profesional puede navegar la
 * app como cliente para reservar turnos con colegas. La condición "esta cuenta
 * es profesional" vive ahora en `esProfesional`, que es permanente.
 *
 * Este script marca esProfesional = true en todas las cuentas que hoy tienen
 * rol == 'profesional'. La app tiene fallback por rol, así que correrlo no es
 * urgente, pero deja las búsquedas y las reglas consistentes.
 *
 * Uso:
 *   GOOGLE_APPLICATION_CREDENTIALS=./scripts/serviceAccountKey.json \
 *     npx ts-node scripts/migrar-es-profesional.ts
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({ projectId: 'yopi-demo' });
}

const db = getFirestore();

async function main() {
  // Recorre todos los usuarios: además de los que hoy tienen rol
  // 'profesional', marca a los que quedaron con rol 'cliente' por haber
  // cambiado de vista pero tienen perfil profesional cargado (especialidad).
  const snap = await db.collection('usuarios').get();
  console.log(`Usuarios revisados: ${snap.size}`);

  let actualizadas = 0;
  let lote = db.batch();
  let enLote = 0;

  for (const docSnap of snap.docs) {
    if (docSnap.get('esProfesional') === true) continue;
    const esProfesional =
      docSnap.get('rol') === 'profesional' || !!docSnap.get('perfil.especialidad');
    if (!esProfesional) continue;
    lote.update(docSnap.ref, { esProfesional: true });
    actualizadas++;
    enLote++;
    // Firestore permite hasta 500 operaciones por batch
    if (enLote === 400) {
      await lote.commit();
      lote = db.batch();
      enLote = 0;
    }
  }

  if (enLote > 0) await lote.commit();
  console.log(`Listo. Marcadas con esProfesional=true: ${actualizadas}`);
}

main().catch((err) => {
  console.error('Error en la migración:', err);
  process.exit(1);
});
