
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
  sendEmailVerification,
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
import { signOutNativo } from './google-native';
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
  esProfesional?: boolean;
  /** Ver Usuario.isValidated. Ausente = cuenta anterior a la validación. */
  isValidated?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Deduce si una cuenta está habilitada como profesional cuando el doc no tiene
 * el flag `esProfesional` (cuentas creadas antes de que existiera, o sesiones
 * demo guardadas). Se apoya en el rol y en tener perfil profesional cargado:
 * `especialidad` solo existe en PerfilProfesionalSignup.
 */
function derivarEsProfesional(d: {
  rol?: UserRole;
  esProfesional?: boolean;
  perfil?: UsuarioDoc['perfil'];
}): boolean {
  if (d.esProfesional === true) return true;
  if (d.rol === 'profesional') return true;
  const perfil = d.perfil as PerfilProfesionalSignup | undefined;
  return !!perfil?.especialidad;
}

/**
 * Estado de validación de email según el doc de Firestore.
 *
 * Si el doc NO trae el flag es una cuenta creada antes de que existiera la
 * validación: se la considera validada para no dejar afuera a los usuarios
 * que ya venían usando la app.
 *
 * La sincronización con `emailVerified` de Firebase Auth (el usuario hizo clic
 * en el link) se hace en `subscribe` y en `refrescarVerificacionEmail`, que
 * además persisten el flag.
 */
