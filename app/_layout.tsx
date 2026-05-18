import React, { useEffect } from 'react';
import { Slot, SplashScreen, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '@/context/SessionContext';
import { CartProvider } from '@/context/CartContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthGate() {
  const { user, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync().catch(() => {});

    const inAuthRoute = segments[0] === '(auth)';

    if (!user && !inAuthRoute) {
      router.replace('/(auth)/login');
      return;
    }
    if (user && inAuthRoute) {
      switch (user.rol) {
        case 'profesional':
          router.replace('/(profesional)/agenda');
          break;
        case 'proveedor':
          router.replace('/(proveedor)/inicio');
          break;
        default:
          router.replace('/(cliente)/buscar');
      }
    }
  }, [user, loading, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <CartProvider>
            <StatusBar style="dark" />
            <AuthGate />
          </CartProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
