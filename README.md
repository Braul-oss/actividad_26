# Actividad 26: configuración y validación de permisos en una app móvil

Proyecto base: **Reportes UTVT** (actividad 22), una app de React Native con Expo SDK 58 para registrar reportes de
mantenimiento universitario, más su API en Spring Boot. En esta actividad se agregaron y configuraron los permisos de
**cámara**, **ubicación** y **micrófono**, y se usa el **selector de fotos del sistema**, que no requiere permiso.

## Contenido

| Carpeta / archivo | Qué contiene |
|---|---|
| `app-movil/` | App Expo. Los permisos se configuran en `app.json`, se consultan y solicitan en `src/lib/permisos.ts`, y se usan en `src/app/nuevo.tsx`, `src/components/SeccionUbicacion.tsx`, `src/components/SeccionNotaVoz.tsx` y `src/app/permisos.tsx` |
| `api-reportes/` | API Spring Boot. Se agregaron coordenadas GPS al reporte y el endpoint `POST /api/reportes/{id}/nota-voz`, que acepta solo M4A de hasta 2 MB |
| `evidencias/capturas/` | Capturas reales del emulador (Android 15, API 35) durante las pruebas |
| `evidencias/config/` | Imágenes de la configuración, generadas a partir del texto real de los archivos |
| `evidencias/*.txt` | Salidas de `aapt`, `dumpsys package` y de la configuración resuelta por Expo |
| `scripts/` | `ui.js` controla el emulador con adb, `capturas-config.js` genera las imágenes de configuración y `generar-reporte.js` genera el PDF |
| `docs/reporte.html` | Fuente del reporte técnico |
| `entrega/` | `Reporte_Actividad_26_Permisos.pdf` y el APK de pruebas |

## Ejecutar

```bash
# 1. API (JDK 17 o superior). Crea la base H2 y las cuentas de prueba (contraseña: Utvt2026!)
cd api-reportes && mvn package -DskipTests && java -jar target/api-reportes-1.0.0.jar

# 2. App en el emulador. El APK de pruebas apunta a http://10.0.2.2:8095
adb install -r entrega/reportes-utvt-pruebas.apk

# Para generarlo de nuevo:
cd app-movil && npx eas-cli build -p android --profile pruebas
```

Cuenta de prueba: `alumno.prueba@utvt.edu.mx` / `Utvt2026!`

## Regenerar el reporte

```bash
node scripts/capturas-config.js   # imágenes de configuración
node scripts/generar-reporte.js   # PDF en entrega/
```
