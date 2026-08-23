/**
 * Copia colecciones de datos base entre dos proyectos de Firebase.
 *
 * Pensado para el pase de `yopi-demo` (pruebas) a `yofi-db` (producción):
 * copia catálogo, categorías y config, y deja afuera todo lo que sea dato
 * de usuario. Preserva los IDs de documento y recorre subcolecciones.
 *
 * ── Requisitos ────────────────────────────────────────────────────────────
 *   npm i firebase-admin        (o correrlo desde functions/, que ya lo tiene)
 *
 *   Dos service account keys, una por proyecto:
 *     Firebase Console → ⚙ Configuración del proyecto → Cuentas de servicio
 *     → Generar nueva clave privada
 *
 *   Guardalas FUERA del repo (o verificá que estén en .gitignore).
 *
 * ── Uso ───────────────────────────────────────────────────────────────────
 *   node scripts/copiar-datos-base.mjs --dry-run     ← siempre primero
 *   node scripts/copiar-datos-base.mjs
 *   node scripts/copiar-datos-base.mjs --force       ← pisa lo que ya exista
 */

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─── Configuración ────────────────────────────────────────────────────────

const ORIGEN = {
  keyPath: './claves/yopi-demo-sa.json',
  label: 'yopi-demo',
};

const DESTINO = {
  keyPath: './claves/yofi-prod-sa.json',
  label: 'yofi-db',
};

/**
 * Qué copiar. Comentá o descomentá según lo que quieras llevar.
 *
 * NO incluir acá: usuarios, turnos, pedidos, productos, fichas_cliente,
 * servicios_profesional, disponibilidad, mp_cuentas, comisiones,
 * valoraciones, mail. Todo eso son datos de prueba o de usuario y se
 * genera solo con el uso real.
 */
const COLECCIONES = [
  'categorias',
  'catalogo_servicios',
  'config',
  // 'rubros',        // en yopi-demo no existe (la app usa el fallback local).
  //                  // Mejor sembrarla directo en prod desde @/data/rubros.
  // 'competencias',  // solo si son premios reales y no pruebas.
  // 'banners',       // solo si son banners de verdad; si son demos, dejalos.
];

// ─── Flags ────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const LOTE = 400; // el límite duro de Firestore es 500 por batch

// ─── Inicialización ───────────────────────────────────────────────────────

function abrir({ keyPath, label }, nombreApp) {
  let credencial;
  try {
    credencial = JSON.parse(readFileSync(keyPath, 'utf8'));
  } catch (err) {
    console.error(`\n✗ No pude leer la clave de ${label} en "${keyPath}".`);
    console.error('  Descargala desde Console → Configuración → Cuentas de servicio.\n');
    process.exit(1);
  }
  const app = initializeApp({ credential: cert(credencial) }, nombreApp);
  return { db: getFirestore(app), projectId: credencial.project_id };
}

const origen = abrir(ORIGEN, 'origen');
const destino = abrir(DESTINO, 'destino');

if (origen.projectId === destino.projectId) {
  console.error('\n✗ Origen y destino son el mismo proyecto. Revisá las claves.\n');
  process.exit(1);
}

// ─── Copia ────────────────────────────────────────────────────────────────

let totalDocs = 0;
let totalSalteados = 0;

/** Copia una colección (o subcolección) y baja recursivamente. */
async function copiarColeccion(refOrigen, refDestino, sangria = '') {
  const snap = await refOrigen.get();

  if (snap.empty) {
    console.log(`${sangria}· ${refOrigen.path} — vacía, nada que copiar`);
    return;
  }

  // Chequeo de seguridad: no pisar datos que ya estén en destino.
  if (!FORCE && !DRY_RUN) {
    const existente = await refDestino.limit(1).get();
    if (!existente.empty) {
      console.log(
        `${sangria}⚠ ${refOrigen.path} — el destino YA tiene datos, salteando. ` +
          'Usá --force para pisarlos.',
      );
      totalSalteados += snap.size;
      return;
    }
  }

  console.log(`${sangria}→ ${refOrigen.path} — ${snap.size} doc(s)`);
  totalDocs += snap.size;

  if (!DRY_RUN) {
    for (let i = 0; i < snap.docs.length; i += LOTE) {
      const batch = destino.db.batch();
      for (const doc of snap.docs.slice(i, i + LOTE)) {
        batch.set(refDestino.doc(doc.id), doc.data());
      }
      await batch.commit();
    }
  }

  // Subcolecciones, un nivel por vez, recursivo.
  for (const doc of snap.docs) {
    const subs = await doc.ref.listCollections();
    for (const sub of subs) {
      await copiarColeccion(
        sub,
        refDestino.doc(doc.id).collection(sub.id),
        sangria + '  ',
      );
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

console.log('');
console.log(`  Origen  : ${origen.projectId}`);
console.log(`  Destino : ${destino.projectId}`);
console.log(`  Modo    : ${DRY_RUN ? 'DRY RUN (no escribe nada)' : FORCE ? 'ESCRITURA — PISA lo existente' : 'ESCRITURA'}`);
console.log('');

for (const nombre of COLECCIONES) {
  await copiarColeccion(
    origen.db.collection(nombre),
    destino.db.collection(nombre),
  );
}

console.log('');
if (DRY_RUN) {
  console.log(`  ${totalDocs} documento(s) se copiarían. Sacá --dry-run para hacerlo.`);
} else {
  console.log(`  ✓ ${totalDocs} documento(s) copiados.`);
}
if (totalSalteados > 0) {
  console.log(`  ⚠ ${totalSalteados} salteado(s) porque el destino ya tenía datos.`);
}
console.log('');
process.exit(0);
