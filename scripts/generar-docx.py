"""Agrega el reporte técnico de la Actividad 26 después de la portada de actividad_26.docx.

Uso:  python scripts/generar-docx.py <portada.docx> <salida.docx>
La portada no se modifica: el contenido se inserta después de su salto de página.
"""
import os
import re
import sys
import zipfile

sys.path.insert(0, os.path.dirname(__file__))
from docx_util import AZUL, Documento  # noqa: E402

RAIZ = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
CAP = os.path.join(RAIZ, "evidencias", "capturas")
CFG = os.path.join(RAIZ, "evidencias", "config")
cap = lambda n: os.path.join(CAP, n + ".png")  # noqa: E731
cfg = lambda n: os.path.join(CFG, n + ".png")  # noqa: E731

d = Documento()

# ---------------------------------------------------------------- índice
d.indice()

# ---------------------------------------------------------------- 1
d.titulo(1, "1. Descripción del proyecto móvil utilizado", salto=True)
d.parrafo(
    "**Reportes UTVT** es la aplicación móvil desarrollada en la actividad 22. La comunidad universitaria la usa para "
    "reportar fallas de infraestructura y mantenimiento (iluminación, mobiliario, equipo de cómputo, internet e instalación "
    "eléctrica). El estudiante o administrativo inicia sesión, elige la categoría y el aula, describe la falla y adjunta "
    "evidencias. El responsable de mantenimiento consulta los reportes y cambia su estado (Pendiente, En revisión, Atendido, Cerrado)."
)
d.tabla(
    ["Elemento", "Detalle"],
    [
        ["Aplicación móvil", "React Native 0.88 con Expo SDK 58 y Expo Router. Identificador Android/iOS: `mx.edu.utvt.reportes`"],
        ["Servicio (API)", "Spring Boot 3.5 con JWT y base de datos H2. Los archivos se guardan en almacenamiento privado y se entregan con URL firmadas que caducan"],
        ["Dispositivo de prueba", "Emulador Android 15 (API 35, x86_64, perfil Pixel) con el sistema en español"],
        ["Instalador probado", "APK *release* generado con EAS Build (perfil `pruebas`): el mismo tipo de compilación que se distribuye, por lo que el manifiesto evaluado es el final"],
    ],
    anchos=[28, 72],
    titulo="Datos generales del proyecto",
)
d.titulo(2, "1.1 Cambios realizados en esta actividad")
d.parrafo(
    "La versión de la actividad 22 solo permitía tomar o elegir una fotografía. Para cubrir la problemática planteada "
    "(capturar fotografías, obtener la ubicación y adjuntar evidencias antes de distribuir la app) se agregó lo siguiente:"
)
d.vinetas(
    [
        "**Ubicación GPS del reporte** con `expo-location`. Solo se lee en primer plano, cuando el usuario pulsa “Agregar mi ubicación actual”.",
        "**Nota de voz** de hasta 60 segundos con `expo-audio`, como evidencia adicional.",
        "**Gestión de permisos centralizada** en `src/lib/permisos.ts`: consultar el estado sin molestar al usuario, solicitarlo justo antes de usar el recurso y distinguir entre *denegado*, *bloqueado* y *aproximado*.",
        "**Pantalla “Permisos de la app”** que muestra el estado real de cada permiso y se actualiza al volver de Ajustes.",
        "**Aviso de rechazo** reutilizable: si se niega un permiso, la app explica para qué sirve, ofrece reintentar o abrir Ajustes y deja enviar el reporte sin esa evidencia.",
        "**API**: el reporte guarda latitud, longitud y precisión, y un endpoint nuevo recibe la nota de voz validando la firma del archivo (M4A) y su tamaño (2 MB máximo).",
        "**Configuración mínima de permisos** en `app.json`: se declaran solo los 4 permisos necesarios y se bloquean 14 que las bibliotecas agregarían por defecto.",
    ]
)

