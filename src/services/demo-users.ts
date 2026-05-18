
import type { Usuario } from '@/types/models';

export const DEMO_PASSWORD = 'demo1234';

export const DEMO_USERS: Record<string, Usuario> = {
  'cliente@demo.beautyapp.com': {
    id: 'demo-cli-001',
    nombre: 'Lucía Bertinetto',
    email: 'cliente@demo.beautyapp.com',
    telefono: '+54 11 5555-1111',
    rol: 'cliente',
    perfil: {
      ciudad: 'Buenos Aires',
    },
  },
  'profesional@demo.beautyapp.com': {
    id: 'demo-pro-001',
    nombre: 'Carla Méndez',
    email: 'profesional@demo.beautyapp.com',
    telefono: '+54 11 5555-2222',
    rol: 'profesional',
    perfil: {
      especialidad: 'Uñas y pestañas',
      ciudad: 'Rosario',
      aniosExperiencia: 6,
      matricula: 'MN-4521',
    },
  },
  'proveedor@demo.beautyapp.com': {
    id: 'demo-prov-001',
    nombre: 'Javier Aguilar',
    email: 'proveedor@demo.beautyapp.com',
    telefono: '+54 11 5555-3333',
    rol: 'proveedor',
    perfil: {
      razonSocial: 'Insumos Aguilar S.R.L.',
      cuit: '30-71234567-8',
      rubro: 'Insumos para uñas y cosmética',
      ciudad: 'Córdoba',
    },
  },
};

export function isDemoEmail(email: string): boolean {
  return email.trim().toLowerCase() in DEMO_USERS;
}

export function getDemoUser(email: string): Usuario | null {
  return DEMO_USERS[email.trim().toLowerCase()] ?? null;
}
