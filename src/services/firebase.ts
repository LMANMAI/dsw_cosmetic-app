
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
  apiKey: 'AIzaSyDe4ABJYv4jNndDluLKlJcS9YC28t9drJ0',
  authDomain: 'yopi-demo.firebaseapp.com',
  projectId: 'yopi-demo',
  storageBucket: 'yopi-demo.firebasestorage.app',
  messagingSenderId: '883387668629',
  appId: '1:883387668629:web:98b254a9b214b9c071239c',
  measurementId: 'G-3VZ5FFV7QN',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
let _auth: ReturnType<typeof getAuth>;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  _auth = getAuth(app);
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
