import type { PerfilProfesional, Servicio } from '@/types/models';

// Coordenadas reales aproximadas de barrios de CABA
export const PROFESIONALES_MOCK: PerfilProfesional[] = [
  {
    id: 'pro-1',
    usuarioId: 'u-pro-1',
    nombre: 'Carla Méndez',
    descripcion: 'Técnica en cosmetología · 6 años de experiencia · Atiendo en mi estudio en Villa Urquiza.',
    zona: 'Villa Urquiza',
    latitud: -34.5759,
    longitud: -58.4892,
    rating: 4.9,
    reviews: 87,
    activa: true,
    categorias: ['unas', 'cejas', 'pestanas'],
    distanciaKm: 0.8,
  },
  {
    id: 'pro-2',
    usuarioId: 'u-pro-2',
    nombre: 'Lucía Fernández',
    descripcion: 'Especialista en lifting de pestañas y diseño de cejas. Estudio en Belgrano.',
    zona: 'Belgrano',
    latitud: -34.5638,
    longitud: -58.4575,
    rating: 4.8,
    reviews: 142,
    activa: true,
    categorias: ['pestanas', 'cejas'],
    distanciaKm: 1.4,
  },
  {
    id: 'pro-3',
    usuarioId: 'u-pro-3',
    nombre: 'Sofía Pérez',
    descripcion: 'Masajista descontracturante y deportiva. Atención a domicilio en zona norte.',
    zona: 'Núñez',
    latitud: -34.5470,
    longitud: -58.4630,
    rating: 5.0,
    reviews: 54,
    activa: true,
    categorias: ['masajes'],
    distanciaKm: 2.1,
  },
  {
    id: 'pro-4',
    usuarioId: 'u-pro-4',
    nombre: 'Ana Torres',
    descripcion: 'Manicura artística, esculpidas y semipermanentes. Caballito.',
    zona: 'Caballito',
    latitud: -34.6189,
    longitud: -58.4392,
    rating: 4.7,
    reviews: 213,
    activa: true,
    categorias: ['unas'],
    distanciaKm: 3.6,
  },
  {
    id: 'pro-5',
    usuarioId: 'u-pro-5',
    nombre: 'Valentina Ruiz',
    descripcion: 'Nutricionista · planes personalizados · consultas online y presenciales en Palermo.',
    zona: 'Palermo',
    latitud: -34.5889,
    longitud: -58.4173,
    rating: 4.9,
    reviews: 98,
    activa: true,
    categorias: ['nutricion'],
    distanciaKm: 2.8,
  },
];

export const SERVICIOS_MOCK: Servicio[] = [
  // Carla
  { id: 's-1', profesionalId: 'pro-1', nombre: 'Diseño de cejas con henna', precio: 8500, duracionMin: 45, categoria: 'cejas' },
  { id: 's-2', profesionalId: 'pro-1', nombre: 'Esmaltado semipermanente', precio: 12000, duracionMin: 60, categoria: 'unas' },
  { id: 's-3', profesionalId: 'pro-1', nombre: 'Lifting de pestañas', precio: 14000, duracionMin: 75, categoria: 'pestanas' },
  // Lucía
  { id: 's-4', profesionalId: 'pro-2', nombre: 'Lifting + tintura de pestañas', precio: 16000, duracionMin: 90, categoria: 'pestanas' },
  { id: 's-5', profesionalId: 'pro-2', nombre: 'Perfilado de cejas', precio: 6500, duracionMin: 30, categoria: 'cejas' },
  // Sofía
  { id: 's-6', profesionalId: 'pro-3', nombre: 'Masaje descontracturante 60 min', precio: 18000, duracionMin: 60, categoria: 'masajes' },
  { id: 's-7', profesionalId: 'pro-3', nombre: 'Masaje deportivo 45 min', precio: 14000, duracionMin: 45, categoria: 'masajes' },
  // Ana
  { id: 's-8', profesionalId: 'pro-4', nombre: 'Esculpidas en acrílico', precio: 22000, duracionMin: 120, categoria: 'unas' },
  { id: 's-9', profesionalId: 'pro-4', nombre: 'Manicura express', precio: 7500, duracionMin: 30, categoria: 'unas' },
  // Valentina
  { id: 's-10', profesionalId: 'pro-5', nombre: 'Consulta nutricional inicial', precio: 25000, duracionMin: 60, categoria: 'nutricion' },
  { id: 's-11', profesionalId: 'pro-5', nombre: 'Seguimiento mensual', precio: 18000, duracionMin: 45, categoria: 'nutricion' },
];
