import { Text, View } from 'react-native';
import { abrirAjustes, InfoPermiso, Recurso, RECURSOS } from '../lib/permisos';
import { Boton, colores } from './ui';

/**
 * Se muestra cuando el usuario rechazó un permiso. La app NO se bloquea: explica para qué
 * sirve, ofrece reintentar (si el sistema lo permite) o abrir Ajustes, y el resto del
 * formulario sigue funcionando.
 */
export function AvisoPermiso({
  recurso,
  permiso,
  alReintentar,
  alternativa,
}: {
  recurso: Recurso;
  permiso: InfoPermiso;
  alReintentar: () => void;
  alternativa?: string;
}) {
  const r = RECURSOS[recurso];
  const bloqueado = permiso.estado === 'bloqueado';
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: colores.errorFondo,
        borderLeftColor: colores.error,
        borderLeftWidth: 4,
        borderRadius: 10,
        padding: 12,
        gap: 6,
      }}
      testID={`aviso-permiso-${recurso}`}
    >
      <Text style={{ color: colores.error, fontWeight: '700', fontSize: 15 }}>
        {r.icono} Permiso de {r.nombre.toLowerCase()} {bloqueado ? 'bloqueado' : 'denegado'}
      </Text>
      <Text style={{ color: colores.error, fontSize: 14, lineHeight: 20 }}>
        {r.motivo}{' '}
        {bloqueado
          ? 'Elegiste no volver a preguntar, así que debes activarlo en Ajustes > Permisos.'
          : 'Puedes volver a intentarlo cuando quieras.'}
        {alternativa ? ` ${alternativa}` : ''}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        {bloqueado ? (
          <Boton onPress={abrirAjustes} titulo="Abrir ajustes" variante="texto" />
        ) : (
          <Boton onPress={alReintentar} titulo="Volver a intentar" variante="texto" />
        )}
      </View>
    </View>
  );
}
