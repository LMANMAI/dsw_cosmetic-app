import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { EstadoPedido, InfoEnvio, ItemPedido, Pedido, UserRole } from '@/types/models';

const PEDIDOS = 'pedidos';
const PRODUCTOS = 'productos';

/** Ítem del carrito con la info de proveedor necesaria para agrupar el pedido. */
export interface ItemCarrito extends ItemPedido {
  proveedorId: string;
  proveedorNombre?: string;
}

export interface CrearPedidoInput {
  comprador: { id: string; nombre?: string; rol?: UserRole };
  items: ItemCarrito[];
  direccionEnvio?: string;
}

function toPedido(id: string, data: any): Pedido {
  return {
    id,
    compradorId: data.compradorId,
    compradorNombre: data.compradorNombre,
    compradorRol: data.compradorRol,
    proveedorId: data.proveedorId,
    proveedorNombre: data.proveedorNombre,
    fecha: data.fecha,
    estado: data.estado,
    items: data.items ?? [],
    total: data.total,
    direccionEnvio: data.direccionEnvio,
    envio: data.envio,
  };
}

function limpiar<T extends Record<string, any>>(obj: T): T {
  const out = {} as T;
  for (const k in obj) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

export const pedidosService = {
  /**
   * Crea uno o más pedidos a partir del carrito, agrupando por proveedor.
   * Los pedidos quedan en estado 'pendiente_pago' y NO descuentan stock:
   * el stock se descuenta recién cuando el pago se confirma (marcarPagados).
   */
  async crearDesdeCarrito(input: CrearPedidoInput): Promise<Pedido[]> {
    const porProveedor = new Map<string, ItemCarrito[]>();
    for (const it of input.items) {
      const arr = porProveedor.get(it.proveedorId) ?? [];
      arr.push(it);
      porProveedor.set(it.proveedorId, arr);
    }

    const creados: Pedido[] = [];

    for (const [proveedorId, items] of porProveedor) {
      const proveedorNombre = items[0]?.proveedorNombre;
      const total = items.reduce((acc, it) => acc + it.precioUnitario * it.cantidad, 0);
      const pedidoItems: ItemPedido[] = items.map((it) => ({
        productoId: it.productoId,
        productoNombre: it.productoNombre,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
      }));

      const pedidoRef = doc(collection(db, PEDIDOS));
      const data = {
        compradorId: input.comprador.id,
        compradorNombre: input.comprador.nombre,
        compradorRol: input.comprador.rol,
        proveedorId,
        proveedorNombre,
        fecha: new Date().toISOString(),
        estado: 'pendiente_pago' as EstadoPedido,
        items: pedidoItems,
        total,
        direccionEnvio: input.direccionEnvio,
      };
      await setDoc(pedidoRef, limpiar(data));
      creados.push(toPedido(pedidoRef.id, data));
    }

    return creados;
  },

  /**
   * Confirma el pago de uno o más pedidos: descuenta el stock de cada producto
   * (transacción) y pasa el pedido a 'pendiente' (a la espera del proveedor).
   * Idempotente: si el pedido ya no está en 'pendiente_pago', no hace nada.
   */
  async marcarPagados(orderIds: string[]): Promise<void> {
    for (const id of orderIds) {
      const pedidoRef = doc(db, PEDIDOS, id);
      await runTransaction(db, async (tx) => {
        const pedidoSnap = await tx.get(pedidoRef);
        if (!pedidoSnap.exists()) return;
        const data = pedidoSnap.data();
        if (data.estado !== 'pendiente_pago') return;

        const items = (data.items ?? []) as ItemPedido[];
        const refs = items.map((it) => doc(db, PRODUCTOS, it.productoId));
        const snaps = await Promise.all(refs.map((r) => tx.get(r)));
        snaps.forEach((snap, i) => {
          if (snap.exists()) {
            const stock = snap.data().stock ?? 0;
            tx.update(refs[i], { stock: Math.max(0, stock - items[i].cantidad) });
          }
        });
        tx.update(pedidoRef, { estado: 'pendiente' as EstadoPedido });
      });
    }
  },

  /** Cancela pedidos cuyo pago no se completó (siguen en 'pendiente_pago'). */
  async cancelarImpagos(orderIds: string[]): Promise<void> {
    for (const id of orderIds) {
      await updateDoc(doc(db, PEDIDOS, id), { estado: 'cancelado' as EstadoPedido });
    }
  },

  /** Pedidos hechos por un comprador (cliente o profesional). */
  async pedidosDelComprador(compradorId: string): Promise<Pedido[]> {
    if (!compradorId) return [];
    const q = query(collection(db, PEDIDOS), where('compradorId', '==', compradorId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => toPedido(d.id, d.data()))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  },

  /**
   * Pedidos recibidos por un proveedor (por su uid), ya pagados, del más nuevo
   * al más viejo. Los pedidos sin pagar (pendiente_pago) no se muestran al
   * proveedor.
   */
  async pedidosDelProveedor(proveedorId: string): Promise<Pedido[]> {
    if (!proveedorId) return [];
    const q = query(collection(db, PEDIDOS), where('proveedorId', '==', proveedorId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => toPedido(d.id, d.data()))
      .filter((p) => p.estado !== 'pendiente_pago')
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  },

  /** Cambia el estado de un pedido (confirmar, enviar, entregar, cancelar). */
  async actualizarEstado(id: string, estado: EstadoPedido): Promise<void> {
    await updateDoc(doc(db, PEDIDOS, id), { estado });
  },

  /** Marca un pedido como enviado guardando los datos de envío. */
  async marcarEnviado(id: string, envio: InfoEnvio): Promise<void> {
    const datos: InfoEnvio = limpiar({
      ...envio,
      fechaEnvio: envio.fechaEnvio ?? new Date().toISOString(),
    });
    await updateDoc(doc(db, PEDIDOS, id), {
      estado: 'enviado' as EstadoPedido,
      envio: datos,
    });
  },
};
