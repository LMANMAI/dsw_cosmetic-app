import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { notificacionesService } from '@/services';
import { formatARS } from '@/utils/format';

/**
 * Escucha en tiempo real los pedidos de un proveedor y dispara una
 * notificación local cuando entra uno nuevo ya pagado (estado 'pendiente').
 *
 * Es la opción "sin backend" basada en Firestore: funciona mientras la app
 * está abierta. El push con la app cerrada y el email requieren un disparador
 * del lado servidor (Cloud Functions / extensión Trigger Email de Firebase).
 */
export function useNuevoPedidoNotif(proveedorId: string, enabled: boolean) {
  const inicializado = useRef(false);
  const notificados = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!proveedorId || !enabled) return;

    inicializado.current = false;
    notificados.current = new Set();
    notificacionesService.pedirPermisos();

    const q = query(collection(db, 'pedidos'), where('proveedorId', '==', proveedorId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        // Primera carga: marcamos los pedidos pagados existentes como ya vistos.
        if (!inicializado.current) {
          snap.docs.forEach((d) => {
            if (d.data().estado !== 'pendiente_pago') notificados.current.add(d.id);
          });
          inicializado.current = true;
          return;
        }

        snap.docChanges().forEach((ch) => {
          if (ch.type === 'removed') return;
          const data = ch.doc.data();
          // Notificamos una sola vez, cuando el pedido llega a 'pendiente' (pagado).
          if (data.estado === 'pendiente' && !notificados.current.has(ch.doc.id)) {
            notificados.current.add(ch.doc.id);
            notificacionesService.notificarLocal(
              'Nuevo pedido',
              `${data.compradorNombre ?? 'Un profesional'} compró por ${formatARS(data.total ?? 0)}.`,
              { pedidoId: ch.doc.id },
            );
          }
        });
      },
      () => {
        // Errores de permisos/red: no hacemos nada.
      },
    );

    return unsub;
  }, [proveedorId, enabled]);
}
