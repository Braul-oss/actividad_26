import { ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvisoPermiso } from '../components/AvisoPermiso';
import { SeccionNotaVoz } from '../components/SeccionNotaVoz';
import { Coordenadas, SeccionUbicacion } from '../components/SeccionUbicacion';
import { Boton, Campo, Chip, colores, formatearFecha, ICONOS, Mensaje, Seccion, Tarjeta } from '../components/ui';
import { ErrorApi, mensajeDeError } from '../lib/api';
import { InfoPermiso, permitido, solicitarPermiso } from '../lib/permisos';
import { leerBytes } from '../lib/plataforma';
import {
  Categoria,
  enviarReporte,
  Etapa,
  FotoAdjunta,
  guardarPendiente,
  NotaVoz,
  nuevaClaveIdempotencia,
  obtenerCatalogos,
  Ubicacion,
} from '../lib/reportes';
import { useSesion } from '../lib/sesion';
import {
  aISO,
  DESCRIPCION_MAX,
  ErroresFormulario,
  formatearTamano,
  hoyISO,
  TAMANO_MAXIMO_BYTES,
  validarFoto,
  validarReporte,
} from '../lib/validacion';

type Resultado = { tipo: 'enviado'; folio: string } | { tipo: 'guardado'; motivo: string };

function ultimosDias(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = aISO(d);
    return { iso, etiqueta: i === 0 ? 'Hoy' : i === 1 ? 'Ayer' : formatearFecha(iso).replace(/ \d{4}$/, '') };
  });
}

