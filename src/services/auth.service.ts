
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  signInWithCredential,
  GoogleAuthProvider,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser,
  type AuthCredential,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  DEMO_PASSWORD,
  DEMO_USERS,
  getDemoUser,
  isDemoEmail,
} from './demo-users';
import type {
  Usuario,
  UserRole,
  PerfilCliente,
  PerfilProfesionalSignup,
  PerfilProveedor,
  Direccion,
  PreferenciasNotificaciones,
} from '@/types/models';

const USERS_COLLECTION = 'usuarios';
const DEMO_SESSION_KEY = 'beautyapp.demoSession';

// Flag para evitar que el listener de onAuthStateChanged cree un doc
// con rol 'cliente' mientras signupWithEmail esta guardando el rol correcto.
let _signupInProgress = false;

async function getDemoSession(): Promise<Usuario | null> {
  try {
    const raw = await AsyncStorage.getItem(DEMO_SESSION_KEY);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  } catch {
    return null;
  }
}

async function setDemoSession(u: Usuario): Promise<void> {
  await AsyncStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(u));
}

async function clearDemoSession(): Promise<void> {
  await AsyncStorage.removeItem(DEMO_SESSION_KEY);
}

export interface SignupPayload {
  email: string;
  password: string;
  nombre: string;
  telefono: string;
  rol: Exclude<UserRole, 'admin'>;
  perfil: PerfilCliente | PerfilProfesionalSignup | PerfilProveedor;
}

