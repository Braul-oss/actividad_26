// La app solo conoce la dirección de la API. Las credenciales con privilegios viven en el servidor.
const url = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8095';

export const API_URL = url.replace(/\/+$/, '');

/** Tiempo máximo de espera de cada solicitud antes de considerar que el servicio no está disponible. */
export const TIEMPO_ESPERA_MS = 15_000;

/** En producción solo se permite HTTPS; en desarrollo se acepta localhost. */
export const conexionSegura =
  API_URL.startsWith('https://') || /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/.test(API_URL);
