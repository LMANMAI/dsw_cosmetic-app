
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
  nombreNegocio?: string; // nombre visible para los clientes
  descripcion?: string;   // bio o descripción del negocio
  sitioWeb?: string;       // URL del sitio web o link de contacto
  telefonoContacto?: string; // teléfono público del negocio (puede diferir del personal)
  perfilVisible?: boolean;    // si false, no aparece en búsquedas de clientes
  autoConfirmarTurnos?: boolean; // si true, los turnos se confirman sin revisión manual
  anticipoPorcentaje?: 0 | 20 | 50 | 100; // porcentaje de anticipo que se pide al reservar
  /** Comisión personalizada (0-100). Si falta, se usa la global de config/plataforma. */
  comisionPorcentaje?: number;
  /** Premio de competencia: hasta esta fecha (YYYY-MM-DD) no paga comisión. */
  comisionExentaHasta?: string;
}

export interface PerfilProveedor {
  razonSocial: string;
  cuit: string;
  rubro: string; // p. ej. "Insumos para uñas"
  ciudad: string;
  direccion?: string; // dirección exacta seleccionada en el autocomplete
  latitud?: number;
  longitud?: number;

  // Preferencias de ventas y envíos (default: ver PREFERENCIAS_PROVEEDOR_DEFAULT)
  aceptaPedidos?: boolean;   // si false, no aparece en búsquedas / no recibe pedidos
  envioPropio?: boolean;     // el proveedor entrega sus pedidos
  retiroLocal?: boolean;     // permite retiro en el local
  // Notificaciones
  notifPush?: boolean;       // push por nuevos pedidos y mensajes
  emailPedidos?: boolean;    // email por cada pedido
}

/** Valores por defecto de las preferencias del proveedor. */
export const PREFERENCIAS_PROVEEDOR_DEFAULT = {
  aceptaPedidos: true,
  envioPropio: true,
  retiroLocal: false,
  notifPush: true,
  emailPedidos: true,
} as const;

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

/** Anticipación del recordatorio de turnos. 'off' = sin recordatorio. */
export type RecordatorioTurnos = '30m' | '1h' | '2h' | '24h' | 'off';

export interface PreferenciasNotificaciones {
  pushEnabled: boolean;
  recordatorioTurnos: RecordatorioTurnos;
}

/** Dirección guardada por el usuario (p. ej. casa, trabajo). */
export interface Direccion {
  id: string;
  etiqueta: string; // "Casa", "Trabajo", etc.
  direccion: string;
  ciudad: string;
  latitud?: number;
  longitud?: number;
  notas?: string; // piso, depto, indicaciones
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: UserRole;
  avatarUrl?: string;
  perfil?: PerfilCliente | PerfilProfesionalSignup | PerfilProveedor;
  direcciones?: Direccion[];
  preferencias?: PreferenciasNotificaciones;
  mpConectado?: boolean; // true si conectó su cuenta de Mercado Pago (OAuth)
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
  autoConfirmarTurnos?: boolean;
  anticipoPorcentaje?: 0 | 20 | 50 | 100;
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
  | 'pendiente_pago'
  | 'pendiente'
  | 'confirmado'
  | 'completado'
  | 'cancelado'
  | 'no_asistio';

export type MetodoPago = 'efectivo' | 'transferencia' | 'mercado_pago' | 'mixto';

/**
 * Porcentaje de comisión por defecto (0-1). Es solo el FALLBACK:
 * el valor real se lee de Firestore config/plataforma.comisionPorcentaje
 * (editable desde el panel admin) vía configService.
 */
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
  montoSena?: number;          // monto de la seña/anticipo
  senaPagada?: boolean;        // true cuando se pagó la seña por MercadoPago
  /** true si el profesional auto-confirma; lo usa el webhook al acreditar la seña. */
  autoConfirmar?: boolean;
  metodoPago?: MetodoPago;
  notas?: string;
  /** Monto de comisión que corresponde a la plataforma. */
  comisionPlataforma?: number;
  /** Anticipación del recordatorio que se le envía al cliente para este turno. */
  recordatorioCliente?: '1h' | '2h' | '24h' | 'off';
  /** true cuando la Cloud Function ya envió el recordatorio push (para no repetir). */
  recordatorioEnviado?: boolean;
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

/** Forma de entrega que ofrece el proveedor para un pedido. */
export type MetodoEntrega = 'envio' | 'retiro';

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  categoria: string;
  imagenUrl?: string;
  proveedorId: string;       // uid del proveedor dueño del producto
  proveedorNombre?: string;  // razón social / nombre visible del comercio
  descripcion?: string;
  // Opciones de entrega del proveedor (denormalizadas para mostrar en la tienda)
  entregaEnvio?: boolean;    // el proveedor hace envío propio
  entregaRetiro?: boolean;   // se puede retirar en el local
}

export type EstadoPedido =
  | 'pendiente_pago' // creado, esperando que el comprador complete el pago
  | 'pendiente'      // pagado, esperando que el proveedor lo confirme
  | 'confirmado'
  | 'enviado'
  | 'entregado'
  | 'cancelado';

export interface ItemPedido {
  productoId: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
}

/** Cómo viaja el pedido: envío propio del proveedor o por un correo. */
export type MetodoEnvio = 'propio' | 'correo';

export interface InfoEnvio {
  metodo: MetodoEnvio;
  correo?: string;          // nombre del correo (Correo Argentino, Andreani, OCA, etc.)
  nroSeguimiento?: string;  // código de tracking
  mensaje?: string;         // mensaje del proveedor para el comprador
  fechaEnvio?: string;      // ISO datetime en que se marcó como enviado
}

export interface Pedido {
  id: string;
  compradorId: string;             // uid de quien compra (profesional o cliente)
  compradorNombre?: string;        // nombre visible del comprador (para el panel del proveedor)
  compradorRol?: UserRole;         // rol de quien compra (profesional | cliente)
  proveedorId: string;             // uid del proveedor al que pertenece el pedido
  proveedorNombre?: string;        // razón social / nombre visible del proveedor
  fecha: string; // ISO
  estado: EstadoPedido;
  items: ItemPedido[];
  total: number;
  direccionEnvio?: string;
  metodoEntrega?: MetodoEntrega;   // cómo eligió recibirlo el comprador
  direccionRetiro?: string;        // dirección del local (se completa al pagarse, si es retiro)
  envio?: InfoEnvio;               // datos de envío (se cargan al marcar 'enviado')
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

/* ── Valoraciones / Reputación ── */

export interface Valoracion {
  id: string;
  profesionalId: string;
  clienteId: string;
  clienteNombre: string;
  turnoId: string;
  puntuacion: 1 | 2 | 3 | 4 | 5;
  comentario?: string;
  fecha: string; // ISO date
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
