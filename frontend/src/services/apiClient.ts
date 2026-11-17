const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

// Claves de almacenamiento de la sesión (fuente única, también usadas por AuthContext)
export const TOKEN_KEY = 'pasanaku_access_token';
export const REFRESH_KEY = 'pasanaku_refresh_token';
export const USER_KEY = 'pasanaku_user';

/** Evento global emitido cuando la sesión expiró y no se pudo renovar */
export const SESSION_EXPIRED_EVENT = 'pasanaku:session-expired';
export const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Inicia sesión nuevamente.';

// Endpoints de autenticación: un 401 aquí significa credenciales inválidas, no sesión expirada
const AUTH_ENDPOINTS = ['/auth/login/', '/auth/register/', '/auth/token/refresh/'];

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function clearStoredSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

// Promesa compartida: si varias peticiones reciben 401 a la vez, se renueva una sola vez
let refreshPromise: Promise<boolean> | null = null;

/**
 * Intenta obtener un nuevo access token con el refresh token guardado.
 * El backend rota los refresh tokens (ROTATE_REFRESH_TOKENS), así que también se guarda el nuevo.
 */
async function refreshAccessToken(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        });
        if (!response.ok) return false;
        const data = (await response.json()) as { access?: string; refresh?: string };
        if (!data.access) return false;
        localStorage.setItem(TOKEN_KEY, data.access);
        if (data.refresh) localStorage.setItem(REFRESH_KEY, data.refresh);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

function extractErrorMessage(data: Record<string, unknown> | null): string {
  let errorMessage = 'Ha ocurrido un error inesperado';
  if (data) {
    if (typeof data.detail === 'string') {
      errorMessage = data.detail;
    } else if (typeof data.message === 'string') {
      errorMessage = data.message;
    } else if (typeof data === 'object') {
      const firstKey = Object.keys(data)[0];
      const val = data[firstKey];
      if (Array.isArray(val) && val.length > 0) {
        errorMessage = `${firstKey}: ${val[0]}`;
      } else if (typeof val === 'string') {
        errorMessage = `${firstKey}: ${val}`;
      }
    }
  }
  return errorMessage;
}

async function sendRequest(endpoint: string, options: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const token = localStorage.getItem(TOKEN_KEY);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const hadToken = !!localStorage.getItem(TOKEN_KEY);
  const isAuthEndpoint = AUTH_ENDPOINTS.some((p) => path.startsWith(p));

  let response = await sendRequest(path, options);

  // Sesión expirada: renovar el token una vez y repetir la petición original
  if (response.status === 401 && hadToken && !isAuthEndpoint) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await sendRequest(path, options);
    }
    if (response.status === 401) {
      clearStoredSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      throw new ApiError(SESSION_EXPIRED_MESSAGE, 401);
    }
  }

  const contentType = response.headers.get('content-type');
  let data: Record<string, unknown> | null = null;
  if (contentType && contentType.includes('application/json')) {
    data = (await response.json()) as Record<string, unknown>;
  }

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data), response.status, data);
  }

  return data as T;
}