function derivarIsValidated(d: { isValidated?: boolean }): boolean {
  return d.isValidated ?? true;
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
    esProfesional: derivarEsProfesional(d),
    isValidated: derivarIsValidated(d),
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

/** Pone isValidated en true en el doc del usuario y devuelve el usuario fresco. */
async function marcarValidado(uid: string): Promise<Usuario> {
  const ref = doc(db, USERS_COLLECTION, uid);
  await updateDoc(ref, { isValidated: true, updatedAt: serverTimestamp() });
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
    // Google ya verificó el mail: la cuenta entra directo.
    isValidated: fbUser.emailVerified !== false,
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
        isValidated: cred.user.emailVerified === true,
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
        esProfesional: payload.rol === 'profesional' ? true : undefined,
        // La cuenta nace sin validar: hasta que no confirme el mail, la app
        // la deja en la pantalla "verificar-email".
        isValidated: false,
      });
      // Mail de verificación. Si falla (sin red, cuota), no rompemos el alta:
      // desde la pantalla de verificación se puede reenviar.
      try {
        await sendEmailVerification(cred.user);
      } catch (e) {
        console.warn('[auth] no se pudo enviar el mail de verificación', e);
      }
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
    // Sin esto, el proximo login con Google reusa la cuenta anterior en silencio.
    await signOutNativo();
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

  /* ── Validación de email ─────────────────────────────────────────── */

  /**
   * Reenvía el mail de verificación al usuario logueado.
   * Lanza el error de Firebase (p. ej. auth/too-many-requests) para que la
   * pantalla pueda mostrar un mensaje adecuado.
   */
  async reenviarVerificacionEmail(): Promise<void> {
    const fbUser = auth.currentUser;
    if (!fbUser) throw new Error('SIN_SESION');
    await sendEmailVerification(fbUser);
  },

  /**
   * Vuelve a consultar a Firebase si el mail ya fue verificado.
   * Si lo fue, persiste `isValidated: true` y devuelve el usuario actualizado.
   * Devuelve null si todavía no está verificado.
   */
  async refrescarVerificacionEmail(): Promise<Usuario | null> {
    const fbUser = auth.currentUser;
    if (!fbUser) return null;
    // reload() trae el estado real desde el servidor de Firebase Auth.
    await fbUser.reload();
    // El ID token viejo sigue diciendo email_verified:false; lo renovamos para
    // que las reglas de Firestore (si algún día lo miran) vean el estado nuevo.
    await fbUser.getIdToken(true).catch(() => {});
    if (!auth.currentUser?.emailVerified) return null;
    return marcarValidado(fbUser.uid);
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
        // DIAGNÓSTICO (temporal): Firebase emitió "sin usuario". Si esto pasa
        // después de haber emitido un usuario, la sesión se perdió (típico de
        // auth sin persistencia) y a partir de acá todo da permission-denied.
        console.warn(
          '[auth] onAuthStateChanged → SIN usuario (firstEmit:', firstFirebaseEmit, ')',
        );
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

      // DIAGNÓSTICO (temporal): forzar el refresh del ID token. Si el token no
      // se puede renovar (usuario borrado/deshabilitado en Authentication,
      // token revocado, o falla de red) el SDK descarta la sesión y emite null
      // justo después. Acá vemos el código de error exacto.
      fbUser
        .getIdToken(true)
        .then(() => console.log('[auth] refresh de ID token OK para', fbUser.uid))
        .catch((e: any) =>
          console.error('[auth] refresh de ID token FALLÓ:', e?.code ?? '', e?.message ?? e),
        );

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
            isValidated: fbUser.emailVerified === true,
          });
        } else if (u.isValidated === false && fbUser.emailVerified) {
          // Validó el mail en otro dispositivo/sesión: sincronizamos el flag.
          u = await marcarValidado(fbUser.uid);
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
   * Cambia la VISTA activa de la cuenta (`rol`).
   *
   * No toca `perfil`: una cuenta habilitada como profesional sigue siendo
   * profesional aunque esté mirando la app en vista cliente (así no desaparece
   * de las búsquedas ni pierde su agenda).
   *
   * Importante: al salir de la vista profesional persiste `esProfesional: true`.
   * Sin esto, una cuenta creada antes del flag quedaba con rol 'cliente' y sin
   * flag, y al volver le pedía otra vez el alta profesional.
   */
  async updateRol(uid: string, rol: UserRole): Promise<Usuario> {
    const demoMatch = Object.values(DEMO_USERS).find((u) => u.id === uid);
    if (demoMatch) {
      const current = (await getDemoSession()) ?? demoMatch;
      const updated: Usuario = {
        ...current,
        rol,
        esProfesional: derivarEsProfesional(current) || rol === 'profesional',
      };
      await setDemoSession(updated);
      return updated;
    }
    const ref = doc(db, USERS_COLLECTION, uid);
    const actual = await getDoc(ref);
    const data = actual.data() as UsuarioDoc | undefined;
    const eraProfesional = !!data && derivarEsProfesional(data);
    await updateDoc(ref, {
      rol,
      // Se marca al salir de profesional (y también al entrar, por si el doc
      // venía sin el flag), nunca se pone en false.
      ...(eraProfesional || rol === 'profesional' ? { esProfesional: true } : {}),
      updatedAt: serverTimestamp(),
    });
    const fresh = await getDoc(ref);
    return buildUsuario(uid, fresh.data() as UsuarioDoc);
  },

  /**
   * Habilita la cuenta como profesional: guarda el perfil profesional,
   * marca `esProfesional` y deja la vista activa en 'profesional'.
   */
  async habilitarProfesional(
    uid: string,
    perfil: PerfilProfesionalSignup,
  ): Promise<Usuario> {
    const cleanPerfil = stripUndefined(perfil);
    const demoMatch = Object.values(DEMO_USERS).find((u) => u.id === uid);
    if (demoMatch) {
      const current = (await getDemoSession()) ?? demoMatch;
      const updated: Usuario = {
        ...current,
        rol: 'profesional',
        esProfesional: true,
        perfil: { ...(current.perfil ?? {}), ...cleanPerfil },
      };
      await setDemoSession(updated);
      return updated;
    }
    const ref = doc(db, USERS_COLLECTION, uid);
    // Conservamos los datos que ya tenía como cliente (ciudad, fecha de
    // nacimiento) y le sumamos los del negocio.
    const actual = await getDoc(ref);
    const perfilActual = (actual.data() as UsuarioDoc | undefined)?.perfil ?? {};
    await updateDoc(ref, {
      rol: 'profesional',
      esProfesional: true,
      perfil: { ...perfilActual, ...cleanPerfil },
      updatedAt: serverTimestamp(),
    });
    const fresh = await getDoc(ref);
    return buildUsuario(uid, fresh.data() as UsuarioDoc);
  },

  /**
   * Actualiza campos del usuario en Firestore y devuelve el usuario fresco.
   */
  async updateUser(
    uid: string,
    data: Partial<Pick<UsuarioDoc, 'nombre' | 'telefono' | 'avatarUrl' | 'perfil' | 'direcciones' | 'preferencias'>>,
  ): Promise<Usuario> {
    const cleanData = stripUndefined(data);
    const demoMatch = Object.values(DEMO_USERS).find((u) => u.id === uid);
    if (demoMatch) {
      const current = (await getDemoSession()) ?? demoMatch;
      const updated: Usuario = { ...current, ...cleanData };
      await setDemoSession(updated);
      return updated;
    }
    const ref = doc(db, USERS_COLLECTION, uid);
    await updateDoc(ref, {
      ...cleanData,
      updatedAt: serverTimestamp(),
    });
    const fresh = await getDoc(ref);
    return buildUsuario(uid, fresh.data() as UsuarioDoc);
  },
};
