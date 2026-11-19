import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colores } from '../components/ui';
import { esMantenimiento, SesionProvider, useSesion } from '../lib/sesion';
import { useSincronizador } from '../lib/sincronizacion';

function Navegacion() {
  const { cargando, usuario, cerrarSesion } = useSesion();
  const router = useRouter();
  useSincronizador(usuario?.id ?? null);

  if (cargando) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator color={colores.primario} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colores.primario },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Stack.Protected guard={!!usuario}>
        <Stack.Screen
          name="index"
          options={{
            title: esMantenimiento(usuario) ? 'Todos los reportes' : 'Mis reportes',
            headerRight: () => (
              <View style={{ flexDirection: 'row' }}>
                <Pressable accessibilityRole="button" onPress={() => router.push('/permisos')} style={estilos.salir}>
                  <Text style={estilos.salirTexto}>Permisos</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={cerrarSesion} style={estilos.salir}>
                  <Text style={estilos.salirTexto}>Salir</Text>
                </Pressable>
              </View>
            ),
          }}
        />
        <Stack.Screen name="nuevo" options={{ title: 'Nuevo reporte' }} />
        <Stack.Screen name="reporte/[id]" options={{ title: 'Detalle del reporte' }} />
        <Stack.Screen name="permisos" options={{ title: 'Permisos de la app' }} />
      </Stack.Protected>
      <Stack.Protected guard={!usuario}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function Layout() {
  return (
    <SesionProvider>
      <StatusBar style="light" />
      <Navegacion />
    </SesionProvider>
  );
}

const estilos = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.fondo },
  salir: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.16)', marginRight: 8 },
  salirTexto: { color: '#FFFFFF', fontWeight: '700' },
});
