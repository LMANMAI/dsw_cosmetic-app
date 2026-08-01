/* ─── Locale actual para formateo (lo setea el LanguageProvider) ─── */
let currentLocale = 'es-AR';
let metodoLabels: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  mercado_pago: 'Mercado Pago',
  mixto: 'Mixto',
  sin_registrar: 'Sin registrar',
};

/** Configura el locale (y etiquetas traducidas) que usan las funciones de formato. */
export function setFormatLocale(locale: string, labels?: Record<string, string>) {
  currentLocale = locale;
  if (labels) metodoLabels = { ...metodoLabels, ...labels };
}

export function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formatea un CUIT/CUIL argentino como XX-XXXXXXXX-X a medida que se escribe.
 * Acepta cualquier entrada y descarta los caracteres no numéricos.
 */
export function formatCuit(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 11);
  const parts = [digits.slice(0, 2), digits.slice(2, 10), digits.slice(10, 11)].filter(Boolean);
  return parts.join('-');
}

/** Valida que un CUIT tenga los 11 dígitos requeridos (sin chequear dígito verificador). */
export function cuitCompleto(input: string): boolean {
  return input.replace(/\D/g, '').length === 11;
}

/**
 * Valida un CUIT/CUIL argentino chequeando el dígito verificador (algoritmo AFIP).
 * Requiere 11 dígitos y que el último coincida con el verificador calculado.
 */
export function cuitValido(input: string): boolean {
  const d = input.replace(/\D/g, '');
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false; // descarta secuencias repetidas (00000000000, etc.)
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 10; i++) suma += Number(d[i]) * pesos[i];
  let verif = 11 - (suma % 11);
  if (verif === 11) verif = 0;
  else if (verif === 10) verif = 9;
  return verif === Number(d[10]);
}

export function formatHora(hhmm: string): string {
  return hhmm;
}

export function formatFecha(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(currentLocale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

/** Convierte una fecha ISO ('2026-08-01') o un Date en objeto Date local. */
function aDate(fecha: string | Date): Date {
  if (fecha instanceof Date) return fecha;
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? new Date(`${fecha}T00:00:00`) : new Date(fecha);
}

/** Pone en mayúscula sólo la primera letra (los meses/días van en minúscula en español). */
export function capitalizar(texto: string): string {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

/**
 * Fecha larga en el idioma activo de la app: "Sábado, 1 de agosto".
 * Nunca usa el locale del dispositivo, que puede estar en otro idioma.
 */
export function formatFechaLarga(fecha: string | Date): string {
  return capitalizar(
    aDate(fecha).toLocaleDateString(currentLocale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  );
}

/** Fecha corta numérica en el idioma activo: "01/08/2026". */
export function formatFechaCorta(fecha: string | Date): string {
  return aDate(fecha).toLocaleDateString(currentLocale);
}

/** Día y mes abreviado en el idioma activo: "01 ago". */
export function formatDiaMes(fecha: string | Date): string {
  return aDate(fecha).toLocaleDateString(currentLocale, { day: '2-digit', month: 'short' });
}

export function nombreMes(mes: number): string {
  return new Date(2024, mes, 1).toLocaleDateString(currentLocale, { month: 'long' });
}

export function metodoPagoLabel(m?: string): string {
  return metodoLabels[m ?? 'sin_registrar'] ?? metodoLabels.sin_registrar;
}
