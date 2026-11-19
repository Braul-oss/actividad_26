// Genera evidencias/config-resuelta.txt con la configuración final que producen los plugins de Expo
// (npx expo config --type introspect) para los perfiles produccion y pruebas.
// Uso: node scripts/config-resuelta.js
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const APP = path.join(RAIZ, 'app-movil');
const EV = path.join(RAIZ, 'evidencias');

function introspect(env, archivo) {
  const salida = execFileSync('npx', ['expo', 'config', '--type', 'introspect', '--json'], {
    cwd: APP,
    env: { ...process.env, ...env },
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  }).toString();
  const json = JSON.parse(salida.slice(salida.indexOf('{')));
  fs.writeFileSync(path.join(EV, archivo), JSON.stringify(json, null, 2));
  return json;
}

const CLAVES_IOS = /UsageDescription|UsageDescriptionDictionary|UIBackgroundModes/;

function formatear(titulo, j) {
  const m = j._internal.modResults;
  const lineas = [`# ${titulo}`, 'AndroidManifest.xml  <uses-permission>:'];
  for (const p of m.android.manifest.manifest['uses-permission'] || []) {
    const nombre = p.$['android:name'].replace('android.permission.', '');
    lineas.push(p.$['tools:node'] === 'remove' ? `  ${nombre}   -> tools:node="remove" (bloqueado)` : `  ${nombre}`);
  }
  const app = m.android.manifest.manifest.application[0].$;
  lineas.push(`  android:usesCleartextTraffic = ${app['android:usesCleartextTraffic'] ?? '(no definido: solo HTTPS)'}`);
  lineas.push('Info.plist (iOS):');
  for (const [k, v] of Object.entries(m.ios.infoPlist)) if (CLAVES_IOS.test(k)) lineas.push(`  ${k} = ${JSON.stringify(v)}`);
  return lineas.join('\n');
}

const prod = introspect({ PERMITIR_HTTP_LOCAL: '' }, 'config-introspect-produccion.json');
const pruebas = introspect({ PERMITIR_HTTP_LOCAL: '1' }, 'config-introspect.json');
const texto = [formatear('Perfil produccion (sin PERMITIR_HTTP_LOCAL)', prod), '', formatear('Perfil pruebas (PERMITIR_HTTP_LOCAL=1)', pruebas)].join('\n');
fs.writeFileSync(path.join(EV, 'config-resuelta.txt'), texto + '\n');
console.log(texto);
