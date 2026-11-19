import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Campo, colores, Mensaje } from '../components/ui';
import { ErrorApi, mensajeDeError } from '../lib/api';
import { conexionSegura } from '../lib/config';
import { useSesion } from '../lib/sesion';

export default function Login() {
  const { iniciarSesion, avisoSesion } = useSesion();
  const margenes = useSafeAreaInsets();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<{ texto: string; bloqueo: boolean } | null>(null);
  const [errores, setErrores] = useState<{ correo?: string; password?: string }>({});

  async function entrar() {
    const e: typeof errores = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) e.correo = 'Escribe un correo institucional válido.';
    if (!password) e.password = 'Escribe tu contraseña.';
    setErrores(e);
    setError(null);
    if (Object.keys(e).length) return;
    setEnviando(true);
    try {
      await iniciarSesion(correo, password);
    } catch (err) {
      setError({ texto: mensajeDeError(err), bloqueo: err instanceof ErrorApi && err.codigo === 429 });
      setPassword('');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colores.primario }}>
      <ScrollView
        contentContainerStyle={[estilos.contenedor, { paddingTop: margenes.top + 48, paddingBottom: margenes.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={estilos.encabezado}>
          <View style={estilos.logo}>
            <Text style={{ fontSize: 40 }}>🏫</Text>
          </View>
          <Text style={estilos.titulo}>Reportes de Infraestructura</Text>
          <Text style={estilos.subtitulo}>Universidad Tecnológica del Valle de Toluca</Text>
        </View>

        <View style={estilos.tarjeta}>
          <Text style={estilos.tituloTarjeta}>Iniciar sesión</Text>
          {avisoSesion && !error ? <Mensaje tipo="aviso">{avisoSesion}</Mensaje> : null}
          <Campo
            autoCapitalize="none"
            autoComplete="email"
            error={errores.correo}
            etiqueta="Correo institucional"
            inputMode="email"
            keyboardType="email-address"
            onChangeText={setCorreo}
            placeholder="usuario@utvt.edu.mx"
            value={correo}
          />
          <Campo
            autoComplete="current-password"
            error={errores.password}
            etiqueta="Contraseña"
            onChangeText={setPassword}
            onSubmitEditing={entrar}
            placeholder="••••••••"
            secureTextEntry
            value={password}
          />
          {error ? (
            <Mensaje tipo="error" titulo={error.bloqueo ? 'Acceso bloqueado temporalmente' : 'No se pudo iniciar sesión'}>
              {error.texto}
            </Mensaje>
          ) : null}
          <Boton cargando={enviando} onPress={entrar} titulo={enviando ? 'Verificando…' : 'Iniciar sesión'} />
          <Text style={estilos.nota}>
            {conexionSegura ? '🔒 ' : '⚠️ '}Tus credenciales se validan en el servidor. La contraseña nunca se guarda en el
            teléfono.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flexGrow: 1, paddingHorizontal: 20, gap: 24 },
  encabezado: { alignItems: 'center', gap: 8 },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  titulo: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitulo: { color: '#CFE3EF', fontSize: 14, textAlign: 'center' },
  tarjeta: { backgroundColor: colores.superficie, borderRadius: 20, padding: 20, gap: 16 },
  tituloTarjeta: { fontSize: 20, fontWeight: '800', color: colores.texto },
  nota: { color: colores.secundario, fontSize: 12, textAlign: 'center', lineHeight: 17 },
});
