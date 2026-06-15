import React from 'react';
import { CentroAyudaScreen, type Faq } from '@/screens/CentroAyudaScreen';

const FAQS_PROVEEDOR: Faq[] = [
  {
    pregunta: '¿Cómo cargo mis productos?',
    respuesta:
      'Desde la pestaña Productos tocá el botón + para crear uno nuevo: nombre, precio, stock, categoría, foto y descripción. Lo podés editar o pausar cuando quieras.',
  },
  {
    pregunta: '¿Cómo me llegan los pedidos?',
    respuesta:
      'Cuando un profesional compra tus insumos y completa el pago, el pedido aparece en la pestaña Pedidos y en tu Inicio. Solo verás pedidos ya pagados.',
  },
  {
    pregunta: '¿Cómo confirmo y envío un pedido?',
    respuesta:
      'En Pedidos, tocá "Confirmar pedido" para aceptarlo y luego "Marcar como enviado". Ahí cargás si lo enviás por tu cuenta o por correo (Andreani, Correo Argentino, etc.), el número de seguimiento y un mensaje para el comprador.',
  },
  {
    pregunta: '¿Cómo cobro mis ventas?',
    respuesta:
      'Los pagos se procesan por MercadoPago. La conexión de tu cuenta para recibir los cobros se habilitará próximamente desde tu perfil.',
  },
  {
    pregunta: '¿Cómo edito los datos de mi comercio?',
    respuesta:
      'Desde Perfil → Datos del comercio podés actualizar la razón social, el CUIT, el rubro y la dirección.',
  },
  {
    pregunta: '¿Qué pasa si apago "Acepto pedidos"?',
    respuesta:
      'Mientras esté apagado no recibís pedidos nuevos ni aparecés en la tienda. Lo podés volver a activar cuando quieras desde Perfil → Ventas y envíos.',
  },
];

export default function CentroAyudaProveedorScreen() {
  return (
    <CentroAyudaScreen
      faqs={FAQS_PROVEEDOR}
      subtitle="Todo lo que necesitás para vender en BeautyApp"
    />
  );
}
