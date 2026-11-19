import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, colores, Mensaje, Tarjeta } from '../components/ui';
import { abrirAjustes, ETIQUETAS_ESTADO, Recurso, RECURSOS, usePermisos } from '../lib/permisos';

const ORDEN: Recurso[] = ['camara', 'ubicacion', 'microfono'];

/**
 * Muestra el estado real de cada permiso (consultado al sistema, sin solicitarlo).
 * Se actualiza solo al volver desde Ajustes, así se comprueba la revocación.
 */
export default function Permisos() {
  const margenes = useSafeAreaInsets();
  const { permisos, actualizar } = usePermisos();

  return (
    <ScrollView contentContainerStyle={[estilos.contenedor, { paddingBottom: margenes.bottom + 24 }]}>
      <Mensaje tipo="info" titulo="¿Cuándo se piden los permisos?">
        Cada permiso se solicita solo cuando usas la función que lo necesita. Si lo rechazas, el reporte se puede enviar
        igual sin esa evidencia.
      </Mensaje>

      {ORDEN.map((r) => {
        const info = RECURSOS[r];
        const p = permisos?.[r];
        const etiqueta = p ? ETIQUETAS_ESTADO[p.estado] : null;
        return (
          <Tarjeta key={r} style={{ gap: 6 }}>
            <View style={estilos.fila}>
              <Text style={estilos.titulo}>
                {info.icono} {info.nombre}
              </Text>
              {etiqueta ? (
                <View style={[estilos.badge, { backgroundColor: etiqueta.fondo }]} testID={`estado-${r}`}>
                  <Text style={{ color: etiqueta.color, fontWeight: '700', fontSize: 12 }}>{etiqueta.texto}</Text>
                </View>
              ) : null}
            </View>
            <Text style={estilos.texto}>Función: {info.funcion}</Text>
            <Text style={estilos.codigo}>Android: {info.permisoAndroid}</Text>
            <Text style={estilos.codigo}>iOS: {info.claveIos}</Text>
          </Tarjeta>
        );
      })}

      <Tarjeta style={{ gap: 6 }}>
        <View style={estilos.fila}>
          <Text style={estilos.titulo}>🖼️ Fotos existentes</Text>
          <View style={[estilos.badge, { backgroundColor: '#E2EEFA' }]}>
            <Text style={{ color: '#0B5394', fontWeight: '700', fontSize: 12 }}>No requiere permiso</Text>
          </View>
        </View>
        <Text style={estilos.texto}>
          Función: adjuntar una foto ya tomada. Se usa el selector de fotos del sistema, que entrega a la app solo la imagen
          elegida; por eso no se declara READ_MEDIA_IMAGES ni acceso a toda la galería.
        </Text>
      </Tarjeta>

      <Boton onPress={abrirAjustes} titulo="Abrir ajustes de la app" variante="secundario" />
      <Boton onPress={actualizar} titulo="Actualizar estado" variante="texto" />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 16, gap: 14 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  titulo: { fontSize: 16, fontWeight: '800', color: colores.texto, flexShrink: 1 },
  texto: { fontSize: 14, color: colores.secundario, lineHeight: 20 },
  codigo: { fontSize: 12, color: colores.secundario, fontFamily: 'monospace' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