# ---------------------------------------------------------------- 2
d.titulo(1, "2. Identificación de funcionalidades y permisos necesarios", salto=True)
d.parrafo(
    "Se identificaron cuatro funcionalidades que acceden a recursos del dispositivo. Tres requieren un permiso peligroso "
    "(*dangerous* en Android, con descripción de uso en iOS). La cuarta usa el selector de fotos del sistema y no requiere permiso."
)
d.tabla(
    ["Funcionalidad", "Permiso requerido", "Justificación"],
    [
        ["Tomar fotografías", "Cámara\n`CAMERA` · `NSCameraUsageDescription`", "Capturar desde la app la evidencia visual de la falla"],
        ["Registrar ubicación", "GPS / ubicación en uso\n`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` · `NSLocationWhenInUseUsageDescription`", "Obtener las coordenadas del lugar del reporte para que mantenimiento lo encuentre"],
        ["Grabar notas de voz", "Micrófono\n`RECORD_AUDIO` · `NSMicrophoneUsageDescription`", "Registrar audio como evidencia cuando es más fácil explicar la falla hablando"],
        ["Adjuntar fotografías existentes", "**Ninguno**: selector de fotos del sistema (Android Photo Picker / PHPicker)", "Seleccionar una evidencia ya almacenada; el sistema entrega solo la imagen elegida, sin acceso a toda la galería"],
    ],
    anchos=[22, 38, 40],
    titulo="Funcionalidades y permisos",
)
d.titulo(2, "2.1 Módulos de Expo utilizados")
d.tabla(
    ["Funcionalidad", "Módulo", "Funciones de permisos utilizadas"],
    [
        ["Cámara", "`expo-image-picker`", "`getCameraPermissionsAsync()`, `requestCameraPermissionsAsync()` y `launchCameraAsync()`. Se usa la cámara del sistema, así que no hace falta `expo-camera`"],
        ["Selección de imágenes", "`expo-image-picker`", "`launchImageLibraryAsync()` abre el selector del sistema y no solicita permisos"],
        ["Ubicación", "`expo-location`", "`getForegroundPermissionsAsync()`, `requestForegroundPermissionsAsync()`, `hasServicesEnabledAsync()`, `getCurrentPositionAsync()` y, como respaldo sin Google Play services, `Location.getPosition()` de `expo-location/next`"],
        ["Grabación de audio", "`expo-audio`", "`getRecordingPermissionsAsync()`, `requestRecordingPermissionsAsync()` y `useAudioRecorder()`"],
        ["Abrir Ajustes", "`react-native`", "`Linking.openSettings()`, para un permiso bloqueado"],
    ],
    anchos=[20, 20, 60],
    titulo="Módulos de Expo",
)
d.titulo(2, "2.2 Permisos que se decidió NO solicitar")
d.parrafo(
    "Siguiendo el principio de mínimo privilegio, se revisaron los permisos que agregan las bibliotecas por defecto y se "
    "bloquearon los que ninguna funcionalidad necesita:"
)
d.tabla(
    ["Permiso bloqueado", "Motivo"],
    [
        ["`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`, `READ/WRITE_EXTERNAL_STORAGE`", "El selector de fotos del sistema no los necesita; `expo-image-picker` declaraba `READ/WRITE_EXTERNAL_STORAGE`"],
        ["`ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE_LOCATION`", "La ubicación solo se lee con la app abierta y a petición del usuario"],
        ["`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `FOREGROUND_SERVICE_MICROPHONE`", "`expo-audio` los agrega para grabar o reproducir en segundo plano, algo que la app no hace"],
        ["`SYSTEM_ALERT_WINDOW`, `VIBRATE`", "Vienen en la plantilla de Expo y la app no los usa"],
        ["`USE_BIOMETRIC`, `USE_FINGERPRINT`", "Los agrega `expo-secure-store`; la app no usa autenticación biométrica (detectado al revisar el APK, sección 3.3)"],
        ["iOS: `NSPhotoLibraryUsageDescription`, `NSLocationAlways…`, `NSMotionUsageDescription`, `NSFaceIDUsageDescription`", "No hay acceso a la fototeca completa, ubicación permanente, sensores de movimiento ni Face ID"],
    ],
    anchos=[45, 55],
    titulo="Permisos bloqueados",
)

