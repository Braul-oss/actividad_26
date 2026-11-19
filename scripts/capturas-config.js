// Genera imágenes (estilo editor de código / terminal) de la configuración de permisos,
// tomando el texto REAL de los archivos del proyecto. Salida: evidencias/config/*.png
// Uso: node scripts/capturas-config.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const RAIZ = path.join(__dirname, '..');
const APP = path.join(RAIZ, 'app-movil');
const SALIDA = path.join(RAIZ, 'evidencias', 'config');
const NAVEGADORES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

/** Extrae las líneas entre la primera que contiene `desde` y la primera (posterior) que contiene `hasta`. */
function fragmento(archivo, desde, hasta) {
  const lineas = fs.readFileSync(path.join(APP, archivo), 'utf8').split(/\r?\n/);
  const i = lineas.findIndex((l) => l.includes(desde));
  if (i < 0) throw new Error(`No se encontró "${desde}" en ${archivo}`);
  const j = hasta ? lineas.findIndex((l, k) => k >= i && l.includes(hasta)) : lineas.length - 1;
  if (j < 0) throw new Error(`No se encontró "${hasta}" en ${archivo}`);
  return { inicio: i + 1, lineas: lineas.slice(i, j + 1) };
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Resaltado sencillo: comentarios, cadenas, palabras clave y números. */
function resaltar(linea) {
  const tokens = [];
  const re =
    /(\/\/.*$|\/\*.*?\*\/|^\s*\*.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|from|export|const|let|async|await|function|return|if|else|true|false|null|undefined|type|new|try|catch|finally|module|require)\b|\b(\d+(?:\.\d+)?)\b/g;
  let ultimo = 0;
  let m;
  while ((m = re.exec(linea))) {
    tokens.push(esc(linea.slice(ultimo, m.index)));
    const clase = m[1] ? 'c' : m[2] ? (linea.slice(m.index + m[0].length).trimStart().startsWith(':') ? 'k' : 's') : m[3] ? 'w' : 'n';
    tokens.push(`<span class="${clase}">${esc(m[0])}</span>`);
    ultimo = m.index + m[0].length;
  }
  tokens.push(esc(linea.slice(ultimo)));
  return tokens.join('');
}

function htmlEditor(titulo, { inicio, lineas }, marcar = []) {
  const filas = lineas
    .map((l, k) => {
      const n = inicio + k;
      const resaltada = marcar.some((t) => l.includes(t));
      return `<div class="fila${resaltada ? ' marca' : ''}"><span class="num">${n}</span><span class="cod">${resaltar(l) || ' '}</span></div>`;
    })
    .join('');
  return `<div class="ventana"><div class="barra"><span class="p r"></span><span class="p a"></span><span class="p v"></span><span class="tit">${esc(
    titulo,
  )}</span></div><div class="cuerpo">${filas}</div></div>`;
}

function htmlTerminal(titulo, texto) {
  return `<div class="ventana term"><div class="barra"><span class="p r"></span><span class="p a"></span><span class="p v"></span><span class="tit">${esc(
    titulo,
  )}</span></div><pre class="cuerpo">${esc(texto)}</pre></div>`;
}

const CSS = `
body{margin:0;padding:18px;background:#e9edf2;font-family:Consolas,'Cascadia Mono',monospace}
.ventana{background:#1e1e1e;border-radius:10px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.25);width:1060px}
.barra{background:#2d2d30;padding:9px 12px;display:flex;align-items:center;gap:7px}
.p{width:12px;height:12px;border-radius:50%;display:inline-block}.r{background:#ff5f56}.a{background:#ffbd2e}.v{background:#27c93f}
.tit{color:#cfcfcf;font-size:13px;margin-left:10px;font-family:'Segoe UI',sans-serif}
.cuerpo{padding:10px 0;font-size:14px;line-height:1.5;color:#d4d4d4;margin:0}
.fila{display:flex}.fila.marca{background:rgba(255,213,79,.13);box-shadow:inset 3px 0 #ffd54f}
.num{color:#6e7681;width:46px;text-align:right;padding-right:14px;flex:none;user-select:none}
.cod{flex:1;white-space:pre-wrap;overflow-wrap:anywhere;padding-right:12px}
.c{color:#6a9955}.s{color:#ce9178}.k{color:#9cdcfe}.w{color:#569cd6}.n{color:#b5cea8}
.term .cuerpo{padding:12px 16px;white-space:pre-wrap;color:#e6e6e6;background:#0c0c0c}
`;

async function main() {
  fs.mkdirSync(SALIDA, { recursive: true });
  const exe = NAVEGADORES.find((p) => fs.existsSync(p));
  const navegador = await chromium.launch({ executablePath: exe });
  const pagina = await navegador.newPage({ deviceScaleFactor: 2 });
  async function capturar(nombre, html) {
    await pagina.setContent(`<!doctype html><meta charset="utf-8"><style>${CSS}</style>${html}`);
    await pagina.locator('.ventana').screenshot({ path: path.join(SALIDA, nombre + '.png') });
    console.log('ok', nombre);
  }

  await capturar(
    'c01-app-json-android',
    htmlEditor('app-movil/app.json — permisos de Android declarados y bloqueados', fragmento('app.json', '"android": {', '"adaptiveIcon"'), [
      'CAMERA',
      'ACCESS_COARSE_LOCATION"',
      'ACCESS_FINE_LOCATION"',
      'RECORD_AUDIO"',
    ]),
  );
  await capturar(
    'c02-app-json-plugins',
    htmlEditor('app-movil/app.json — plugins de Expo y descripciones de uso de iOS', fragmento('app.json', '"expo-secure-store"', '"extra"'), [
      'Permission"',
      'Permission":',
      'Enabled": false',
    ]),
  );
  await capturar(
    'c03-app-config-eas',
    htmlEditor('app-movil/app.config.js — HTTP local solo en el APK de pruebas', fragmento('app.config.js', '// La configuración', '};')),
  );
  await capturar(
    'c04-permisos-ts',
    htmlEditor('app-movil/src/lib/permisos.ts — consulta y solicitud de permisos', fragmento('src/lib/permisos.ts', 'export function interpretar', 'export function abrirAjustes'), [
      'request',
      'Linking.openSettings',
    ]),
  );
  await capturar(
    'c05-nuevo-camara',
    htmlEditor('app-movil/src/app/nuevo.tsx — cámara (permiso en tiempo de ejecución) y selector de fotos (sin permiso)', fragmento('src/app/nuevo.tsx', 'El permiso de cámara se pide', 'async function enviar'), [
      "solicitarPermiso('camara')",
      'launchImageLibraryAsync',
    ]),
  );
  await capturar(
    'c06-ubicacion',
    htmlEditor('app-movil/src/components/SeccionUbicacion.tsx — ubicación en primer plano', fragmento('src/components/SeccionUbicacion.tsx', 'async function leerPosicion', '} finally {'), [
      "solicitarPermiso('ubicacion')",
      'hasServicesEnabledAsync',
      'LocationNext.getPosition',
      "'aproximado'",
    ]),
  );
  await capturar(
    'c07-microfono',
    htmlEditor('app-movil/src/components/SeccionNotaVoz.tsx — micrófono para la nota de voz', fragmento('src/components/SeccionNotaVoz.tsx', 'async function grabar', 'async function detener'), [
      "solicitarPermiso('microfono')",
    ]),
  );
  await capturar(
    'c08-aviso-rechazo',
    htmlEditor('app-movil/src/components/AvisoPermiso.tsx — comportamiento cuando se rechaza un permiso', fragmento('src/components/AvisoPermiso.tsx', 'const bloqueado', '</View>\n'.trim()), [
      'abrirAjustes',
      'alReintentar',
    ]),
  );

  // Terminales con salidas reales guardadas en evidencias/
  const terminales = [
    ['t01-config-resuelta', 'npx expo config --type introspect (permisos resultantes)', 'config-resuelta.txt'],
    ['t02-aapt-apk', 'aapt dump permissions reportes-utvt-pruebas.apk', 'aapt-permisos.txt'],
  ];
  for (const [nombre, titulo, archivo] of terminales) {
    const ruta = path.join(RAIZ, 'evidencias', archivo);
    if (fs.existsSync(ruta)) await capturar(nombre, htmlTerminal(titulo, fs.readFileSync(ruta, 'utf8').trimEnd()));
  }
  for (const f of fs.readdirSync(path.join(RAIZ, 'evidencias')).filter((f) => /^dumpsys-.*\.txt$/.test(f))) {
    const texto = fs.readFileSync(path.join(RAIZ, 'evidencias', f), 'utf8').trimEnd();
    await capturar('t-' + f.replace('.txt', ''), htmlTerminal(`adb shell dumpsys package mx.edu.utvt.reportes  (${f.replace(/^dumpsys-|\.txt$/g, '')})`, texto));
  }
  await navegador.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
