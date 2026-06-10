import React from 'react';
import { Stack } from 'expo-router';

/**
 * Stack del grupo cliente. Las tabs viven en (tabs); las pantallas de
 * detalle (perfil de profesional, tienda, datos personales, etc.) se
 * apilan encima, así "atrás" siempre vuelve a la pantalla anterior.
 */
export default function ClienteLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profesional/[id]" />
      <Stack.Screen name="tienda" />
      <Stack.Screen name="datos-personales" />
      <Stack.Screen name="direcciones" />
      <Stack.Screen name="centro-ayuda" />
      <Stack.Screen name="terminos" />
    </Stack>
  );
}
