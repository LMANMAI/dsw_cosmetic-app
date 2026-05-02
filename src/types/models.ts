/**
 * Tipos de dominio — alineados con las entidades del informe.
 * Usuario, Perfil_Profesional, Servicio, Categoría, Turno,
 * Disponibilidad, Producto, Pedido, Item_Pedido.
 */

export type UserRole = 'cliente' | 'profesional' | 'admin';

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
}

export interface PerfilProfesional {
  id: string;
  usuarioId: string;
  nombre: string;
  descripcion: string;
  zona: string;
  latitud: number;
  longitud: number;
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
