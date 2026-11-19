import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Boton,
  Campo,
  Chip,
  colores,
  ESTADOS,
  EstadoBadge,
  formatearFecha,
  ICONOS,
  Mensaje,
  Seccion,
  Tarjeta,
} from '../../components/ui';
import { ErrorApi, mensajeDeError } from '../../lib/api';
import { cambiarEstado, obtenerDetalle, ReporteDetalle } from '../../lib/reportes';
import { esMantenimiento, useSesion } from '../../lib/sesion';

export default function Detalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const margenes = useSafeAreaInsets();
  const { usuario } = useSesion();
  const [reporte, setReporte] = useState<ReporteDetalle | null>(null);
  const [error, setError] = useState<{ texto: string; codigo: number } | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [fotoFallo, setFotoFallo] = useState(false);
  const reproductor = useAudioPlayer(reporte?.notaVozUrl ?? null);
  const reproduccion = useAudioPlayerStatus(reproductor);

  function escucharNota() {
    if (reproduccion.playing) return reproductor.pause();
    if (reproduccion.didJustFinish || (reproduccion.duration > 0 && reproduccion.currentTime >= reproduccion.duration)) {
      reproductor.seekTo(0);
    }
    reproductor.play();
  }

  const cargar = useCallback(
    () =>
      obtenerDetalle(Number(id)).then(
        (r) => {
          setError(null);
          setReporte(r);
          setFotoFallo(false);
        },
        (e) => setError({ texto: mensajeDeError(e), codigo: e instanceof ErrorApi ? e.codigo : 0 }),
      ),
    [id],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardarEstado() {
    if (!nuevoEstado || !reporte) return;
    setGuardando(true);
    setAviso(null);
    try {
      setReporte(await cambiarEstado(reporte.id, nuevoEstado, comentario));
      setAviso('Estado actualizado. Se notificó al autor del reporte.');
      setNuevoEstado(null);
      setComentario('');
    } catch (e) {
      setAviso(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  if (error) {
    return (
      <View style={estilos.contenedor}>
        <Tarjeta style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
          <Text style={{ fontSize: 44 }}>{error.codigo === 403 ? '🔒' : '⚠️'}</Text>
          <Text style={estilos.titulo}>{error.codigo === 403 ? 'Acceso denegado' : 'No se pudo cargar el reporte'}</Text>
          <Text style={estilos.texto}>{error.texto}</Text>
        </Tarjeta>
        <Boton onPress={cargar} titulo="Reintentar" variante="secundario" />
      </View>
    );
  }

  if (!reporte) return <ActivityIndicator color={colores.primario} style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={[estilos.contenedor, { paddingBottom: margenes.bottom + 32 }]}>
      <Tarjeta style={{ gap: 10 }}>
        <View style={estilos.filaSuperior}>
          <Text style={estilos.folio}>{reporte.folio}</Text>
          <EstadoBadge estado={reporte.estado} etiqueta={reporte.estadoEtiqueta} />
        </View>
        <Text style={estilos.titulo}>
          {ICONOS[reporte.icono] ?? '🛠️'} {reporte.categoria}
        </Text>
        <Text style={estilos.dato}>📍 {reporte.ubicacion}</Text>
        <Text style={estilos.dato}>🗓️ Detectado el {formatearFecha(reporte.fechaRegistro)}</Text>
        <Text style={estilos.dato}>🕒 Registrado el {formatearFecha(reporte.creadoEn, true)}</Text>
        <Text style={estilos.dato}>👤 {reporte.autor}</Text>
        {reporte.latitud != null && reporte.longitud != null ? (
          <Text style={estilos.dato} testID="detalle-gps">
            🛰️ GPS {reporte.latitud.toFixed(6)}, {reporte.longitud.toFixed(6)}
            {reporte.precisionMetros != null ? ` (±${Math.round(reporte.precisionMetros)} m)` : ''}
          </Text>
        ) : null}
        <View style={estilos.separador} />
        <Text style={estilos.descripcion}>{reporte.descripcion}</Text>
      </Tarjeta>

      <Seccion titulo="Evidencia fotográfica">
        {reporte.evidenciaUrl && !fotoFallo ? (
          <Image
            accessibilityLabel="Fotografía de evidencia"
            onError={() => setFotoFallo(true)}
            source={{ uri: reporte.evidenciaUrl }}
            style={estilos.foto}
          />
        ) : (
          <Tarjeta style={{ alignItems: 'center' }}>
            <Text style={estilos.texto}>
              {fotoFallo ? 'El enlace temporal de la foto caducó. Actualiza el reporte.' : 'Este reporte no tiene fotografía.'}
            </Text>
          </Tarjeta>
        )}
        {reporte.evidenciaUrl ? <Text style={estilos.ayuda}>🔐 Enlace firmado y temporal (caduca en 10 minutos).</Text> : null}
      </Seccion>

      {reporte.latitud != null && reporte.longitud != null ? (
        <Boton
          onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${reporte.latitud},${reporte.longitud}`)}
          titulo="🗺️  Ver ubicación en el mapa"
          variante="secundario"
        />
      ) : null}

      {reporte.notaVozUrl ? (
        <Seccion titulo="Nota de voz">
          <Boton onPress={escucharNota} titulo={reproduccion.playing ? '⏸  Pausar nota de voz' : '▶  Escuchar nota de voz'} variante="secundario" />
        </Seccion>
      ) : null}

      <Seccion titulo="Seguimiento">
        <Tarjeta style={{ gap: 0 }}>
          {reporte.historial.map((h, i) => (
            <View key={`${h.fecha}-${i}`} style={estilos.paso}>
              <View style={estilos.linea}>
                <View style={[estilos.punto, i === reporte.historial.length - 1 && { backgroundColor: colores.primario }]} />
                {i < reporte.historial.length - 1 ? <View style={estilos.conector} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: 14, gap: 2 }}>
                <Text style={estilos.pasoTitulo}>{h.estadoEtiqueta}</Text>
                <Text style={estilos.ayuda}>
                  {formatearFecha(h.fecha, true)} · {h.responsable}
                </Text>
                {h.comentario ? <Text style={estilos.dato}>{h.comentario}</Text> : null}
              </View>
            </View>
          ))}
        </Tarjeta>
      </Seccion>

      {esMantenimiento(usuario) ? (
        <Seccion titulo="Actualizar estado (mantenimiento)">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ESTADOS.filter((e) => e.valor !== reporte.estado).map((e) => (
              <Chip activo={nuevoEstado === e.valor} key={e.valor} onPress={() => setNuevoEstado(e.valor)} texto={e.etiqueta} />
            ))}
          </View>
          <Campo
            etiqueta="Comentario"
            maxLength={300}
            multiline
            onChangeText={setComentario}
            placeholder="Ejemplo: se reemplazaron las lámparas."
            value={comentario}
          />
          {aviso ? <Mensaje tipo={aviso.startsWith('Estado') ? 'exito' : 'error'}>{aviso}</Mensaje> : null}
          <Boton cargando={guardando} deshabilitado={!nuevoEstado} onPress={guardarEstado} titulo="Guardar estado" />
        </Seccion>
      ) : null}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 16, gap: 18 },
  filaSuperior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  folio: { fontSize: 15, fontWeight: '800', color: colores.primario },
  titulo: { fontSize: 19, fontWeight: '800', color: colores.texto, textAlign: 'left' },
  texto: { fontSize: 14, color: colores.secundario, textAlign: 'center', lineHeight: 20 },
  dato: { fontSize: 14, color: colores.secundario },
  descripcion: { fontSize: 15, color: colores.texto, lineHeight: 22 },
  separador: { height: 1, backgroundColor: colores.borde, marginVertical: 2 },
  foto: { width: '100%', height: 220, borderRadius: 14, backgroundColor: colores.borde },
  ayuda: { fontSize: 12, color: colores.secundario },
  paso: { flexDirection: 'row', gap: 12 },
  linea: { alignItems: 'center', width: 14 },
  punto: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#9DB6C8', marginTop: 4 },
  conector: { flex: 1, width: 2, backgroundColor: colores.borde, marginTop: 2 },
  pasoTitulo: { fontSize: 15, fontWeight: '700', color: colores.texto },
});