# ---------------------------------------------------------------- 3
d.titulo(1, "3. Evidencia de la configuración de permisos", salto=True)
d.titulo(2, "3.1 Android: permisos declarados y bloqueados (app.json)")
d.parrafo(
    "En Expo, la lista `android.permissions` sustituye la lista por defecto y `android.blockedPermissions` agrega "
    "`tools:node=\"remove\"` al manifiesto, de modo que se eliminan permisos aunque una biblioteca los declare en su propio `AndroidManifest.xml`."
)
d.figura(cfg("c01-app-json-android"), "Permisos de Android en app.json. Las líneas resaltadas son los permisos peligrosos necesarios.")
d.titulo(2, "3.2 iOS y plugins: descripciones de uso (app.json)")
d.parrafo(
    "Cada módulo tiene un *config plugin* que escribe en `Info.plist` el texto que iOS muestra en el diálogo de autorización. "
    "Un valor `false` elimina la clave, y las opciones `is…Enabled: false` evitan declarar ubicación en segundo plano o servicios en primer plano."
)
d.figura(cfg("c02-app-json-plugins"), "Plugins de expo-image-picker, expo-location y expo-audio con las descripciones de uso en español.")
d.titulo(2, "3.3 Configuración resultante y APK compilado")
d.parrafo(
    "Para confirmar el efecto real se generó la configuración final con `npx expo config --type introspect`, que aplica todos "
    "los plugins igual que la compilación:"
)
d.figura(cfg("t01-config-resuelta"), "Manifiesto Android e Info.plist resultantes: se conservan 4 permisos peligrosos.")
d.parrafo("Además se revisó el APK compilado con `aapt dump permissions`, que es exactamente lo que Android lee al instalar la app:")
d.figura(cfg("t02-aapt-apk"), "Permisos del APK instalado en las pruebas. No aparece ninguno de los permisos bloqueados.")
d.nota(
    "el APK incluye permisos *normales* que agregan las bibliotecas (`INTERNET`, `ACCESS_NETWORK_STATE`, `WAKE_LOCK`…). "
    "Se conceden al instalar y no muestran diálogo. Dos de ellos, `USE_BIOMETRIC` y `USE_FINGERPRINT` (de `expo-secure-store`), "
    "no los usa la app, así que se agregaron a `blockedPermissions`.",
    titulo="Hallazgo de la verificación:",
)
d.titulo(2, "3.4 Perfil de pruebas")
d.parrafo(
    "La API local corre en la computadora (`http://10.0.2.2:8095` desde el emulador) y Android bloquea el tráfico HTTP sin cifrar "
    "en compilaciones *release*. Por eso `app.config.js` permite HTTP solo cuando el perfil `pruebas` de `eas.json` define "
    "`PERMITIR_HTTP_LOCAL=1`; el perfil `produccion` no lo define y solo usa HTTPS."
)
d.figura(cfg("c03-app-config-eas"), "app.config.js: el ajuste de HTTP local solo aplica al APK de pruebas.", 5.4)

# ---------------------------------------------------------------- 4
d.titulo(1, "4. Implementación de la solicitud de autorización", salto=True)
d.parrafo(
    "Todas las pantallas usan el mismo módulo `permisos.ts`. Su regla principal es que **consultar no es lo mismo que solicitar**: "
    "la pantalla de permisos y el formulario solo consultan el estado con `get…PermissionsAsync()`, que nunca muestra un diálogo. "
    "El diálogo del sistema aparece únicamente con `request…PermissionsAsync()`, dentro del botón de la función que necesita el recurso."
)
d.figura(cfg("c04-permisos-ts"), "permisos.ts: la respuesta del sistema se traduce a concedido, aproximado, sin solicitar, denegado o bloqueado.")
d.tabla(
    ["Estado", "Respuesta del sistema", "Comportamiento de la app"],
    [
        ["Autorizado", "`granted: true`", "Usa el recurso"],
        ["Aproximado", "Ubicación con `android.accuracy = 'coarse'` o `ios.accuracy = 'reduced'`", "Usa la ubicación y avisa que es aproximada (±1-3 km)"],
        ["Sin solicitar", "`status: 'undetermined'`", "Espera a que el usuario pulse la función"],
        ["Denegado", "`granted: false`, `canAskAgain: true`", "Explica el motivo y ofrece **Volver a intentar**"],
        ["Bloqueado", "`granted: false`, `canAskAgain: false`", "El sistema ya no muestra el diálogo, así que la app ofrece **Abrir ajustes**"],
    ],
    anchos=[18, 40, 42],
    titulo="Estados de permiso que maneja la app",
)
d.titulo(2, "4.1 Cámara y selector de fotos")
d.figura(cfg("c05-nuevo-camara"), "El permiso de cámara se solicita al pulsar “Tomar foto”; la galería usa el selector del sistema sin permiso.")
d.titulo(2, "4.2 Ubicación")
d.figura(cfg("c06-ubicacion"), "Ubicación en primer plano: se solicita el permiso, se verifica el GPS, se detecta si es aproximada y se usa el proveedor de Android si no hay Google Play services.")
d.titulo(2, "4.3 Micrófono")
d.figura(cfg("c07-microfono"), "El micrófono se solicita al pulsar “Grabar nota de voz” y se libera al detener la grabación.")
d.titulo(2, "4.4 Comportamiento cuando se rechaza un permiso")
d.parrafo(
    "El componente `AvisoPermiso` aparece bajo la función afectada y nunca bloquea el formulario: explica para qué sirve el permiso, "
    "propone una alternativa (galería en lugar de cámara, edificio y aula en lugar de GPS, descripción escrita en lugar de audio) y, "
    "si el permiso quedó bloqueado, lleva a Ajustes con `Linking.openSettings()`."
)
d.figura(cfg("c08-aviso-rechazo"), "AvisoPermiso: “Volver a intentar” si el sistema permite preguntar otra vez, “Abrir ajustes” si está bloqueado.")

