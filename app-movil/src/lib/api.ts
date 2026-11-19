import { API_URL, TIEMPO_ESPERA_MS } from './config';
import { borrarSeguro, guardarSeguro, leerSeguro } from './almacenSeguro';

const CLAVE_ACCESS = 'reportes.accessToken';
const CLAVE_REFRESH = 'reportes.refreshToken';
const CLAVE_EXPIRA = 'reportes.expira';
const CLAVE_USUARIO = 'reportes.usuario';

export type Usuario = { id: number; nombre: string; correo: string; rol: string; rolEtiqueta: string };

/** Error con un mensaje apto para mostrarse al usuario. */
export class ErrorApi extends Error {
  constructor(
    message: string,
    public codigo: number,
    /** true cuando no hubo respuesta: sin internet, tiempo agotado o servicio caído. */
    public sinServicio = false,
    public campos?: Record<string, string>,
  ) {
    super(message);
  }
}

export const MENSAJE_SIN_SERVICIO = 'No fue posible conectar con el servicio. Revisa tu conexión a internet.';

let alExpirarSesion: (() => void) | null = null;
export function registrarAlExpirar(fn: (() => void) | null) {
  alExpirarSesion = fn;
}

// ------------------------------------------------------------------ sesión

export async function guardarSesion(r: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  usuario: Usuario;
}) {
  await guardarSeguro(CLAVE_ACCESS, r.accessToken);
  await guardarSeguro(CLAVE_REFRESH, r.refreshToken);
  await guardarSeguro(CLAVE_EXPIRA, String(Date.now() + r.expiresIn * 1000));
  // Solo datos públicos del perfil; la contraseña nunca se guarda.
  await guardarSeguro(CLAVE_USUARIO, JSON.stringify(r.usuario));
}

export async function leerUsuarioGuardado(): Promise<Usuario | null> {
  const refresh = await leerSeguro(CLAVE_REFRESH);
  const usuario = await leerSeguro(CLAVE_USUARIO);
  if (!refresh || !usuario) return null;
  try {
    return JSON.parse(usuario) as Usuario;
  } catch {
    return null;
  }
}

export async function borrarSesion() {
  await Promise.all([CLAVE_ACCESS, CLAVE_REFRESH, CLAVE_EXPIRA, CLAVE_USUARIO].map(borrarSeguro));
}

export async function obtenerRefresh() {
  return leerSeguro(CLAVE_REFRESH);
}

let renovando: Promise<string | null> | null = null;

/** Pide un nuevo token de acceso con el token de renovación, sin volver a pedir la contraseña. */
async function renovarToken(): Promise<string | null> {
  if (!renovando) {
    renovando = (async () => {
      const refreshToken = await leerSeguro(CLAVE_REFRESH);
      if (!refreshToken) return null;
      const r = await solicitudCruda('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
      if (!r.ok) {
        if (r.status === 401) return null;
        throw await aError(r);
      }
      const datos = (await r.json()) as { accessToken: string; expiresIn: number };
      await guardarSeguro(CLAVE_ACCESS, datos.accessToken);
      await guardarSeguro(CLAVE_EXPIRA, String(Date.now() + datos.expiresIn * 1000));
      return datos.accessToken;
    })().finally(() => {
      renovando = null;
    });
  }
  return renovando;
}

/** Devuelve un token vigente; si está por vencer (menos de 60 s), lo renueva antes de usarlo. */
async function tokenVigente(): Promise<string | null> {
  const token = await leerSeguro(CLAVE_ACCESS);
  const expira = Number((await leerSeguro(CLAVE_EXPIRA)) ?? 0);
  if (token && Date.now() < expira - 60_000) return token;
  return renovarToken();
}

// ------------------------------------------------------------------ HTTP

async function solicitudCruda(ruta: string, init: RequestInit): Promise<Response> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_ESPERA_MS);
  const encabezados: Record<string, string> = { Accept: 'application/json', ...(init.headers as Record<string, string>) };
  if (typeof init.body === 'string') encabezados['Content-Type'] = 'application/json';
  try {
    return await fetch(`${API_URL}${ruta}`, { ...init, headers: encabezados, signal: control.signal });
  } catch {
    // Sin internet, tiempo de espera agotado o servicio caído: no hubo respuesta.
    throw new ErrorApi(MENSAJE_SIN_SERVICIO, 0, true);
  } finally {
    clearTimeout(temporizador);
  }
}

async function aError(r: Response): Promise<ErrorApi> {
  let mensaje = 'Ocurrió un problema en el servicio. Intenta más tarde.';
  let campos: Record<string, string> | undefined;
  try {
    const cuerpo = await r.json();
    if (typeof cuerpo?.error === 'string') mensaje = cuerpo.error;
    if (cuerpo?.campos) campos = cuerpo.campos;
  } catch {
    // Respuesta sin JSON (por ejemplo, un proxy caído): se muestra el mensaje genérico.
  }
  if (r.status >= 500) {
    return new ErrorApi('El servicio no está disponible en este momento. Intenta más tarde.', r.status, true);
  }
  return new ErrorApi(mensaje, r.status, false, campos);
}

/** Solicitud autenticada: agrega Authorization: Bearer y reintenta una vez si el token venció. */
export async function solicitar<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  let token = await tokenVigente();
  if (!token) {
    alExpirarSesion?.();
    throw new ErrorApi('Tu sesión expiró. Inicia sesión de nuevo.', 401);
  }
  const conToken = (t: string) => ({ ...init, headers: { ...(init.headers as object), Authorization: `Bearer ${t}` } });
  let r = await solicitudCruda(ruta, conToken(token));
  if (r.status === 401) {
    token = await renovarToken();
    if (!token) {
      alExpirarSesion?.();
      throw new ErrorApi('Tu sesión expiró. Inicia sesión de nuevo.', 401);
    }
    r = await solicitudCruda(ruta, conToken(token));
  }
  if (!r.ok) throw await aError(r);
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}

/** Solicitud pública (solo el inicio de sesión). */
export async function solicitarPublico<T>(ruta: string, body: unknown): Promise<T> {
  const r = await solicitudCruda(ruta, { method: 'POST', body: JSON.stringify(body) });
  if (!r.ok) throw await aError(r);
  return (await r.json()) as T;
}

export function mensajeDeError(e: unknown): string {
  if (e instanceof ErrorApi) return e.message;
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
