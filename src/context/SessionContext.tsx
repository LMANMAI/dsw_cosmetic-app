import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Usuario, UserRole, PerfilCliente, PerfilProfesionalSignup, PerfilProveedor, Direccion, PreferenciasNotificaciones } from '@/types/models';
import { authService, type SignupPayload } from '@/services';

interface SessionState {
  user: Usuario | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (payload: SignupPayload) => Promise<void>;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  loginWithGoogleAccessToken: (accessToken: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchRole: (rol: UserRole) => Promise<void>;
  updateUser: (data: Partial<Pick<Usuario, 'nombre' | 'telefono' | 'avatarUrl'> & { perfil?: PerfilCliente | PerfilProfesionalSignup | PerfilProveedor; direcciones?: Direccion[]; preferencias?: PreferenciasNotificaciones }>) => Promise<void>;
}

const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.subscribe((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const u = await authService.loginWithEmail(email, password);
    setUser(u);
  }, []);

  const signupWithEmail = useCallback(async (payload: SignupPayload) => {
    const u = await authService.signupWithEmail(payload);
    setUser(u);
  }, []);

  const loginWithGoogleIdToken = useCallback(async (idToken: string) => {
    const u = await authService.loginWithGoogleIdToken(idToken);
    setUser(u);
  }, []);

  const loginWithGoogleAccessToken = useCallback(async (accessToken: string) => {
    const u = await authService.loginWithGoogleAccessToken(accessToken);
    setUser(u);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await authService.sendPasswordReset(email);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    const fresh = await authService.recargarUsuario(user.id);
    if (fresh) setUser(fresh);
  }, [user]);

  const updateUser = useCallback(
    async (data: Partial<Pick<Usuario, 'nombre' | 'telefono' | 'avatarUrl'> & { perfil?: PerfilCliente | PerfilProfesionalSignup | PerfilProveedor; direcciones?: Direccion[]; preferencias?: PreferenciasNotificaciones }>) => {
      if (!user) return;
      const updated = await authService.updateUser(user.id, data);
      setUser(updated);
    },
    [user],
  );

  const switchRole = useCallback(
    async (rol: UserRole) => {
      if (!user) return;
      await authService.updateRol(user.id, rol);
      setUser({ ...user, rol });
    },
    [user],
  );

  const value = useMemo<SessionState>(
    () => ({
      user,
      loading,
      loginWithEmail,
      signupWithEmail,
      loginWithGoogleIdToken,
      loginWithGoogleAccessToken,
      sendPasswordReset,
      logout,
      refreshUser,
      switchRole,
      updateUser,
    }),
    [
      user,
      loading,
      loginWithEmail,
      signupWithEmail,
      loginWithGoogleIdToken,
      loginWithGoogleAccessToken,
      sendPasswordReset,
      logout,
      refreshUser,
      switchRole,
      updateUser,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionProvider');
  return ctx;
}