export default function NuevoReporte() {
  const router = useRouter();
  const margenes = useSafeAreaInsets();
  const { usuario } = useSesion();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null);
  const [idCategoria, setIdCategoria] = useState<number | null>(null);
  const [edificio, setEdificio] = useState<string | null>(null);
  const [idUbicacion, setIdUbicacion] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [fechaRegistro, setFechaRegistro] = useState(hoyISO());
  const [foto, setFoto] = useState<FotoAdjunta | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [permisoCamara, setPermisoCamara] = useState<InfoPermiso | null>(null);
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null);
  const [nota, setNota] = useState<NotaVoz | null>(null);
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  // Una clave por formulario: si se reintenta el envío, el servidor no duplica el reporte.
  const [clave, setClave] = useState(nuevaClaveIdempotencia);
  const enviando = useRef(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    obtenerCatalogos()
      .then((c) => {
        setCategorias(c.categorias);
        setUbicaciones(c.ubicaciones);
      })
      .catch((e) => setErrorCatalogo(mensajeDeError(e)));
  }, []);

  const edificios = useMemo(() => [...new Set(ubicaciones.map((u) => u.edificio))], [ubicaciones]);
  const aulas = ubicaciones.filter((u) => u.edificio === edificio);
  const dias = useMemo(() => ultimosDias(7), []);

  async function procesarImagen(r: ImagePicker.ImagePickerResult) {
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    setErrorFoto(null);
    if (typeof a.fileSize === 'number' && a.fileSize > TAMANO_MAXIMO_BYTES) {
      setErrorFoto(`La fotografía pesa ${formatearTamano(a.fileSize)}. El máximo es 5 MB.`);
      return;
    }
    try {
      const bytes = await leerBytes(a.uri);
      const v = validarFoto(bytes);
      if (!v.ok) {
        setErrorFoto(v.motivo);
        return;
      }
      setFoto({ uri: a.uri, mime: v.mime, extension: v.extension, tamano: v.tamano });
    } catch {
      setErrorFoto('No se pudo leer la fotografía seleccionada.');
    }
  }

  /** El permiso de cámara se pide justo aquí, cuando el usuario pulsa "Tomar foto". */
  async function tomarFoto() {
    setErrorFoto(null);
    if (Platform.OS !== 'web') {
      const p = await solicitarPermiso('camara');
      setPermisoCamara(p);
      if (!permitido(p)) return; // la app sigue funcionando: se muestra el aviso y la opción de galería
    }
    try {
      // quality comprime la imagen en el dispositivo antes de enviarla.
      procesarImagen(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 }));
    } catch {
      setErrorFoto('No fue posible abrir la cámara.');
    }
  }

  /**
   * Selector de fotos del sistema (Android Photo Picker / PHPicker en iOS): el usuario elige una
   * sola imagen y la app recibe solo esa, por eso NO se pide acceso general a la galería.
   */
  async function elegirFoto() {
    setErrorFoto(null);
    procesarImagen(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 }));
  }

  async function enviar() {
    if (enviando.current || !usuario) return; // evita doble envío
    const e = validarReporte(
      { idCategoria, idUbicacion, descripcion, fechaRegistro },
      categorias.map((c) => c.id),
      ubicaciones.map((u) => u.id),
    );
    setErrores(e);
    setErrorEnvio(null);
    if (Object.keys(e).length) {
      setErrorEnvio('Revisa los campos marcados antes de enviar.');
      return;
    }
    enviando.current = true;
    const datos = {
      idCategoria: idCategoria as number,
      idUbicacion: idUbicacion as number,
      descripcion: descripcion.trim(),
      fechaRegistro,
      claveIdempotencia: clave,
      ...(coordenadas
        ? {
            latitud: coordenadas.latitud,
            longitud: coordenadas.longitud,
            ...(coordenadas.precisionMetros != null ? { precisionMetros: coordenadas.precisionMetros } : {}),
          }
        : {}),
    };
    try {
      const r = await enviarReporte(datos, foto, nota, setEtapa);
      setResultado({ tipo: 'enviado', folio: r.folio });
    } catch (err) {
      if (err instanceof ErrorApi && err.sinServicio) {
        const creado = (err as { creado?: { id: number; folio: string } }).creado;
        const cat = categorias.find((c) => c.id === datos.idCategoria);
        await guardarPendiente(usuario.id, {
          datos,
          foto,
          nota,
          categoria: cat?.nombre ?? '',
          icono: cat?.icono ?? '',
          ubicacion: ubicaciones.find((u) => u.id === datos.idUbicacion)?.nombre ?? '',
          ...(creado ? { idReporte: creado.id, folio: creado.folio } : {}),
        });
        setResultado({ tipo: 'guardado', motivo: err.message });
      } else {
        if (err instanceof ErrorApi && err.campos) setErrores(err.campos as ErroresFormulario);
        setErrorEnvio(mensajeDeError(err));
      }
    } finally {
      enviando.current = false;
      setEtapa(null);
      scroll.current?.scrollToEnd({ animated: true });
    }
  }

  function otroReporte() {
    setResultado(null);
    setIdCategoria(null);
    setEdificio(null);
    setIdUbicacion(null);
    setDescripcion('');
    setFechaRegistro(hoyISO());
    setFoto(null);
    setPermisoCamara(null);
    setCoordenadas(null);
    setNota(null);
    setErrores({});
    setClave(nuevaClaveIdempotencia());
  }

  if (resultado) {
    const enviado = resultado.tipo === 'enviado';
    return (
      <ScrollView contentContainerStyle={[estilos.contenedor, { paddingBottom: margenes.bottom + 24 }]}>
        <Tarjeta style={{ alignItems: 'center', gap: 12, paddingVertical: 28 }}>
          <Text style={{ fontSize: 52 }}>{enviado ? '✅' : '💾'}</Text>
          <Text style={estilos.tituloResultado}>{enviado ? 'Reporte registrado' : 'Reporte guardado en el teléfono'}</Text>
          {enviado ? (
            <>
              <Text style={estilos.folio}>{resultado.folio}</Text>
              <Text style={estilos.textoResultado}>
                Estado: Pendiente. El responsable de mantenimiento revisará tu reporte y podrás seguir su avance en “Mis
                reportes”.
              </Text>
            </>
          ) : (
            <Text style={estilos.textoResultado}>
              No fue posible conectar con el servicio. Tu reporte se guardó y se enviará automáticamente cuando se recupere
              la conexión.
            </Text>
          )}
        </Tarjeta>
        {!enviado ? <Mensaje tipo="aviso">{resultado.motivo}</Mensaje> : null}
        <Boton onPress={() => router.back()} titulo="Ir a mis reportes" />
        <Boton onPress={otroReporte} titulo="Registrar otro reporte" variante="secundario" />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[estilos.contenedor, { paddingBottom: margenes.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
      ref={scroll}
    >
      {errorCatalogo ? <Mensaje tipo="error">{errorCatalogo}</Mensaje> : null}
      {!categorias.length && !errorCatalogo ? <ActivityIndicator color={colores.primario} /> : null}

      <Seccion error={errores.idCategoria} titulo="1. ¿Qué tipo de problema es?">
        <View style={estilos.rejilla}>
          {categorias.map((c) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: idCategoria === c.id }}
              key={c.id}
              onPress={() => setIdCategoria(c.id)}
              style={[estilos.categoria, idCategoria === c.id && estilos.categoriaActiva]}
            >
              <Text style={{ fontSize: 24 }}>{ICONOS[c.icono] ?? '🛠️'}</Text>
              <Text style={[estilos.categoriaTexto, idCategoria === c.id && { color: colores.primario }]}>{c.nombre}</Text>
            </Pressable>
          ))}
        </View>
      </Seccion>

      <Seccion error={errores.idUbicacion} titulo="2. ¿Dónde está?">
        <View style={estilos.chips}>
          {edificios.map((e) => (
            <Chip
              activo={edificio === e}
              key={e}
              onPress={() => {
                setEdificio(e);
                setIdUbicacion(null);
              }}
              texto={e}
            />
          ))}
        </View>
        {edificio ? (
          <View style={[estilos.chips, { marginTop: 4 }]}>
            {aulas.map((u) => (
              <Chip activo={idUbicacion === u.id} icono="📍" key={u.id} onPress={() => setIdUbicacion(u.id)} texto={u.aula} />
            ))}
          </View>
        ) : null}
      </Seccion>

      <Campo
        ayuda={`${descripcion.trim().length}/${DESCRIPCION_MAX} caracteres (mínimo 10)`}
        error={errores.descripcion}
        etiqueta="3. Describe el problema"
        maxLength={DESCRIPCION_MAX}
        multiline
        onChangeText={setDescripcion}
        placeholder="Ejemplo: dos lámparas fundidas al fondo del aula."
        value={descripcion}
      />

      <Seccion error={errores.fechaRegistro} titulo="4. ¿Cuándo lo detectaste?">
        <ScrollView contentContainerStyle={{ gap: 8 }} horizontal showsHorizontalScrollIndicator={false}>
          {dias.map((d) => (
            <Chip activo={fechaRegistro === d.iso} key={d.iso} onPress={() => setFechaRegistro(d.iso)} texto={d.etiqueta} />
          ))}
        </ScrollView>
      </Seccion>

      <Seccion error={errorFoto ?? undefined} titulo="5. Evidencia fotográfica (opcional)">
        {foto ? (
          <View style={{ gap: 8 }}>
            <Image accessibilityLabel="Vista previa de la evidencia" source={{ uri: foto.uri }} style={estilos.vistaPrevia} />
            <View style={estilos.filaFoto}>
              <Text style={estilos.ayuda}>
                {foto.extension.toUpperCase()} · {formatearTamano(foto.tamano)} · tipo verificado
              </Text>
              <Boton onPress={() => setFoto(null)} titulo="Quitar" variante="texto" />
            </View>
          </View>
        ) : (
          <View style={estilos.filaBotones}>
            <View style={{ flex: 1 }}>
              <Boton onPress={tomarFoto} titulo="📷  Tomar foto" variante="secundario" />
            </View>
            <View style={{ flex: 1 }}>
              <Boton onPress={elegirFoto} titulo="🖼️  Galería" variante="secundario" />
            </View>
          </View>
        )}
        {permisoCamara && !permitido(permisoCamara) && !foto ? (
          <AvisoPermiso
            alReintentar={tomarFoto}
            alternativa="Mientras tanto puedes adjuntar una foto existente con el botón Galería (no requiere permiso)."
            permiso={permisoCamara}
            recurso="camara"
          />
        ) : null}
        <Text style={estilos.ayuda}>Solo JPG o PNG, máximo 5 MB. Se guarda en un almacenamiento privado.</Text>
      </Seccion>

      <SeccionUbicacion alCambiar={setCoordenadas} valor={coordenadas} />

      <SeccionNotaVoz alCambiar={setNota} nota={nota} />

      {errorEnvio ? <Mensaje tipo="error">{errorEnvio}</Mensaje> : null}
      <Boton
        cargando={etapa !== null}
        deshabilitado={!categorias.length}
        onPress={enviar}
        titulo={
          etapa === 'datos'
            ? 'Enviando reporte…'
            : etapa === 'foto'
              ? 'Subiendo fotografía…'
              : etapa === 'audio'
                ? 'Subiendo nota de voz…'
                : 'Enviar reporte'
        }
      />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 16, gap: 20 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoria: {
    width: '31.5%',
    minHeight: 84,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    gap: 4,
  },
  categoriaActiva: { borderColor: colores.primario, backgroundColor: colores.primarioSuave },
  categoriaTexto: { fontSize: 12, fontWeight: '700', color: colores.texto, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vistaPrevia: { width: '100%', height: 200, borderRadius: 14, backgroundColor: colores.borde },
  filaFoto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filaBotones: { flexDirection: 'row', gap: 10 },
  ayuda: { color: colores.secundario, fontSize: 12 },
  tituloResultado: { fontSize: 20, fontWeight: '800', color: colores.texto, textAlign: 'center' },
  folio: { fontSize: 22, fontWeight: '800', color: colores.primario, letterSpacing: 0.5 },
  textoResultado: { fontSize: 14, color: colores.secundario, textAlign: 'center', lineHeight: 20 },
});
