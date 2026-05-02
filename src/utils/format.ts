export function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
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
