import React from 'react';
import { Redirect } from 'expo-router';

/**
 * La compra de insumos es exclusiva del profesional. Si un cliente
 * (que solo saca turnos) llega a esta ruta por un deep link viejo, lo
 * redirigimos a su pantalla principal. La tienda real vive en
 * app/(profesional)/insumos.tsx.
 */
export default function TiendaClienteDeshabilitada() {
  return <Redirect href="/(cliente)/buscar" />;
}
