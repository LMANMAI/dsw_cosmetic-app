import type { Pedido, Producto } from '@/types/models';
import { PRODUCTOS_MOCK } from '@/data/productos.mock';
import { fakeDelay } from './api-client';

let _productos: Producto[] = [...PRODUCTOS_MOCK];
let _pedidos: Pedido[] = [];

export const productosService = {
  async listar(categoria?: string, query?: string): Promise<Producto[]> {
    await fakeDelay();
    let res = [..._productos];
    if (categoria) res = res.filter((p) => p.categoria === categoria);
    if (query) {
      const q = query.toLowerCase();
      res = res.filter((p) => p.nombre.toLowerCase().includes(q));
    }
    return res;
  },

  async obtenerPorId(id: string): Promise<Producto | null> {
    await fakeDelay(120);
    return _productos.find((p) => p.id === id) ?? null;
  },

  async confirmarPedido(pedido: Omit<Pedido, 'id' | 'fecha' | 'estado'>): Promise<Pedido> {
    await fakeDelay(450);
    // descuenta stock automáticamente
    pedido.items.forEach((item) => {
      _productos = _productos.map((p) =>
        p.id === item.productoId
          ? { ...p, stock: Math.max(0, p.stock - item.cantidad) }
          : p,
      );
    });
    const nuevo: Pedido = {
      ...pedido,
      id: `pe-${Date.now()}`,
      fecha: new Date().toISOString(),
      estado: 'confirmado',
    };
    _pedidos.push(nuevo);
    return nuevo;
  },

  async pedidosDe(usuarioId: string): Promise<Pedido[]> {
    await fakeDelay();
    return _pedidos.filter((p) => p.compradorId === usuarioId);
  },
};