interface UsuarioDoc {
  nombre: string;
  email: string;
  telefono: string;
  rol: UserRole;
  avatarUrl?: string;
  perfil?: PerfilCliente | PerfilProfesionalSignup | PerfilProveedor;
  direcciones?: Direccion[];
  preferencias?: PreferenciasNotificaciones;
  mpConectado?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function buildUsuario(uid: string, d: UsuarioDoc): Usuario {
  return {
    id: uid,
    nombre: d.nombre,
    email: d.email,
    telefono: d.telefono ?? '',
    rol: d.rol,
    avatarUrl: d.avatarUrl,
    perfil: d.perfil,
    direcciones: d.direcciones,
    preferencias: d.preferencias,
    mpConectado: d.mpConectado,
  };
}

async function fetchUsuario(uid: string): Promise<Usuario | null> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return buildUsuario(uid, snap.data() as UsuarioDoc);
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((v) => v !== undefined)
      .map((v) => stripUndefined(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

async function upsertUsuario(
  uid: string,
  data: Partial<UsuarioDoc> & Pick<UsuarioDoc, 'email' | 'rol' | 'nombre'>,
): Promise<Usuario> {
  const ref = doc(db, USERS_COLLECTION, uid);
  const cleanData = stripUndefined(data);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { ...cleanData, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, {
      telefono: '',
      ...cleanData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  const fresh = await getDoc(ref);
  return buildUsuario(uid, fresh.data() as UsuarioDoc);
}

async function loginWithGoogleCredential(credential: AuthCredential): Promise<Usuario> {
  const cred = await signInWithCredential(auth, credential);
  const fbUser = cred.user;
  const existing = await fetchUsuario(fbUser.uid);
  if (existing) return existing;
  return upsertUsuario(fbUser.uid, {
    email: fbUser.email ?? '',
    nombre: fbUser.displayName ?? 'Usuaria YOFI',
    telefono: fbUser.phoneNumber ?? '',
    rol: 'cliente',
    avatarUrl: fbUser.photoURL ?? undefined,
  });
}

export const authService = {
  async loginWithEmail(email: string, password: string): Promise<Usuario> {
    if (isDemoEmail(email)) {
      if (password !== DEMO_PASSWORD) {
        const err: any = new Error('Contrasena demo incorrecta.');
        err.code = 'auth/wrong-password';
        throw err;
      }
      const u = getDemoUser(email)!;
      await setDemoSession(u);
      return u;
    }
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    let usuario = await fetchUsuario(cred.user.uid);
    if (!usuario) {
      usuario = await upsertUsuario(cred.user.uid, {
        email: cred.user.email ?? email.trim(),
        nombre: cred.user.displayName ?? 'Usuaria YOFI',
        telefono: cred.user.phoneNumber ?? '',
        rol: 'cliente',
        avatarUrl: cred.user.photoURL ?? undefined,
      });
    }
    return usuario;
  },

  async signupWithEmail(payload: SignupPayload): Promise<Usuario> {
    if (isDemoEmail(payload.email)) {
      const u = getDemoUser(payload.email)!;
      await setDemoSession(u);
      return u;
    }
    // Evitamos que onAuthStateChanged cree el doc con rol 'cliente'
    // antes de que nosotros lo creemos con el rol correcto.
    _signupInProgress = true;
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        payload.email.trim(),
        payload.password,
      );
      if (payload.nombre) {
        await updateProfile(cred.user, { displayName: payload.nombre });
      }
      const usuario = await upsertUsuario(cred.user.uid, {
        email: payload.email.trim(),
        nombre: payload.nombre,
        telefono: payload.telefono,
        rol: payload.rol,
        perfil: payload.perfil,
      });
      return usuario;
    } finally {
      _signupInProgress = false;
    }
  },

  async loginWithGoogleIdToken(idToken: string): Promise<Usuario> {
    return loginWithGoogleCredential(GoogleAuthProvider.credential(idToken));
  },

  async loginWithGoogleAccessToken(accessToken: string): Promise<Usuario> {
    return loginWithGoogleCredential(
      GoogleAuthProvider.credential(null, accessToken),
    );
  },

  async sendPasswordReset(email: string): Promise<void> {
    if (isDemoEmail(email)) return;
    await sendPasswordResetEmail(auth, email.trim());
  },

  async logout(): Promise<void> {
    await clearDemoSession();
    try {
      await fbSignOut(auth);
    } catch {
      // Si Firebase no esta configurado, solo limpiamos la demo.
    }
  },

  /** Re-lee el usuario desde Firestore (p. ej. tras conectar Mercado Pago). */
  async recargarUsuario(uid: string): Promise<Usuario | null> {
    return fetchUsuario(uid);
  },

  subscribe(cb: (user: Usuario | null) => void): () => void {
    let cancelled = false;
    let firstFirebaseEmit = true;

    getDemoSession().then((u) => {
      if (cancelled) return;
      if (u) cb(u);
    });

    const unsub = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (cancelled) return;
      if (!fbUser) {
        const demo = await getDemoSession();
        if (firstFirebaseEmit && demo) {
          firstFirebaseEmit = false;
          return;
        }
        firstFirebaseEmit = false;
        cb(demo);
        return;
      }
      firstFirebaseEmit = false;
      try {
        // Si hay un signup en curso, no creamos el doc con rol por defecto.
        // El signupWithEmail se encarga de crearlo con el rol correcto.
        if (_signupInProgress) {
          console.log('[auth] subscribe: signup en curso, esperando...');
          return;
        }
        let u = await fetchUsuario(fbUser.uid);
        if (!u) {
          u = await upsertUsuario(fbUser.uid, {
            email: fbUser.email ?? '',
            nombre: fbUser.displayName ?? 'Usuaria YOFI',
            telefono: fbUser.phoneNumber ?? '',
            rol: 'cliente',
            avatarUrl: fbUser.photoURL ?? undefined,
          });
        }
        cb(u);
      } catch {
        cb(null);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  },

  /**
   * Actualiza campos del usuario en Firestore y devuelve el usuario fresco.
   */
  async updateUser(
    uid: string,
    data: Partial<Pick<UsuarioDoc, 'nombre' | 'telefono' | 'avatarUrl' | 'perfil' | 'direcciones' | 'preferencias'>>,
  ): Promise<Usuario> {
    const demoMatch = Object.values(DEMO_USERS).find((u) => u.id === uid);
    if (demoMatch) {
      const updated: Usuario = { ...demoMatch, rol };
      await setDemoSession(updated);
      return;
    }
    await updateDoc(doc(db, USERS_COLLECTION, uid), {
      rol,
      updatedAt: serverTimestamp(),
    });
  },
};
