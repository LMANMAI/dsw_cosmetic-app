
export type UserRole = 'cliente' | 'profesional' | 'proveedor' | 'admin';

export interface PerfilCliente {
  ciudad?: string;
  fechaNacimiento?: string; // ISO YYYY-MM-DD
}

export interface PerfilProfesionalSignup {
  especialidad: string; // p. ej. "Manicura", "Pestañas"
  ciudad: string;
  direccion: string;
  aniosExperiencia: number;
  matricula?: string;
  instagram?: string;
  modalidad: 'salon' | 'domicilio' | 'ambos';
  fotoSalonUrl?: string; // URL en Firebase Storage (obligatoria si modalidad incluye salon)
}

export interface PerfilProveedor {
  razonSocial: string;
  cuit: string;
  rubro: string; // p. ej. "Insumos para uñas"
  ciudad: string;
}

export type PerfilPorRol =
  | { rol: 'cliente'; perfil: PerfilCliente }
  | { rol: 'profesional'; perfil: PerfilProfesionalSignup }
  | { rol: 'proveedor'; perfil: PerfilProveedor }
  | { rol: 'admin'; perfil: Record<string, never> };

export type CategoriaSlug =
  | 'unas'
  | 'pestanas'
  | 'cejas'
  | 'masajes'
  | 'nutricion'
  | 'estilismo';

export interface Categoria {
  slug: CategoriaSlug;
  nombre: string;
  emoji: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: UserRole;
  avatarUrl?: string;
  perfil?: PerfilCliente | PerfilProfesionalSignup | PerfilProveedor;
}

export type ModalidadTrabajo = 'salon' | 'domicilio' | 'ambos';

export interface PerfilProfesional {
  id: string;
  usuarioId: string;
  nombre: string;
  descripcion: string;
  zona: string;
  direccion: string;
  ciudad: string;
  latitud: number;
  longitud: number;
  telefono: string;
  instagram: string;
  modalidad: ModalidadTrabajo;
  fotoSalon?: string; // requerida si modalidad es 'salon' o 'ambos'
  rating: number;
  reviews: number;
  activa: boolean;
  categorias: CategoriaSlug[];
  fotoUrl?: string;
  distanciaKm?: number;
}

export interface Servicio {
  id: string;
  profesionalId: string;
  nombre: string;
  precio: number;
  duracionMin: number;
  categoria: CategoriaSlug;
}

export type EstadoTurno =
  | 'pendiente'
  | 'confirmado'
  | 'completado'
  | 'cancelado'
  | 'no_asistio';

export type MetodoPago = 'efectivo' | 'transferencia' | 'mercado_pago' | 'mixto';

export interface Turno {
  id: string;
  clienteId: string;
  clienteNombre: string;
  profesionalId: string;
  servicioId: string;
  servicioNombre: string;
  fecha: string; // ISO date (YYYY-MM-DD)
  hora: string; // HH:mm
  duracionMin: number;
  estado: EstadoTurno;
  monto: number;
  metodoPago?: MetodoPago;
  notas?: string;
}

export interface Disponibilidad {
  profesionalId: string;
  diaSemana: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo
  horaInicio: string; // HH:mm
  horaFin: string;
}

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  categoria: string;
  imagenUrl?: string;
  proveedor?: string;
  descripcion?: string;
}

export type EstadoPedido = 'pendiente' | 'confirmado' | 'enviado' | 'entregado' | 'cancelado';

export interface ItemPedido {
  productoId: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Pedido {
  id: string;
  compradorId: string;
  fecha: string; // ISO
  estado: EstadoPedido;
  items: ItemPedido[];
  total: number;
  direccionEnvio?: string;
}

export interface CierreCaja {
  mes: number;
  anio: number;
  totalCobrado: number;
  porMetodo: Record<MetodoPago, number>;
  cantidadTurnos: number;
  insumosComprados: number;
  gananciaNeta: number;
}
