import React, { useEffect } from 'react';
import { Slot, SplashScreen, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '@/context/SessionContext';
import { CartProvider } from '@/context/CartContext';
import { LanguageProvider } from '@/i18n';
import { useRegistrarPush } from '@/hooks/useRegistrarPush';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});


function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

function AuthGate() {
  const { user, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  // Registra el token de push del dispositivo cuando hay sesión.
  useRegistrarPush(user?.id ?? '');

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
        <ThemeProvider>
          <LanguageProvider>
            <SessionProvider>
              <CartProvider>
                <ThemedStatusBar />
                <AuthGate />
              </CartProvider>
            </SessionProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
