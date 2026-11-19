# Secciones 5 (pruebas) y 6 (resultados), tabla de permisos y conclusiones.
# Se ejecuta dentro de generar-docx.py (usa d, cap y cfg de ese script).

d.titulo(1, "5. Evidencias de las pruebas de autorización y rechazo", salto=True)
d.parrafo(
    "**Entorno:** APK *release* instalado en un emulador Android 15 (API 35) en español, conectado a la API local. Las capturas "
    "se tomaron directamente de la pantalla del emulador con `adb exec-out screencap`. El estado real de cada permiso se verificó "
    "con `adb shell dumpsys package mx.edu.utvt.reportes`, que indica si el sistema lo concedió (`granted`) y si el usuario lo "
    "bloqueó (`USER_FIXED`)."
)


def prueba(titulo, accion, capturas, resultado, extra=None, salto=False):
    d.titulo(3, titulo, salto=salto)
    d.parrafo(f"**Acción:** {accion}", color="5A6876", despues=60, junto=True)
    d.telefonos([(cap(n), t) for n, t in capturas])
    if resultado:
        d.parrafo(f"**Resultado:** {resultado}", alineacion="left")
    for e in extra or []:
        d.parrafo(e)


d.titulo(2, "5.1 Instalación y rechazo de permisos")
prueba(
    "Prueba 1. La app no solicita permisos al iniciar",
    "instalar, abrir la app, iniciar sesión y abrir “Permisos”.",
    [("01-login", "Inicio de sesión: sin diálogos"), ("02-mis-reportes", "Lista de reportes: sin diálogos"), ("03-permisos-sin-solicitar", "Los 3 permisos “Sin solicitar”")],
    "correcto. Ningún diálogo apareció al abrir la app. `dumpsys` confirma `granted=false` y sin marcas del usuario en "
    "`CAMERA`, `ACCESS_FINE/COARSE_LOCATION` y `RECORD_AUDIO`.",
)
d.figura(cfg("t-dumpsys-1-instalacion"), "Estado de los permisos recién instalada la app (dumpsys).", 6.0)
prueba(
    "Prueba 2. Rechazo del permiso de cámara",
    "Nuevo reporte → “Tomar foto” → “No permitir”.",
    [("04-dialogo-camara", "La solicitud aparece al pulsar “Tomar foto”"), ("05-camara-denegada", "Aviso de permiso denegado con “Volver a intentar”")],
    "correcto. La app no se cierra ni abre la cámara: explica para qué se necesita el permiso, ofrece reintentar y propone la "
    "galería como alternativa. El resto del formulario sigue disponible.",
    salto=False,
)
prueba(
    "Prueba 3. Rechazo permanente (“no volver a preguntar”)",
    "“Volver a intentar” → segunda negativa → volver a pulsar “Tomar foto” → “Abrir ajustes”.",
    [("06-dialogo-camara-2", "2.ª solicitud: Android ofrece el rechazo definitivo"), ("07-camara-bloqueada", "La app detecta canAskAgain=false"), ("08-ajustes-app", "Linking.openSettings() abre la información de la app")],
    "correcto. Desde Android 11, dos rechazos equivalen a “no volver a preguntar”. Al pulsar otra vez “Tomar foto” el sistema "
    "respondió sin mostrar diálogo y la app cambió el aviso a **bloqueado** con acceso directo a Ajustes. `dumpsys`: "
    "`CAMERA: granted=false, flags=[USER_SET|USER_FIXED]`.",
    salto=False,
)
prueba(
    "Prueba 4. Adjuntar una foto existente sin ningún permiso",
    "con la cámara bloqueada, pulsar “Galería” y elegir una imagen.",
    [("09-selector-fotos", "Selector del sistema: solo las fotos que se seleccionen"), ("10-foto-desde-selector", "La foto se adjunta y se valida (JPG, 296 KB)")],
    "correcto. No apareció ningún diálogo de permisos. El APK no declara `READ_MEDIA_IMAGES` ni `READ_EXTERNAL_STORAGE`, así "
    "que la app no puede leer la galería completa, solo la imagen elegida. La evidencia fotográfica funciona aunque la cámara esté rechazada.",
    salto=False,
)
prueba(
    "Prueba 5. Ubicación aproximada",
    "“Agregar mi ubicación actual” → elegir “Aproximada” → “Mientras la app está en uso”; después volver a pulsar el botón.",
    [("11-dialogo-ubicacion", "Android 12+ permite elegir precisa o aproximada"), ("12-dialogo-ubicacion-aproximada", "El usuario elige “Aproximada”"), ("13-mejorar-a-precisa", "Al pedirla de nuevo, Android ofrece cambiar a precisa")],
    "correcto en permisos. Solo se concedió `ACCESS_COARSE_LOCATION`; la app lo identificó como “Autorizado (aproximada)” y "
    "Android ofreció subir a precisa.",
    extra=[
        "**Hallazgo:** con el APK anterior no se obtuvieron coordenadas en este emulador. Su imagen de Android no tiene Google Play "
        "services y `getCurrentPositionAsync()` depende de ellos. La app no falló (mostró “No fue posible obtener la ubicación” y el "
        "reporte se podía enviar sin coordenadas), pero lo mismo ocurriría en teléfonos sin servicios de Google. Por eso se agregó "
        "el respaldo con el proveedor de Android de `expo-location/next` (figura 8), que se comprobó en la prueba 9."
    ],
    salto=False,
)
prueba(
    "Prueba 6. Rechazo del permiso de micrófono",
    "“Grabar nota de voz” → “No permitir”.",
    [("14-dialogo-microfono", "Solicitud al pulsar “Grabar nota de voz”"), ("15-microfono-denegado", "Aviso con alternativa: describir por escrito")],
    "correcto. No se inicia la grabación, se explica el motivo y se sugiere la descripción escrita.",
    salto=False,
)
d.titulo(3, "Prueba 7. El estado mostrado coincide con el del sistema", salto=True)
d.parrafo("**Acción:** abrir “Permisos” después de las pruebas 2 a 6 y compararlo con `dumpsys`.", color="5A6876", despues=60, junto=True)
d.telefonos([(cap("16-permisos-tras-rechazos"), "Bloqueado / Aproximada / Denegado")], ancho_pulg=2.1)
d.figura(cfg("t-dumpsys-2-tras-rechazos"), "dumpsys después de los rechazos: estado real en Android.", 6.0)
d.tabla(
    ["Permiso", "dumpsys", "Estado en la app"],
    [
        ["`CAMERA`", "granted=false, USER_FIXED", "Bloqueado"],
        ["`ACCESS_COARSE_LOCATION`", "granted=true", "Autorizado (aproximada)"],
        ["`ACCESS_FINE_LOCATION`", "granted=false, USER_FIXED", "(precisa no autorizada)"],
        ["`RECORD_AUDIO`", "granted=false, USER_SET", "Denegado"],
    ],
    anchos=[34, 33, 33],
)
d.parrafo("**Resultado:** correcto. La app distingue entre denegado (se puede volver a preguntar) y bloqueado (solo desde Ajustes).")