# ---------------------------------------------------------------- 5
exec(open(os.path.join(os.path.dirname(__file__), "docx_pruebas.py"), encoding="utf-8").read())

# ---------------------------------------------------------------- 7
d.titulo(1, "7. Tabla de permisos configurados", salto=True)
d.tabla(
    ["Permiso", "Archivo o módulo configurado", "Estado de autorización", "Funcionalidad comprobada"],
    TABLA_PERMISOS,  # noqa: F821  (definida en docx_pruebas.py)
    anchos=[22, 30, 24, 24],
    titulo="Permisos configurados y comprobados",
)
d.parrafo(
    "Las claves de iOS quedaron configuradas y verificadas en el `Info.plist` resultante (figura 3), pero no se probaron en un "
    "iPhone porque las pruebas se hicieron en Android.",
    color="5A6876",
)

# ---------------------------------------------------------------- 8
d.titulo(1, "8. Conclusiones", salto=True)
for pregunta, respuestas in CONCLUSIONES:  # noqa: F821
    d.titulo(2, pregunta)
    for r in respuestas:
        d.parrafo(r)

# ---------------------------------------------------------------- 9
d.titulo(1, "9. Anexo: archivos modificados y reproducción de las pruebas", salto=True)
d.tabla(
    ["Archivo", "Cambio"],
    [
        ["`app-movil/app.json`", "Permisos de Android, permisos bloqueados y plugins con las descripciones de uso de iOS"],
        ["`app-movil/app.config.js`, `eas.json`", "Perfiles `pruebas` (APK con HTTP local) y `produccion` (AAB, solo HTTPS)"],
        ["`app-movil/src/lib/permisos.ts`", "Consulta, solicitud e interpretación de permisos; hook `usePermisos()`"],
        ["`app-movil/src/components/AvisoPermiso.tsx`", "Aviso de permiso denegado o bloqueado con alternativa"],
        ["`app-movil/src/components/SeccionUbicacion.tsx`", "Ubicación GPS en primer plano con respaldo sin Google Play services"],
        ["`app-movil/src/components/SeccionNotaVoz.tsx`", "Grabación y reproducción de la nota de voz (máx. 60 s)"],
        ["`app-movil/src/app/nuevo.tsx`, `permisos.tsx`, `reporte/[id].tsx`", "Formulario, pantalla de permisos y detalle con GPS y audio"],
        ["`api-reportes/…`", "Coordenadas en el reporte y endpoint `POST /api/reportes/{id}/nota-voz`"],
        ["`scripts/ui.js`, `adb-ui.js`", "Automatización de las pruebas en el emulador (toques, capturas, dumpsys)"],
    ],
    anchos=[42, 58],
    titulo="Archivos del proyecto",
)
d.titulo(2, "Cómo reproducir las pruebas")
d.vinetas(
    [
        "Iniciar la API: `java -jar api-reportes/target/api-reportes-1.0.0.jar` (puerto 8095, usuario `alumno.prueba`).",
        "Instalar el APK de pruebas: `adb install entrega/reportes-utvt-pruebas.apk`.",
        "Ver el estado real de los permisos: `adb shell dumpsys package mx.edu.utvt.reportes | grep granted=`.",
        "Reiniciar los permisos para repetir las pruebas: `adb shell pm clear mx.edu.utvt.reportes`.",
        "Compilar de nuevo: `eas build -p android --profile pruebas` (APK) o `--profile produccion` (AAB para la tienda).",
    ]
)

# ================================================================ ensamblado
portada, salida = sys.argv[1], sys.argv[2]
zin = zipfile.ZipFile(portada)
doc = zin.read("word/document.xml").decode("utf-8")
rels = zin.read("word/_rels/document.xml.rels").decode("utf-8")
tipos = zin.read("[Content_Types].xml").decode("utf-8")
estilos = zin.read("word/styles.xml").decode("utf-8")

