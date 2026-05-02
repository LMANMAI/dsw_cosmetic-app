import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Producto } from '@/types/models';

export interface CartItem {
  producto: Producto;
  cantidad: number;
}

interface CartState {
  items: CartItem[];
  total: number;
  add: (p: Producto, qty?: number) => void;
  remove: (productoId: string) => void;
  setQty: (productoId: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartState | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = useCallback((p: Producto, qty = 1) => {
    setItems((prev) => {
      const exists = prev.find((it) => it.producto.id === p.id);
      if (exists) {
        return prev.map((it) =>
          it.producto.id === p.id ? { ...it, cantidad: it.cantidad + qty } : it,
        );
      }
      return [...prev, { producto: p, cantidad: qty }];
    });
  }, []);

  const remove = useCallback((productoId: string) => {
    setItems((prev) => prev.filter((it) => it.producto.id !== productoId));
  }, []);

  const setQty = useCallback((productoId: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((it) => (it.producto.id === productoId ? { ...it, cantidad: qty } : it))
        .filter((it) => it.cantidad > 0),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const total = useMemo(
    () => items.reduce((acc, it) => acc + it.producto.precio * it.cantidad, 0),
    [items],
  );

  const value = useMemo<CartState>(
    () => ({ items, total, add, remove, setQty, clear }),
    [items, total, add, remove, setQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
