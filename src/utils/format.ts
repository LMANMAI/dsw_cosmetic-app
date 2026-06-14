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
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

export function nombreMes(mes: number): string {
  return new Date(2024, mes, 1).toLocaleDateString('es-AR', { month: 'long' });
}

export function metodoPagoLabel(m?: string): string {
  switch (m) {
    case 'efectivo':
      return 'Efectivo';
    case 'transferencia':
      return 'Transferencia';
    case 'mercado_pago':
      return 'Mercado Pago';
    case 'mixto':
      return 'Mixto';
    default:
      return 'Sin registrar';
  }
}
