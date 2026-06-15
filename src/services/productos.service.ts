import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { PRODUCTOS_MOCK } from '@/data/productos.mock';
import type { Producto } from '@/types/models';

const COLLECTION = 'productos';

/** Convierte un doc de Firestore en Producto. */
function toProducto(id: string, data: any): Producto {
  return {
    id,
    nombre: data.nombre,
    precio: data.precio,
    stock: data.stock,
    categoria: data.categoria,
    imagenUrl: data.imagenUrl,
    proveedorId: data.proveedorId,
    proveedorNombre: data.proveedorNombre,
    descripcion: data.descripcion,
    entregaEnvio: data.entregaEnvio,
    entregaRetiro: data.entregaRetiro,
  };
}

/** Quita las claves undefined (Firestore no las acepta). */
function limpiar<T extends Record<string, any>>(obj: T): T {
  const out = {} as T;
  for (const k in obj) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

export const productosService = {
  /** Lista productos de la tienda, opcionalmente filtrados por categoría y/o texto. */
  async listar(categoria?: string, texto?: string): Promise<Producto[]> {
    const q = categoria
      ? query(collection(db, COLLECTION), where('categoria', '==', categoria))
      : query(collection(db, COLLECTION));
    const snap = await getDocs(q);
    let res = snap.docs.map((d) => toProducto(d.id, d.data()));
    if (texto) {
      const t = texto.toLowerCase();
      res = res.filter((p) => p.nombre.toLowerCase().includes(t));
    }
    return res.sort((a, b) => a.nombre.localeCompare(b.nombre));
  },

  async obtenerPorId(id: string): Promise<Producto | null> {
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    return snap.exists() ? toProducto(snap.id, snap.data()) : null;
  },

  /** Productos de un proveedor (por su uid). */
  async listarDelProveedor(proveedorId: string): Promise<Producto[]> {
    if (!proveedorId) return [];
    const q = query(collection(db, COLLECTION), where('proveedorId', '==', proveedorId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => toProducto(d.id, d.data()))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  },

  async crear(input: Omit<Producto, 'id'>): Promise<Producto> {
    const data = limpiar(input);
    const ref = await addDoc(collection(db, COLLECTION), data);
    return { id: ref.id, ...input };
  },

  async actualizar(id: string, patch: Partial<Producto>): Promise<Producto> {
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, limpiar(patch));
    const snap = await getDoc(ref);
    return toProducto(snap.id, snap.data());
  },

  async eliminar(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  },

  /**
   * Propaga las opciones de entrega del proveedor a todos sus productos.
   * Se llama cuando el proveedor cambia los toggles de envío/retiro en su perfil.
   */
  async sincronizarEntrega(
    proveedorId: string,
    entrega: { entregaEnvio: boolean; entregaRetiro: boolean },
  ): Promise<void> {
    if (!proveedorId) return;
    const q = query(collection(db, COLLECTION), where('proveedorId', '==', proveedorId));
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.update(d.ref, entrega));
    await batch.commit();
  },

  /** Ajusta el stock de forma atómica (no baja de 0). */
  async ajustarStock(id: string, delta: number): Promise<Producto> {
    const ref = doc(db, COLLECTION, id);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Producto no encontrado');
      const actual = snap.data().stock ?? 0;
      tx.update(ref, { stock: Math.max(0, actual + delta) });
    });
    const snap = await getDoc(ref);
    return toProducto(snap.id, snap.data());
  },

  /**
   * Siembra la colección de productos con datos demo (solo si está vacía).
   * Útil para poblar la tienda en desarrollo/presentaciones.
   */
  async seed(): Promise<{ productos: number }> {
    const snap = await getDocs(collection(db, COLLECTION));
    if (!snap.empty) return { productos: snap.size };
    for (const p of PRODUCTOS_MOCK) {
      const { id, ...rest } = p;
      await addDoc(collection(db, COLLECTION), limpiar(rest));
    }
    return { productos: PRODUCTOS_MOCK.length };
  },
};
