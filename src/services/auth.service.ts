import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Usuario, UserRole } from '@/types/models';
import { fakeDelay } from './api-client';

const STORAGE_KEY = 'beautyapp.session';

const DEMO_USERS: Record<UserRole, Usuario> = {
  cliente: {
    id: 'u-cli-demo',
    nombre: 'Lucía B.',
    email: 'cliente@beautyapp.demo',
    telefono: '+54 11 5555-1111',
    rol: 'cliente',
  },
  profesional: {
    id: 'u-pro-1',
    nombre: 'Carla Méndez',
    email: 'profesional@beautyapp.demo',
    telefono: '+54 11 5555-2222',
    rol: 'profesional',
  },
  admin: {
    id: 'u-admin',
    nombre: 'Admin BeautyApp',
    email: 'admin@beautyapp.demo',
    telefono: '+54 11 5555-9999',
    rol: 'admin',
  },
};

export const authService = {
  async login(_email: string, _password: string, rol: UserRole = 'cliente'): Promise<Usuario> {
    await fakeDelay();
    // TODO: cuando exista backend → POST /auth/login
    const user = DEMO_USERS[rol];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  async getSession(): Promise<Usuario | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  },

  async switchRole(rol: UserRole): Promise<Usuario> {
    const user = DEMO_USERS[rol];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  },
};
