/**
 * Seed del catálogo de servicios usando el SDK de Firebase cliente.
 * Se puede disparar desde un botón de dev/admin en la app.
 */
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { CATEGORIAS, CATALOGO_SERVICIOS } from '@/data/catalogo';

export async function seedCatalogo(): Promise<{ categorias: number; servicios: number }> {
  // Verificar si ya existen datos
  const catSnap = await getDocs(collection(db, 'categorias'));
  if (!catSnap.empty) {
    console.log('El catálogo ya existe en Firestore, salteando seed.');
    return { categorias: catSnap.size, servicios: 0 };
  }

  // Batch 1: categorías
  const batch1 = writeBatch(db);
  for (const cat of CATEGORIAS) {
    const ref = doc(db, 'categorias', cat.slug);
    batch1.set(ref, { nombre: cat.nombre, emoji: cat.emoji });
  }
  await batch1.commit();

  // Batch 2: servicios (max 500 por batch, tenemos ~120)
  const batch2 = writeBatch(db);
  for (const svc of CATALOGO_SERVICIOS) {
    const ref = doc(db, 'catalogo_servicios', svc.id);
    batch2.set(ref, {
      nombre: svc.nombre,
      categoria: svc.categoria,
      duracionEstimadaMin: svc.duracionEstimadaMin,
      genero: svc.genero ?? 'unisex',
    });
  }
  await batch2.commit();

  console.log(`Seed completado: ${CATEGORIAS.length} categorías, ${CATALOGO_SERVICIOS.length} servicios`);
  return { categorias: CATEGORIAS.length, servicios: CATALOGO_SERVICIOS.length };
}
