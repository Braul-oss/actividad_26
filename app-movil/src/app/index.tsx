import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, colores, ESTADOS, EstadoBadge, formatearFecha, ICONOS, Mensaje, Miniatura, Tarjeta } from '../components/ui';
import { mensajeDeError } from '../lib/api';
import { listarReportes, ReporteResumen, ResultadoLista } from '../lib/reportes';
import { esMantenimiento, useSesion } from '../lib/sesion';
import { suscribirEnvios, usePendientes } from '../lib/sincronizacion';

export default function MisReportes() {
  const router = useRouter();
  const margenes = useSafeAreaInsets();
  const { usuario } = useSesion();
  const mantenimiento = esMantenimiento(usuario);
  const pendientes = usePendientes(usuario?.id ?? null);
  const [estado, setEstado] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoLista | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviados, setEnviados] = useState<string[]>([]);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    setError(null);
    try {
      setResultado(await listarReportes(usuario.id, mantenimiento, estado));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, [usuario, mantenimiento, estado]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  useEffect(
    () =>
      suscribirEnvios((folios) => {
        setEnviados(folios);
        cargar();
      }),
    [cargar],
  );

  const renderReporte = ({ item }: { item: ReporteResumen }) => (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/reporte/${item.id}`)}>
      {({ pressed }) => (
        <Tarjeta style={[estilos.fila, pressed && { opacity: 0.8 }]}>
          <Miniatura icono={item.icono} url={item.miniaturaUrl} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={estilos.filaSuperior}>
              <Text style={estilos.folio}>{item.folio}</Text>
              <EstadoBadge estado={item.estado} etiqueta={item.estadoEtiqueta} />
            </View>
            <Text numberOfLines={1} style={estilos.categoria}>
              {item.categoria}
            </Text>
            <Text numberOfLines={1} style={estilos.detalle}>
              📍 {item.ubicacion}
            </Text>
            <Text style={estilos.detalle}>
              🗓️ {formatearFecha(item.creadoEn, true)}
              {item.autor ? `  ·  👤 ${item.autor}` : ''}
            </Text>
          </View>
        </Tarjeta>
      )}
    </Pressable>
  );

  const encabezado = (
    <View style={{ gap: 12, marginBottom: 4 }}>
      <View style={estilos.saludo}>
        <View style={estilos.avatar}>
          <Text style={estilos.avatarTexto}>{usuario?.nombre.charAt(0) ?? '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={estilos.nombre}>{usuario?.nombre}</Text>
          <Text style={estilos.rol}>
            {usuario?.rolEtiqueta} · {usuario?.correo}
          </Text>
        </View>
      </View>

      {enviados.length > 0 ? (
        <Mensaje tipo="exito" titulo="Conexión recuperada">
          {`Se enviaron automáticamente los reportes pendientes: ${enviados.join(', ')}.`}
        </Mensaje>
      ) : null}

      {pendientes.length > 0 ? (
        <Mensaje tipo="aviso" titulo={`${pendientes.length} reporte(s) pendiente(s) de envío`}>
          Se guardaron en el teléfono y se enviarán automáticamente cuando el servicio esté disponible.
        </Mensaje>
      ) : null}
      {pendientes.map((p) => (
        <Tarjeta key={p.datos.claveIdempotencia} style={[estilos.fila, estilos.pendiente]}>
          <Miniatura icono={p.icono} url={p.foto?.uri ?? null} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={estilos.filaSuperior}>
              <Text style={estilos.folio}>Sin folio</Text>
              <EstadoBadge estado="PENDIENTE_ENVIO" etiqueta="Pendiente de envío" />
            </View>
            <Text style={estilos.categoria}>{p.categoria}</Text>
            <Text numberOfLines={1} style={estilos.detalle}>
              📍 {p.ubicacion}
            </Text>
            <Text style={estilos.detalle}>💾 Guardado {formatearFecha(p.guardadoEn, true)}</Text>
          </View>
        </Tarjeta>
      ))}

      {resultado?.desdeCache ? (
        <Mensaje tipo="aviso" titulo="Sin conexión con el servicio">
          {`Se muestra la última lista guardada en el teléfono (actualizada el ${formatearFecha(resultado.actualizado, true)}).`}
        </Mensaje>
      ) : null}
      {error ? <Mensaje tipo="error">{error}</Mensaje> : null}

      <ScrollView contentContainerStyle={{ gap: 8, paddingVertical: 2 }} horizontal showsHorizontalScrollIndicator={false}>
        <Chip activo={estado === null} onPress={() => setEstado(null)} texto="Todos" />
        {ESTADOS.map((e) => (
          <Chip activo={estado === e.valor} key={e.valor} onPress={() => setEstado(e.valor)} texto={e.etiqueta} />
        ))}
      </ScrollView>
      {resultado && !resultado.desdeCache ? (
        <Text style={estilos.contador}>
          {resultado.total} reporte(s) {mantenimiento ? 'registrados en la universidad' : 'registrados por ti'}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ListEmptyComponent={
          cargando ? (
            <ActivityIndicator color={colores.primario} style={{ marginTop: 32 }} />
          ) : !error ? (
            <View style={estilos.vacio}>
              <Text style={{ fontSize: 40 }}>{ICONOS.bulb}</Text>
              <Text style={estilos.vacioTexto}>
                {estado ? 'No hay reportes con este estado.' : 'Aún no has registrado reportes.'}
              </Text>
            </View>
          ) : undefined
        }
        ListHeaderComponent={encabezado}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 110 + margenes.bottom }}
        data={resultado?.reportes ?? []}
        keyExtractor={(r) => String(r.id)}
        refreshControl={<RefreshControl onRefresh={cargar} refreshing={cargando && !!resultado} />}
        renderItem={renderReporte}
      />
      {!mantenimiento ? (
        <Pressable
          accessibilityLabel="Registrar un nuevo reporte"
          accessibilityRole="button"
          onPress={() => router.push('/nuevo')}
          style={({ pressed }) => [estilos.fab, { bottom: 24 + margenes.bottom }, pressed && { opacity: 0.85 }]}
        >
          <Text style={estilos.fabTexto}>＋  Nuevo reporte</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  saludo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { color: colores.primario, fontWeight: '800', fontSize: 18 },
  nombre: { fontSize: 17, fontWeight: '800', color: colores.texto },
  rol: { fontSize: 12, color: colores.secundario },
  fila: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  pendiente: { borderStyle: 'dashed', borderColor: '#E0A93B', borderWidth: 1.5 },
  filaSuperior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  folio: { fontSize: 13, fontWeight: '800', color: colores.primario },
  categoria: { fontSize: 15, fontWeight: '700', color: colores.texto },
  detalle: { fontSize: 12, color: colores.secundario },
  contador: { fontSize: 12, color: colores.secundario },
  vacio: { alignItems: 'center', gap: 8, marginTop: 40 },
  vacioTexto: { color: colores.secundario, fontSize: 15 },
  fab: {
    position: 'absolute',
    right: 16,
    left: 16,
    height: 54,
    borderRadius: 16,
    backgroundColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
