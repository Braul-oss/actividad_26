import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import {
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { InfoPermiso, permitido, solicitarPermiso } from '../lib/permisos';
import { leerBytes } from '../lib/plataforma';
import type { NotaVoz } from '../lib/reportes';
import { formatearTamano } from '../lib/validacion';
import { AvisoPermiso } from './AvisoPermiso';
import { Boton, colores, Mensaje, Seccion, Tarjeta } from './ui';

export const DURACION_MAXIMA_MS = 60_000;
export const TAMANO_MAXIMO_AUDIO = 2 * 1024 * 1024;

const segundos = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Contenedor MPEG-4 (M4A): los bytes 4-7 son "ftyp". */
const esM4a = (b: Uint8Array) => b.length >= 8 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70;

/** Nota de voz opcional. El micrófono se pide solo al pulsar "Grabar" y se libera al detener. */
export function SeccionNotaVoz({ nota, alCambiar }: { nota: NotaVoz | null; alCambiar: (n: NotaVoz | null) => void }) {
  const grabadora = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const estado = useAudioRecorderState(grabadora, 250);
  const reproductor = useAudioPlayer(nota?.uri ?? null);
  const reproduccion = useAudioPlayerStatus(reproductor);
  const [permiso, setPermiso] = useState<InfoPermiso | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deteniendo = useRef(false);
  const limite = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (limite.current) clearTimeout(limite.current);
    },
    [],
  );

  async function grabar() {
    setError(null);
    const p = await solicitarPermiso('microfono');
    setPermiso(p);
    if (!permitido(p)) return;
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await grabadora.prepareToRecordAsync();
      grabadora.record();
      // Límite de 60 s para que la nota no exceda el tamaño permitido.
      limite.current = setTimeout(detener, DURACION_MAXIMA_MS);
    } catch {
      setError('No fue posible iniciar la grabación.');
    }
  }

  async function detener() {
    if (deteniendo.current) return;
    deteniendo.current = true;
    if (limite.current) clearTimeout(limite.current);
    const duracionMs = grabadora.getStatus().durationMillis;
    try {
      await grabadora.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = grabadora.uri;
      if (!uri) throw new Error('sin archivo');
      const bytes = await leerBytes(uri);
      if (!esM4a(bytes)) throw new Error('formato');
      if (bytes.length > TAMANO_MAXIMO_AUDIO) {
        setError(`La nota pesa ${formatearTamano(bytes.length)}. El máximo es 2 MB.`);
        return;
      }
      alCambiar({ uri, duracionMs, tamano: bytes.length });
    } catch {
      setError('No fue posible guardar la nota de voz.');
    } finally {
      deteniendo.current = false;
    }
  }

  function reproducir() {
    if (reproduccion.playing) {
      reproductor.pause();
      return;
    }
    if (reproduccion.didJustFinish || reproduccion.currentTime >= reproduccion.duration) reproductor.seekTo(0);
    reproductor.play();
  }

  return (
    <Seccion titulo="7. Nota de voz (opcional, máx. 60 s)">
      {estado.isRecording ? (
        <Tarjeta style={{ gap: 8, alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colores.error }} testID="grabando">
            🔴 Grabando… {segundos(estado.durationMillis)} / 1:00
          </Text>
          <Boton onPress={detener} titulo="⏹  Detener grabación" />
        </Tarjeta>
      ) : nota ? (
        <Tarjeta style={{ gap: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colores.texto }} testID="nota-lista">
            🎙️ Nota de voz · {segundos(nota.duracionMs)} · {formatearTamano(nota.tamano)}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Boton onPress={reproducir} titulo={reproduccion.playing ? '⏸  Pausar' : '▶  Escuchar'} variante="texto" />
            <Boton onPress={() => alCambiar(null)} titulo="Quitar" variante="texto" />
          </View>
        </Tarjeta>
      ) : (
        <Boton onPress={grabar} titulo="🎙️  Grabar nota de voz" variante="secundario" />
      )}
      {permiso && !permitido(permiso) ? (
        <AvisoPermiso
          alReintentar={grabar}
          alternativa="También puedes describir la falla por escrito en el paso 3."
          permiso={permiso}
          recurso="microfono"
        />
      ) : null}
      {error ? <Mensaje tipo="error">{error}</Mensaje> : null}
    </Seccion>
  );
}
