
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';

// getReactNativePersistence existe en el bundle React Native de firebase,
// pero falta en los tipos web de firebase v11, por eso el cast.
const getReactNativePersistence = (firebaseAuth as any).getReactNativePersistence as (
  storage: typeof AsyncStorage,
) => any;
import { initializeFirestore, getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyCYNIXnHtVfQnyok1UuMCI7a1PmxbP19p4',
  authDomain: 'yofi-db.firebaseapp.com',
  projectId: 'yofi-db',
  storageBucket: 'yofi-db.firebasestorage.app',
  messagingSenderId: '410806601848',
  appId: '1:410806601848:web:7b5822dee9cca3fa0a458d',
  measurementId: 'G-W74LVS9EFN',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
let _auth: ReturnType<typeof getAuth>;

// DIAGNÓSTICO (temporal): si Metro resuelve `firebase/auth` al bundle WEB,
// `getReactNativePersistence` llega undefined, initializeAuth explota, el
// catch cae a getAuth() y el auth queda con persistencia EN MEMORIA: la
// sesión se pierde en cada reload y todas las queries dan permission-denied.
console.log('[firebase] typeof getReactNativePersistence =', typeof getReactNativePersistence);

try {
  if (typeof getReactNativePersistence !== 'function') {
    throw new Error(
      'getReactNativePersistence no existe: firebase/auth se resolvió al bundle web',
    );
  }
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  console.log('[firebase] auth OK — persistencia AsyncStorage (la sesión sobrevive al reload)');
} catch (e: any) {
  const msg = String(e?.message ?? e);
  if (msg.includes('already-initialized')) {
    // Fast Refresh volvió a evaluar el módulo: reusar la instancia existente.
    _auth = getAuth(app);
    console.log('[firebase] auth ya inicializado, se reusa la instancia');
  } else {
    _auth = getAuth(app);
    console.warn('[firebase] auth SIN PERSISTENCIA →', msg);
  }
}

let _db: ReturnType<typeof getFirestore>;
try {
  _db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    // @ts-ignore - useFetchStreams existe pero no esta en los .d.ts viejos
    useFetchStreams: false,
  });
} catch {
  _db = getFirestore(app);
}

export const auth = _auth;
export const db = _db;
export default app;
