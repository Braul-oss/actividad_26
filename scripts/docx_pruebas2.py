# Pruebas 8 a 13 (APK v4), tabla de resultados y tabla de permisos configurados.
# Se ejecuta dentro de docx_pruebas.py.

d.titulo(2, "5.2 Concesión de permisos y funcionamiento", salto=True)
d.parrafo(
    "Para estas pruebas se instaló de nuevo la app (sin permisos previos) con el APK que incluye el respaldo de ubicación. "
    "La posición del emulador se fijó con `adb emu geo fix -99.500531 19.284012` (UTVT, Lerma)."
)
prueba(
    "Prueba 8. Concesión del permiso de cámara",
    "Nuevo reporte → “Tomar foto” → “Mientras la app está en uso” → disparar → aceptar.",
    [("17-camara-conceder", "Solicitud al pulsar “Tomar foto”"), ("18-camara-abierta", "Con el permiso concedido se abre la cámara"), ("19-foto-tomada", "La foto se adjunta y se verifica (JPG, 30 KB)")],
    "correcto. La cámara del sistema se abrió y la foto quedó adjunta. En el siguiente reporte, “Tomar foto” abrió la cámara "
    "directamente, sin volver a mostrar el diálogo, porque el permiso ya estaba concedido.",
)
prueba(
    "Prueba 9. Rechazo de la ubicación y concesión de la ubicación precisa",
    "“Agregar mi ubicación actual” → “No permitir” → “Volver a intentar” → “Precisa” → “Mientras la app está en uso”.",
    [("20-ubicacion-solicitud", "Solicitud de ubicación"), ("21-ubicacion-denegada", "Rechazo: aviso y alternativa (edificio y aula)")],
    "",
    salto=True,
)
d.telefonos([(cap("22-ubicacion-precisa"), "Segundo intento: se elige “Precisa”"), (cap("23-coordenadas"), "Coordenadas obtenidas: ±5 m, ubicación precisa")])
d.parrafo(
    "**Resultado:** correcto. Con el permiso rechazado la app no intentó leer la ubicación y ofreció enviar el reporte solo con "
    "edificio y aula. Al concederla, se obtuvieron las coordenadas 19.284012, -99.500530 con precisión de ±5 m. Esto confirma "
    "que el respaldo con el proveedor de Android funciona en un dispositivo sin Google Play services.",
    alineacion="left",
)
prueba(
    "Prueba 10. Concesión del permiso de micrófono",
    "“Grabar nota de voz” → “Mientras la app está en uso” → hablar → “Detener grabación”.",
    [("24-microfono-conceder", "Solicitud al pulsar “Grabar nota de voz”"), ("25-grabando", "Grabación en curso con contador"), ("26-nota-lista", "Nota lista: 0:27, 320 KB, se puede escuchar")],
    "correcto. La grabación inicia solo después de conceder el permiso, muestra el tiempo restante (máximo 60 s) y al detenerse "
    "se valida que el archivo sea M4A y pese menos de 2 MB. El micrófono se libera al terminar.",
    salto=True,
)
exec(open(os.path.join(os.path.dirname(__file__), "docx_pruebas3.py"), encoding="utf-8").read())
