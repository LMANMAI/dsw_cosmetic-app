import React from 'react';
import { Stack } from 'expo-router';

/**
 * Stack del grupo cliente. Las tabs viven en (tabs); las pantallas de
 * detalle (perfil de profesional, datos personales, etc.) se apilan
 * encima, así "atrás" siempre vuelve a la pantalla anterior.
 *
 * La compra de insumos NO está disponible para el cliente: solo el
 * profesional accede a la tienda (app/(profesional)/insumos).
 */
export default function ClienteLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profesional/[id]" />
      <Stack.Screen name="datos-personales" />
      <Stack.Screen name="convertirse-profesional" />
      <Stack.Screen name="direcciones" />
      <Stack.Screen name="centro-ayuda" />
      <Stack.Screen name="terminos" />
    </Stack>
  );
}
