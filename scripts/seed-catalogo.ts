/**
 * Script para seedear el catálogo de servicios en Firestore.
 *
 * Uso:
 *   npx ts-node scripts/seed-catalogo.ts
 *
 * Crea dos colecciones:
 *   - categorias → un doc por categoría con slug, nombre, emoji
 *   - catalogo_servicios → un doc por servicio con nombre, categoria, duracionEstimadaMin, genero
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─── Configuración ───
// Opción 1: usar service account (descargar JSON desde Firebase Console → Project settings → Service accounts)
// const serviceAccount = require('./serviceAccountKey.json');
// initializeApp({ credential: cert(serviceAccount) });

// Opción 2: usar variables de entorno (GOOGLE_APPLICATION_CREDENTIALS)
if (!getApps().length) {
  initializeApp({
    projectId: 'yopi-demo',
  });
}

const db = getFirestore();

// ─── Datos (copiados de catalogo.ts) ───

interface Categoria {
  slug: string;
  nombre: string;
  emoji: string;
}

interface ServicioCatalogo {
  id: string;
  nombre: string;
  categoria: string;
  duracionEstimadaMin: number;
  genero: string;
}

const CATEGORIAS: Categoria[] = [
  { slug: 'pestanas_cejas', nombre: 'Pestañas y cejas', emoji: '👁️' },
  { slug: 'unas', nombre: 'Uñas', emoji: '💅' },
  { slug: 'depilacion', nombre: 'Depilación', emoji: '✨' },
  { slug: 'facial', nombre: 'Facial', emoji: '🧖‍♀️' },
  { slug: 'corporal', nombre: 'Corporal', emoji: '💆‍♀️' },
  { slug: 'capilar', nombre: 'Capilar / Peluquería', emoji: '💇‍♀️' },
  { slug: 'maquillaje', nombre: 'Maquillaje', emoji: '💄' },
  { slug: 'barberia', nombre: 'Barbería', emoji: '💈' },
  { slug: 'estetica_masculina', nombre: 'Estética masculina', emoji: '🧔' },
  { slug: 'bienestar_spa', nombre: 'Bienestar y spa', emoji: '🧘‍♀️' },
  { slug: 'fitness_salud', nombre: 'Fitness y salud', emoji: '🏋️' },
  { slug: 'peluqueria_canina', nombre: 'Peluquería canina', emoji: '🐕' },
  { slug: 'bienestar_animal', nombre: 'Bienestar animal', emoji: '🐾' },
];

let _autoId = 1;
function svc(nombre: string, categoria: string, duracionEstimadaMin: number, genero = 'unisex'): ServicioCatalogo {
  return { id: `cat-${_autoId++}`, nombre, categoria, duracionEstimadaMin, genero };
}

const CATALOGO_SERVICIOS: ServicioCatalogo[] = [
  // Pestañas y cejas
  svc('Extensiones de pestañas clásicas', 'pestanas_cejas', 90, 'femenino'),
  svc('Volumen ruso', 'pestanas_cejas', 120, 'femenino'),
  svc('Volumen tecnológico', 'pestanas_cejas', 120, 'femenino'),
  svc('Lifting de pestañas', 'pestanas_cejas', 60, 'femenino'),
  svc('Laminado de cejas', 'pestanas_cejas', 45, 'femenino'),
  svc('Diseño y perfilado de cejas', 'pestanas_cejas', 30),
  svc('Henna para cejas', 'pestanas_cejas', 40, 'femenino'),
  svc('Micropigmentación / microblading', 'pestanas_cejas', 120),
  // Uñas
  svc('Manicuría tradicional', 'unas', 45),
  svc('Kapping gel', 'unas', 60, 'femenino'),
  svc('Soft gel', 'unas', 75, 'femenino'),
  svc('Esculpidas en gel', 'unas', 90, 'femenino'),
  svc('Esculpidas acrílicas', 'unas', 90, 'femenino'),
  svc('Nail art', 'unas', 60, 'femenino'),
  svc('Semipermanente', 'unas', 60),
  svc('Pedicuría estética', 'unas', 50),
  svc('Spa de manos y pies', 'unas', 60),
  svc('Parafinoterapia', 'unas', 40),
  // Depilación
  svc('Depilación láser', 'depilacion', 45),
  svc('Depilación definitiva', 'depilacion', 60),
  svc('Cera tradicional', 'depilacion', 30),
  svc('Cera española', 'depilacion', 30),
  svc('Depilación facial', 'depilacion', 20),
  svc('Perfilado íntimo', 'depilacion', 30, 'femenino'),
  // Facial
  svc('Limpieza facial profunda', 'facial', 60),
  svc('Hidratación facial', 'facial', 45),
  svc('Dermaplaning', 'facial', 40, 'femenino'),
  svc('Peeling químico', 'facial', 45),
  svc('Radiofrecuencia facial', 'facial', 40),
  svc('Punta de diamante', 'facial', 40),
  svc('Microneedling', 'facial', 50),
  svc('Tratamientos antiage', 'facial', 60),
  svc('Tratamiento para acné', 'facial', 50),
  svc('Máscaras faciales', 'facial', 30),
  svc('Oxigenoterapia', 'facial', 45),
  // Corporal
  svc('Masajes relajantes', 'corporal', 60),
  svc('Masajes descontracturantes', 'corporal', 60),
  svc('Drenaje linfático', 'corporal', 60),
  svc('Maderoterapia', 'corporal', 50),
  svc('Ultracavitación', 'corporal', 40),
  svc('Criolipólisis', 'corporal', 45),
  svc('Presoterapia', 'corporal', 40),
  svc('Radiofrecuencia corporal', 'corporal', 40),
  svc('Reducción de celulitis', 'corporal', 50),
  svc('Tratamientos reafirmantes', 'corporal', 50),
  svc('Exfoliación corporal', 'corporal', 45),
  svc('Spa corporal', 'corporal', 90),
  // Capilar
  svc('Corte femenino', 'capilar', 45, 'femenino'),
  svc('Brushing', 'capilar', 30, 'femenino'),
  svc('Alisado', 'capilar', 120, 'femenino'),
  svc('Botox capilar', 'capilar', 90),
  svc('Keratina', 'capilar', 120),
  svc('Balayage', 'capilar', 150, 'femenino'),
  svc('Coloración', 'capilar', 90),
  svc('Mechas', 'capilar', 120, 'femenino'),
  svc('Nutrición capilar', 'capilar', 45),
  svc('Peinados sociales', 'capilar', 60, 'femenino'),
  svc('Trenzas', 'capilar', 45, 'femenino'),
  svc('Extensiones de cabello', 'capilar', 180, 'femenino'),
  // Maquillaje
  svc('Maquillaje social', 'maquillaje', 60, 'femenino'),
  svc('Maquillaje artístico', 'maquillaje', 90),
  svc('Novias', 'maquillaje', 90, 'femenino'),
  svc('Quinceaños', 'maquillaje', 75, 'femenino'),
  svc('Producción integral', 'maquillaje', 120, 'femenino'),
  svc('Auto maquillaje', 'maquillaje', 90, 'femenino'),
  // Barbería
  svc('Corte clásico', 'barberia', 30, 'masculino'),
  svc('Fade', 'barberia', 40, 'masculino'),
  svc('Perfilado de barba', 'barberia', 20, 'masculino'),
  svc('Afeitado tradicional', 'barberia', 25, 'masculino'),
  svc('Arreglo de cejas', 'barberia', 15, 'masculino'),
  svc('Coloración de barba', 'barberia', 30, 'masculino'),
  svc('Tratamientos capilares masculinos', 'barberia', 45, 'masculino'),
  // Estética masculina
  svc('Depilación láser masculina', 'estetica_masculina', 50, 'masculino'),
  svc('Limpieza facial masculina', 'estetica_masculina', 50, 'masculino'),
  svc('Tratamientos antiage masculino', 'estetica_masculina', 60, 'masculino'),
  svc('Masajes deportivos', 'estetica_masculina', 60, 'masculino'),
  svc('Drenaje linfático masculino', 'estetica_masculina', 60, 'masculino'),
  svc('Pedicuría masculina', 'estetica_masculina', 40, 'masculino'),
  svc('Manicuría masculina', 'estetica_masculina', 35, 'masculino'),
  svc('Reducción abdominal', 'estetica_masculina', 50, 'masculino'),
  svc('Tratamientos corporales reafirmantes masculino', 'estetica_masculina', 50, 'masculino'),
  svc('Spa masculino', 'estetica_masculina', 90, 'masculino'),
  // Bienestar y spa
  svc('Nutrición estética', 'bienestar_spa', 60),
  svc('Coaching de bienestar', 'bienestar_spa', 60),
  svc('Rutinas de skincare', 'bienestar_spa', 45),
  svc('Evaluación corporal', 'bienestar_spa', 45),
  svc('Asesoría de imagen', 'bienestar_spa', 60),
  svc('Asesoría cosmética', 'bienestar_spa', 45),
  svc('Programas detox', 'bienestar_spa', 60),
  svc('Sauna', 'bienestar_spa', 30),
  svc('Aromaterapia', 'bienestar_spa', 60),
  svc('Hidroterapia', 'bienestar_spa', 45),
  svc('Reiki', 'bienestar_spa', 60),
  svc('Reflexología', 'bienestar_spa', 50),
  svc('Cromoterapia', 'bienestar_spa', 45),
  svc('Masoterapia', 'bienestar_spa', 60),
  // Fitness y salud
  svc('Entrenamiento funcional', 'fitness_salud', 60),
  svc('Yoga', 'fitness_salud', 60),
  svc('Pilates', 'fitness_salud', 60),
  svc('Stretching', 'fitness_salud', 45),
  svc('Reeducación postural', 'fitness_salud', 50),
  svc('Entrenamiento personalizado', 'fitness_salud', 60),
  svc('Electroestimulación', 'fitness_salud', 30),
  // Peluquería canina
  svc('Baño higiénico', 'peluqueria_canina', 60),
  svc('Corte de pelo canino', 'peluqueria_canina', 60),
  svc('Deslanado', 'peluqueria_canina', 45),
  svc('Corte por raza', 'peluqueria_canina', 75),
  svc('Corte sanitario', 'peluqueria_canina', 30),
  svc('Cepillado canino', 'peluqueria_canina', 30),
  svc('Limpieza de oídos', 'peluqueria_canina', 15),
  svc('Corte de uñas canino', 'peluqueria_canina', 15),
  svc('Hidratación de manto', 'peluqueria_canina', 30),
  svc('Perfumería canina', 'peluqueria_canina', 10),
  svc('Spa canino', 'peluqueria_canina', 90),
  svc('Baños medicados', 'peluqueria_canina', 45),
  svc('Tratamientos antipulgas', 'peluqueria_canina', 30),
  svc('Tratamientos dermatológicos caninos', 'peluqueria_canina', 40),
  svc('Tintura fantasía pet friendly', 'peluqueria_canina', 60),
  // Bienestar animal
  svc('Paseos', 'bienestar_animal', 60),
  svc('Guardería', 'bienestar_animal', 480),
  svc('Hotel canino', 'bienestar_animal', 1440),
  svc('Adiestramiento', 'bienestar_animal', 60),
  svc('Nutrición animal', 'bienestar_animal', 45),
];

// ─── Seed ───

async function seed() {
  console.log('Seeding categorías...');
  const batch1 = db.batch();
  for (const cat of CATEGORIAS) {
    const ref = db.collection('categorias').doc(cat.slug);
    batch1.set(ref, { nombre: cat.nombre, emoji: cat.emoji });
  }
  await batch1.commit();
  console.log(`  ✓ ${CATEGORIAS.length} categorías creadas`);

  // Firestore batch max = 500, nuestro catálogo tiene ~120 así que va en uno
  console.log('Seeding catálogo de servicios...');
  const batch2 = db.batch();
  for (const svc of CATALOGO_SERVICIOS) {
    const ref = db.collection('catalogo_servicios').doc(svc.id);
    batch2.set(ref, {
      nombre: svc.nombre,
      categoria: svc.categoria,
      duracionEstimadaMin: svc.duracionEstimadaMin,
      genero: svc.genero,
    });
  }
  await batch2.commit();
  console.log(`  ✓ ${CATALOGO_SERVICIOS.length} servicios creados`);

  console.log('\n¡Seed completado!');
  console.log('Colecciones creadas:');
  console.log('  - categorias (doc por slug)');
  console.log('  - catalogo_servicios (doc por id)');
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
