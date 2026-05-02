import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Usuario, UserRole } from '@/types/models';
import { authService } from '@/services';

interface SessionState {
  user: Usuario | null;
  loading: boolean;
  login: (email: string, password: string, rol?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (rol: UserRole) => Promise<void>;
}

const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .getSession()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string, rol: UserRole = 'cliente') => {
    const u = await authService.login(email, password, rol);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const switchRole = useCallback(async (rol: UserRole) => {
    const u = await authService.switchRole(rol);
    setUser(u);
  }, []);

  const value = useMemo<SessionState>(
    () => ({ user, loading, login, logout, switchRole }),
    [user, loading, login, logout, switchRole],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionProvider');
  return ctx;
}
