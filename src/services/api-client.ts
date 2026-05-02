import Constants from 'expo-constants';

/**
 * Cliente HTTP base.
 * Cuando el backend esté listo, esto se conecta a Railway/Render.
 * Hoy, los servicios resuelven con datos mock.
 */
export const API_BASE_URL: string =
  (Constants.expoConfig?.extra as Record<string, string> | undefined)?.apiBaseUrl ??
  'https://api.beautyapp.local';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Simula latencia de red para que la UI muestre estados de carga reales. */
export const fakeDelay = (ms = 350) => new Promise((res) => setTimeout(res, ms));

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    throw new ApiError(res.status, `HTTP ${res.status} en ${path}`);
  }
  return (await res.json()) as T;
}