# 1) contenido: se inserta antes de sectPr, quitando el párrafo vacío final de la portada
cuerpo = "".join(d.xml)
# pie de página con número (la portada no lo muestra: titlePg)
sect = re.search(r"<w:sectPr(?: [^>]*)?>.*?</w:sectPr>", doc, flags=re.S).group(0)
sect_nuevo = sect.replace(
    "<w:pgSz", '<w:footerReference w:type="default" r:id="rIdPie1"/><w:pgSz', 1
).replace("<w:docGrid", "<w:titlePg/><w:docGrid", 1)
i = doc.index(sect)
antes = re.sub(r"<w:p [^>]*/>$", "", doc[:i])  # párrafo vacío que dejó la portada tras su salto de página
doc = antes + cuerpo + sect_nuevo + doc[i + len(sect) :]

# 2) relaciones: imágenes y pie
extra = "".join(
    f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{nombre}"/>'
    for rid, nombre, _ in d.imagenes
)
extra += '<Relationship Id="rIdPie1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'
rels = rels.replace("</Relationships>", extra + "</Relationships>")
tipos = tipos.replace(
    "</Types>",
    '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>',
)
pie = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="BFC8D2"/></w:pBdr><w:tabs><w:tab w:val="right" w:pos="8838"/></w:tabs></w:pPr>'
    '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="5A6876"/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">Actividad 26 · Configuración y validación de permisos en una aplicación móvil</w:t></w:r>'
    '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="5A6876"/><w:sz w:val="16"/></w:rPr><w:tab/><w:t xml:space="preserve">Página </w:t></w:r>'
    '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="5A6876"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>'
    '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="5A6876"/><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
    '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="5A6876"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r>'
    '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="5A6876"/><w:sz w:val="16"/></w:rPr><w:t>2</w:t></w:r>'
    '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="5A6876"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>'
    "</w:p></w:ftr>"
)

# 3) estilos de títulos en Arial, como la portada
def estilo_titulo(sid, tam, antes, despues, borde=False):
    global estilos
    bloque = re.search(rf'<w:style [^>]*w:styleId="{sid}".*?</w:style>', estilos, flags=re.S).group(0)
    nuevo = re.sub(
        r"<w:rPr>.*</w:rPr>",
        f'<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Calibri" w:cs="Arial"/><w:b/><w:bCs/><w:color w:val="{AZUL}"/>'
        f'<w:sz w:val="{tam}"/><w:szCs w:val="{tam}"/><w:lang w:val="es-MX"/></w:rPr>',
        bloque,
        flags=re.S,
    )
    nuevo = re.sub(r'<w:spacing [^/]*/>', f'<w:spacing w:before="{antes}" w:after="{despues}"/>', nuevo)
    if borde:
        nuevo = nuevo.replace("<w:spacing", '<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="0E5E8C"/></w:pBdr><w:spacing', 1)
    nuevo = nuevo.replace("<w:semiHidden/><w:unhideWhenUsed/>", "")
    estilos = estilos.replace(bloque, nuevo)


estilo_titulo("Heading1", 32, 0, 200, borde=True)
# estilos compactos para la tabla de contenido
for nivel, sangria, negrita in ((1, 0, "<w:b/>"), (2, 284, "")):
    if f'w:styleId="TOC{nivel}"' not in estilos:
        estilos = estilos.replace("</w:styles>",
            f'<w:style w:type="paragraph" w:styleId="TOC{nivel}"><w:name w:val="toc {nivel}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="39"/><w:unhideWhenUsed/>'
            f'<w:pPr><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="8828"/></w:tabs><w:spacing w:before="{60 if nivel == 1 else 0}" w:after="30" w:line="240" w:lineRule="auto"/><w:ind w:left="{sangria}"/></w:pPr>'
            f'<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>{negrita}<w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="es-MX"/></w:rPr></w:style></w:styles>')
estilo_titulo("Heading2", 25, 240, 100)
estilo_titulo("Heading3", 22, 200, 80)

zout = zipfile.ZipFile(salida, "w", zipfile.ZIP_DEFLATED)
for item in zin.infolist():
    if item.filename.endswith("/"):
        continue
    datos = {
        "word/document.xml": doc,
        "word/_rels/document.xml.rels": rels,
        "[Content_Types].xml": tipos,
        "word/styles.xml": estilos,
    }.get(item.filename)
    zout.writestr(item, datos.encode("utf-8") if datos is not None else zin.read(item.filename))
zout.writestr("word/footer1.xml", pie.encode("utf-8"))
for _, nombre, ruta in d.imagenes:
    zout.write(ruta, "word/media/" + nombre)
zout.close()
print(f"ok: {salida}  ({len(d.imagenes)} imágenes, {d.n_fig} figuras, {d.n_tabla} tablas)")
