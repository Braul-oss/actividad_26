// Punto único para consultar y solicitar los permisos de la app.
// Regla: los permisos se SOLICITAN solo cuando el usuario pulsa la función que los necesita
// (tomar foto, agregar ubicación, grabar nota). Esta pantalla y el formulario solo los CONSULTAN.
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';

export type Recurso = 'camara' | 'ubicacion' | 'microfono';

export type EstadoPermiso =
  /** Concedido por completo. */
  | 'concedido'
  /** Ubicación concedida solo como aproximada (Android 12+ / iOS 14+). */
  | 'aproximado'
  /** Todavía no se ha preguntado al usuario. */
  | 'sin-solicitar'
  /** Rechazado, pero el sistema permite volver a preguntar. */
  | 'denegado'
  /** Rechazado de forma permanente: solo se puede cambiar desde Ajustes. */
  | 'bloqueado'
  /** No aplica en esta plataforma (web). */
  | 'no-aplica';

export type InfoPermiso = { estado: EstadoPermiso; puedePreguntar: boolean };

type Respuesta = {
  status: string;
  granted: boolean;
  canAskAgain: boolean;
  android?: { accuracy?: string };
  ios?: { accuracy?: string };
};

export const RECURSOS: Record<
  Recurso,
  { nombre: string; icono: string; funcion: string; permisoAndroid: string; claveIos: string; motivo: string }
> = {
  camara: {
    nombre: 'Cámara',
    icono: '📷',
    funcion: 'Tomar la fotografía de la falla',
    permisoAndroid: 'CAMERA',
    claveIos: 'NSCameraUsageDescription',
    motivo: 'Se necesita la cámara para fotografiar la falla que vas a reportar.',
  },
  ubicacion: {
    nombre: 'Ubicación (en uso)',
    icono: '📍',
    funcion: 'Agregar las coordenadas GPS al reporte',
    permisoAndroid: 'ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION',
    claveIos: 'NSLocationWhenInUseUsageDescription',
    motivo: 'Se necesita tu ubicación para que mantenimiento encuentre el lugar exacto de la falla.',
  },
  microfono: {
    nombre: 'Micrófono',
    icono: '🎙️',
    funcion: 'Grabar una nota de voz como evidencia',
    permisoAndroid: 'RECORD_AUDIO',
    claveIos: 'NSMicrophoneUsageDescription',
    motivo: 'Se necesita el micrófono para grabar la nota de voz que describe la falla.',
  },
};

export function interpretar(r: Respuesta, recurso: Recurso): InfoPermiso {
  if (r.granted) {
    const aproximada = recurso === 'ubicacion' && (r.android?.accuracy === 'coarse' || r.ios?.accuracy === 'reduced');
    return { estado: aproximada ? 'aproximado' : 'concedido', puedePreguntar: r.canAskAgain };
  }
  if (r.status === 'undetermined') return { estado: 'sin-solicitar', puedePreguntar: true };
  return { estado: r.canAskAgain ? 'denegado' : 'bloqueado', puedePreguntar: r.canAskAgain };
}

const NO_APLICA: InfoPermiso = { estado: 'no-aplica', puedePreguntar: false };

/** Consulta el estado SIN mostrar el diálogo del sistema. */
export async function consultarPermiso(recurso: Recurso): Promise<InfoPermiso> {
  if (Platform.OS === 'web') return NO_APLICA;
  const r =
    recurso === 'camara'
      ? await ImagePicker.getCameraPermissionsAsync()
      : recurso === 'ubicacion'
        ? await Location.getForegroundPermissionsAsync()
        : await getRecordingPermissionsAsync();
  return interpretar(r, recurso);
}

/**
 * Muestra el diálogo del sistema (si el sistema todavía lo permite) y devuelve el resultado.
 * Si el permiso está bloqueado, Android/iOS responden de inmediato sin mostrar nada.
 */
export async function solicitarPermiso(recurso: Recurso): Promise<InfoPermiso> {
  if (Platform.OS === 'web') return NO_APLICA;
  const r =
    recurso === 'camara'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : recurso === 'ubicacion'
        ? await Location.requestForegroundPermissionsAsync()
        : await requestRecordingPermissionsAsync();
  return interpretar(r, recurso);
}

export const permitido = (p: InfoPermiso | null) => p?.estado === 'concedido' || p?.estado === 'aproximado';

/** Abre la pantalla de ajustes de la app para que el usuario cambie un permiso bloqueado. */
export function abrirAjustes() {
  return Linking.openSettings();
}

async function leerTodos(): Promise<Record<Recurso, InfoPermiso>> {
  const [camara, ubicacion, microfono] = await Promise.all([
    consultarPermiso('camara'),
    consultarPermiso('ubicacion'),
    consultarPermiso('microfono'),
  ]);
  return { camara, ubicacion, microfono };
}

/**
 * Estado de los tres permisos. Se vuelve a consultar cada vez que la app regresa al primer
 * plano, porque el usuario pudo cambiarlos (o revocarlos) desde Ajustes.
 */
export function usePermisos() {
  const [permisos, setPermisos] = useState<Record<Recurso, InfoPermiso> | null>(null);

  const actualizar = useCallback(() => leerTodos().then(setPermisos), []);

  useEffect(() => {
    let activo = true;
    const leer = () =>
      leerTodos().then((p) => {
        if (activo) setPermisos(p);
      });
    leer();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') leer();
    });
    return () => {
      activo = false;
      sub.remove();
    };
  }, []);

  return { permisos, actualizar };
}

export const ETIQUETAS_ESTADO: Record<EstadoPermiso, { texto: string; color: string; fondo: string }> = {
  concedido: { texto: 'Autorizado', color: '#13703F', fondo: '#E2F3E9' },
  aproximado: { texto: 'Autorizado (aproximada)', color: '#7A4F00', fondo: '#FFF1D2' },
  'sin-solicitar': { texto: 'Sin solicitar', color: '#4B5563', fondo: '#ECEEF1' },
  denegado: { texto: 'Denegado', color: '#B3261E', fondo: '#FBEAE9' },
  bloqueado: { texto: 'Bloqueado', color: '#B3261E', fondo: '#FBEAE9' },
  'no-aplica': { texto: 'No aplica en web', color: '#4B5563', fondo: '#ECEEF1' },
};
