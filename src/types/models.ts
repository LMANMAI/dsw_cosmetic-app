
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
  fotoSalonUrl?: string; // URL en Cloudinary (obligatoria si modalidad incluye salon)
  latitud?: number;  // geocodificado automáticamente desde dirección + ciudad
  longitud?: number;
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
  | 'pestanas_cejas'
  | 'unas'
  | 'depilacion'
  | 'facial'
  | 'corporal'
  | 'capilar'
  | 'maquillaje'
  | 'barberia'
  | 'estetica_masculina'
  | 'bienestar_spa'
  | 'fitness_salud'
  | 'peluqueria_canina'
  | 'bienestar_animal';

export interface Categoria {
  slug: CategoriaSlug;
  nombre: string;
  emoji: string;
}

/**
 * Servicio del catálogo global (sin precio ni profesionalId).
 * Cada profesional selecciona del catálogo y le asigna su precio y duración.
 */
export interface ServicioCatalogo {
  id: string;
  nombre: string;
  categoria: CategoriaSlug;
  duracionEstimadaMin: number; // sugerida, el profesional puede cambiarla
  genero?: 'femenino' | 'masculino' | 'unisex'; // para filtrar
}

/**
 * Servicio que un profesional eligió del catálogo, con su precio y duración.
 */
export interface ServicioProfesional {
  id: string;
  profesionalId: string;
  catalogoId: string; // ref al ServicioCatalogo
  nombre: string;
  precio: number;
  duracionMin: number;
  categoria: CategoriaSlug;
  activo: boolean;
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
  /** Se pone en true cuando tiene comisión vencida impaga → deja de ser visible. */
  suspendida?: boolean;
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

/** Porcentaje de comisión que cobra la plataforma sobre cada servicio (0-1). */
export const COMISION_PLATAFORMA = 0.20;

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
  /** Monto de comisión que corresponde a la plataforma. */
  comisionPlataforma?: number;
}

export interface Franja {
  horaInicio: string; // HH:mm
  horaFin: string;
}

export interface Disponibilidad {
  profesionalId: string;
  diaSemana: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo
  franjas: Franja[]; // una o más franjas horarias por día
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

export interface DetalleCobro {
  turnoId: string;
  fecha: string;
  clienteNombre: string;
  servicioNombre: string;
  monto: number;
  metodoPago: MetodoPago;
  comision: number; // monto de comisión para la plataforma
  netoProfesional: number; // monto - comisión
}

/* ── Comisión mensual que el profesional debe abonar a la plataforma ── */

export type EstadoComision = 'pendiente' | 'pagada' | 'vencida';

export interface ComisionMensual {
  id: string;
  profesionalId: string;
  mes: number;   // 0-11
  anio: number;
  montoTotal: number;       // suma de comisiones de todos los turnos del mes
  estado: EstadoComision;
  fechaPago?: string;       // ISO date cuando se pagó
  mercadoPagoPreferenceId?: string; // ID de preferencia de MP para el checkout
  mercadoPagoPaymentId?: string;    // ID del pago confirmado en MP
  creadoEn: string;         // ISO datetime
}

export interface CierreCaja {
  mes: number;
  anio: number;
  totalCobrado: number;
  porMetodo: Record<MetodoPago, number>;
  cantidadTurnos: number;
  insumosComprados: number;
  totalComisionPlataforma: number; // suma de comisiones del mes
  comisionMensual?: ComisionMensual; // estado de pago de la comisión
  gananciaNeta: number; // totalCobrado - insumosComprados - totalComisionPlataforma
  detalleCobros: DetalleCobro[];
}