exec(open(os.path.join(os.path.dirname(__file__), "docx_pruebas2.py"), encoding="utf-8").read())

CONCLUSIONES = [
    (
        "8.1 ¿Qué dificultades encontraste al configurar los permisos?",
        [
            "La principal dificultad fue que **lo que se escribe en `app.json` no es todo lo que termina en el instalador**. Cada "
            "biblioteca de Expo agrega permisos propios a su manifiesto: `expo-image-picker` agregaba almacenamiento externo, "
            "`expo-audio` servicios en primer plano y `expo-secure-store` biometría. Solo revisando la configuración resuelta "
            "(`expo config --type introspect`) y el APK compilado (`aapt dump permissions`) se detectaron y se bloquearon con "
            "`blockedPermissions`.",
            "También hubo **conflictos entre plugins**: `expo-image-picker` y `expo-audio` escriben la misma clave "
            "`NSMicrophoneUsageDescription`; poner `microphonePermission: false` en el primero habría eliminado el permiso de "
            "micrófono que necesita el segundo, así que ambos debieron llevar el mismo texto.",
            "En las pruebas aparecieron detalles del sistema que no se ven en el código: Android 12+ deja elegir ubicación "
            "aproximada, Android 11+ convierte dos rechazos en un bloqueo permanente, y la lectura de ubicación de `expo-location` "
            "depende de Google Play services, por lo que fallaba en el emulador sin ellos y fue necesario agregar un respaldo. "
            "Finalmente, el equipo tenía poca memoria y espacio en disco, lo que obligó a ejecutar el emulador sin ventana y con "
            "1.5 GB de RAM.",
        ],
    ),
    (
        "8.2 ¿Qué sucede si una aplicación intenta utilizar un recurso sin autorización?",
        [
            "El sistema operativo bloquea el acceso. Si el permiso no está declarado en el manifiesto, Android ni siquiera puede "
            "solicitarlo (`requestPermissions` lo rechaza de inmediato) y en iOS, si falta la descripción de uso en `Info.plist`, "
            "la app se cierra al intentar acceder al recurso. Si está declarado pero el usuario no lo concedió, la API nativa lanza "
            "una `SecurityException` o devuelve un error, y en React Native la promesa se rechaza.",
            "Si la app no maneja ese caso, el resultado es un cierre inesperado o una función que “no hace nada”. Por eso la app "
            "comprueba el permiso antes de usar el recurso y, como se vio en las pruebas 2, 3 y 6, muestra un aviso con la causa, "
            "una alternativa y el acceso a Ajustes, sin bloquear el resto del formulario.",
        ],
    ),
    (
        "8.3 ¿Por qué es importante solicitar los permisos únicamente cuando se necesitan?",
        [
            "Porque el usuario decide con contexto. Si la solicitud aparece al pulsar “Tomar foto”, la relación entre el permiso y "
            "la acción es evidente y es más probable que lo conceda; si se piden todos al abrir la app, parece invasiva y el usuario "
            "tiende a rechazarlos. Además, Android solo permite preguntar dos veces: un rechazo “en frío” al inicio puede dejar el "
            "permiso bloqueado antes de que el usuario sepa para qué servía.",
            "También reduce el riesgo: la app no tiene acceso a recursos que tal vez nunca use (un usuario que solo adjunta fotos de "
            "la galería nunca concede la cámara), cumple el principio de mínimo privilegio y facilita la revisión de las tiendas, "
            "que exigen justificar cada permiso sensible.",
        ],
    ),
    (
        "8.4 ¿Qué consideraciones deben tomarse antes de distribuir una aplicación que utiliza permisos sensibles?",
        [
            "**Mínimo privilegio verificado en el binario final:** declarar solo lo indispensable, bloquear lo que agregan las "
            "bibliotecas y revisar el APK/AAB compilado, no solo la configuración.",
            "**Textos de uso claros** en el idioma del usuario para cada clave de iOS, porque Apple rechaza descripciones genéricas.",
            "**Alternativas sin permiso** cuando existan, como el selector de fotos del sistema, que evita pedir acceso a toda la "
            "galería (Google Play restringe `READ_MEDIA_IMAGES` a apps cuya función principal lo requiera).",
            "**Funcionamiento con el permiso rechazado, aproximado o revocado**, y pruebas en dispositivos reales con distintas "
            "versiones del sistema y sin servicios de Google.",
            "**Transparencia y protección de los datos:** política de privacidad, formulario de seguridad de datos de Google Play y "
            "etiquetas de privacidad de la App Store; enviar la ubicación y el audio solo por HTTPS, guardarlos con acceso controlado "
            "(en este proyecto, URL firmadas que caducan) y no conservarlos más tiempo del necesario.",
            "**No usar recursos en segundo plano** sin una justificación aprobada por la tienda; esta app lo evita por diseño.",
        ],
    ),
]
