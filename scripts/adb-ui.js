// Utilidades para manejar el emulador con adb y uiautomator (reutilizado de la actividad 24).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ADB = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function adb(args, opts = {}) {
  return execFileSync(ADB, args, { maxBuffer: 64 * 1024 * 1024, ...opts });
}
const sh = (cmd) => adb(['shell', cmd]).toString();

function dump() {
  for (let i = 0; i < 3; i++) {
    try {
      adb(['shell', 'uiautomator', 'dump', '/sdcard/ui.xml'], { stdio: ['ignore', 'pipe', 'pipe'] });
      const xml = adb(['exec-out', 'cat', '/sdcard/ui.xml']).toString('utf8');
      const nodes = [];
      for (const m of xml.matchAll(/<node ([^>]*?)\/?>/g)) {
        const a = {};
        for (const kv of m[1].matchAll(/([\w-]+)="([^"]*)"/g)) a[kv[1]] = kv[2];
        const b = (a.bounds || '').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
        if (b) a.box = b.slice(1).map(Number);
        nodes.push(a);
      }
      return nodes;
    } catch {
      // uiautomator a veces falla mientras la pantalla se anima.
    }
  }
  return [];
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#10;/g, '\n');
function match(node, sel) {
  if (sel.id) return node['resource-id'] === sel.id || node['resource-id']?.endsWith(':id/' + sel.id);
  if (sel.text) return decode(node.text || '').includes(sel.text) || decode(node['content-desc'] || '').includes(sel.text);
  return false;
}
const norm = (sel) => (typeof sel === 'string' ? { id: sel } : sel);

function find(sel) {
  sel = norm(sel);
  return dump().find((n) => match(n, sel) && n.box && n.box[2] > n.box[0]);
}

async function waitFor(sel, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const n = find(sel);
    if (n) return n;
    await sleep(700);
  }
  throw new Error('No apareció: ' + JSON.stringify(norm(sel)));
}

async function exists(sel, ms = 3000) {
  try {
    return await waitFor(sel, ms);
  } catch {
    return null;
  }
}

async function tap(sel, ms) {
  const n = await waitFor(sel, ms);
  const [x1, y1, x2, y2] = n.box;
  sh(`input tap ${Math.round((x1 + x2) / 2)} ${Math.round((y1 + y2) / 2)}`);
  await sleep(600);
  return n;
}

async function type(sel, text) {
  await tap(sel);
  // Selecciona todo y borra lo que hubiera.
  sh('input keyevent KEYCODE_MOVE_END');
  sh('input keyevent ' + Array(60).fill('KEYCODE_DEL').join(' '));
  if (text) sh(`input text "${text.replace(/ /g, '%s').replace(/(["'`$&|;<>()\\])/g, '\\$1')}"`);
  await sleep(400);
}

function textOf(sel) {
  const n = find(sel);
  return n ? decode(n.text || n['content-desc'] || '') : null;
}

function allText() {
  return dump()
    .map((n) => decode(n.text || n['content-desc'] || ''))
    .filter(Boolean);
}

function shot(dir, name) {
  fs.mkdirSync(dir, { recursive: true });
  const png = adb(['exec-out', 'screencap', '-p']);
  const file = path.join(dir, name + '.png');
  fs.writeFileSync(file, png);
  return file;
}

const back = async () => {
  sh('input keyevent KEYCODE_BACK');
  await sleep(800);
};
const hideKeyboard = async () => {
  if (/mInputShown=true/.test(sh('dumpsys input_method'))) await back();
};

function setNetwork(on) {
  sh(`svc wifi ${on ? 'enable' : 'disable'}`);
  sh(`svc data ${on ? 'enable' : 'disable'}`);
}

module.exports = { adb, sh, dump, find, waitFor, exists, tap, type, textOf, allText, shot, back, hideKeyboard, setNetwork, sleep, ADB };

const PKG = 'mx.edu.utvt.reportes';

/** Abre la app instalada (APK release) desde el lanzador. */
async function launch() {
  sh(`am force-stop ${PKG}`);
  sh(`monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
  await sleep(4000);
}

module.exports.PKG = PKG;
module.exports.launch = launch;
