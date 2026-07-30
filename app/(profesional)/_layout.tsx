import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';

export default function ProfesionalLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 8) : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 56 + bottomPadding,
          paddingTop: 6,
          paddingBottom: bottomPadding,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="agenda"
        options={{
          title: t('profesional.tabs.agenda'),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="caja"
        options={{
          title: t('profesional.tabs.caja'),
          tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insumos"
        options={{
          title: t('profesional.tabs.insumos'),
          tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: t('cliente.tabs.perfil'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="horarios"
        options={{
          href: null, // oculta del tab bar — se accede por navegación directa
        }}
      />
      <Tabs.Screen
        name="servicios"
        options={{
          href: null, // oculta del tab bar — se accede desde el perfil
        }}
      />
      <Tabs.Screen
        name="editar-negocio"
        options={{
          href: null, // oculta del tab bar — se accede desde el perfil
        }}
      />
      <Tabs.Screen
        name="clientes"
        options={{
          href: null, // oculta del tab bar — se accede desde el perfil
        }}
      />
      <Tabs.Screen
        name="ficha-cliente"
        options={{
          href: null, // oculta del tab bar — se accede desde Mis clientes
        }}
      />
      <Tabs.Screen
        name="nueva-ficha"
        options={{
          href: null, // oculta del tab bar — se accede desde Mis clientes
        }}
      />
      <Tabs.Screen
        name="informacion-facturacion"
        options={{
          href: null, // oculta del tab bar — se accede desde el perfil
        }}
      />
      <Tabs.Screen
        name="reputacion"
        options={{
          href: null, // oculta del tab bar — se accede desde el perfil
        }}
      />
      <Tabs.Screen
        name="mis-pedidos"
        options={{
          href: null, // oculta del tab bar — se accede desde la tienda de insumos
        }}
      />
      <Tabs.Screen
        name="carrito"
        options={{
          href: null, // oculta del tab bar — se accede desde la tienda de insumos
        }}
      />
    </Tabs>
  );
}
