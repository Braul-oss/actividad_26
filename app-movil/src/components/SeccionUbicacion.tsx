import { useState } from 'react';
import { Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Location as LocationNext } from 'expo-location/next';
import { abrirAjustes, InfoPermiso, permitido, solicitarPermiso } from '../lib/permisos';
import { AvisoPermiso } from './AvisoPermiso';
import { Boton, colores, Mensaje, Seccion, Tarjeta } from './ui';

export type Coordenadas = { latitud: number; longitud: number; precisionMetros: number | null; aproximada: boolean };

const esperar = (ms: number) => new Promise<null>((r) => setTimeout(() => r(null), ms));

type Lectura = { latitud: number; longitud: number; precisionMetros: number | null };

/**
 * Lee la posición actual. El API clásico usa Google Play services; si el teléfono no los tiene
 * (p. ej. equipos Huawei o emuladores sin Google APIs) falla, y entonces se usa el proveedor de
 * expo-location/next, que recurre al LocationManager de Android. Solo se ejecuta con el permiso concedido.
 */
async function leerPosicion(): Promise<Lectura | null> {
  try {
    const p =
      (await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), esperar(15000)])) ??
      (await Location.getLastKnownPositionAsync());
    if (p) return { latitud: p.coords.latitude, longitud: p.coords.longitude, precisionMetros: p.coords.accuracy ?? null };
  } catch {
    // Sin Google Play services: se intenta con el proveedor de Android.
  }
  const r = await LocationNext.getPosition({ timeout: 15000 });
  return r ? { latitud: r.coordinates.latitude, longitud: r.coordinates.longitude, precisionMetros: r.horizontalAccuracy } : null;
}

/** Ubicación GPS opcional. El permiso se pide solo al pulsar "Agregar mi ubicación". */
export function SeccionUbicacion({ valor, alCambiar }: { valor: Coordenadas | null; alCambiar: (c: Coordenadas | null) => void }) {
  const [permiso, setPermiso] = useState<InfoPermiso | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function obtener() {
    setError(null);
    setCargando(true);
    try {
      const p = await solicitarPermiso('ubicacion');
      setPermiso(p);
      if (!permitido(p)) return;
      if (!(await Location.hasServicesEnabledAsync())) {
        setError('La ubicación del teléfono está desactivada. Actívala en el panel de ajustes rápidos y vuelve a intentarlo.');
        return;
      }
      const pos = await leerPosicion();
      if (!pos) {
        setError('No fue posible obtener la ubicación. Intenta de nuevo cerca de una ventana.');
        return;
      }
      alCambiar({ ...pos, aproximada: p.estado === 'aproximado' });
    } catch {
      setError('No fue posible obtener la ubicación.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Seccion titulo="6. Ubicación GPS (opcional)">
      {valor ? (
        <Tarjeta style={{ gap: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colores.texto }} testID="coordenadas">
            📍 {valor.latitud.toFixed(6)}, {valor.longitud.toFixed(6)}
          </Text>
          <Text style={{ fontSize: 13, color: colores.secundario }}>
            Precisión: ±{valor.precisionMetros != null ? Math.round(valor.precisionMetros) : '?'} m
            {valor.aproximada ? ' · ubicación aproximada' : ' · ubicación precisa'}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Boton cargando={cargando} onPress={obtener} titulo="Actualizar" variante="texto" />
            <Boton onPress={() => alCambiar(null)} titulo="Quitar" variante="texto" />
          </View>
        </Tarjeta>
      ) : (
        <Boton cargando={cargando} onPress={obtener} titulo="📍  Agregar mi ubicación actual" variante="secundario" />
      )}
      {valor?.aproximada ? (
        <Mensaje tipo="aviso" titulo="Ubicación aproximada">
          Solo autorizaste la ubicación aproximada (±1-3 km). El reporte se puede enviar, pero para ubicar el aula conviene
          activar “Usar ubicación precisa” en Ajustes.
        </Mensaje>
      ) : null}
      {valor?.aproximada ? <Boton onPress={abrirAjustes} titulo="Abrir ajustes" variante="texto" /> : null}
      {permiso && !permitido(permiso) ? (
        <AvisoPermiso
          alReintentar={obtener}
          alternativa="Puedes enviar el reporte sin coordenadas: el edificio y el aula seleccionados son suficientes."
          permiso={permiso}
          recurso="ubicacion"
        />
      ) : null}
      {error ? <Mensaje tipo="error">{error}</Mensaje> : null}
      <Text style={{ color: colores.secundario, fontSize: 12 }}>
        Solo se lee la ubicación en el momento en que pulsas el botón; la app nunca la consulta en segundo plano.
      </Text>
    </Seccion>
  );
}
