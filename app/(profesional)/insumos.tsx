import React from 'react';
import TiendaScreen from '../(cliente)/tienda';

/**
 * El profesional usa la misma tienda integrada que el cliente.
 * Por requisito del informe: "compra de insumos desde la misma app".
 */
export default function InsumosProfesional() {
  return <TiendaScreen />;
}
