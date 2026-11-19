// Pequeña CLI para manejar el emulador paso a paso durante las pruebas de permisos.
// Uso: node scripts/ui.js <comando> [args...]   (varios comandos separados por "--")
//   tap "<texto>"        toca el primer elemento cuyo texto o descripción contenga <texto>
//   tapid <resource-id>  toca por resource-id (p. ej. permission_deny_button)
//   edit <n> "<texto>"   escribe en el n-ésimo campo de texto (0, 1, ...)
//   shot <nombre>        guarda una captura en evidencias/capturas/<nombre>.png
//   texts                imprime los textos visibles
//   ids                  imprime los resource-id visibles
//   swipe                desplaza la pantalla hacia arriba (scroll hacia abajo)
//   swipeup              desplaza hacia abajo (scroll hacia arriba)
//   wait "<texto>" [ms]  espera a que aparezca un texto
//   sleep <ms>           espera
//   back                 botón Atrás
//   launch               abre la app
//   perms                imprime el estado de los permisos en dumpsys package
const path = require('path');
const u = require('./adb-ui');

const CAPTURAS = path.join(__dirname, '..', 'evidencias', 'capturas');

async function ejecutar(cmd, args) {
  switch (cmd) {
    case 'tap':
      await u.tap({ text: args[0] }, 20000);
      break;
    case 'tapn': {
      // tapn <n> "<texto>": toca la n-ésima coincidencia (-1 = la última)
      const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(c));
      const nodos = u.dump().filter((x) => x.box && decode((x.text || '') + (x['content-desc'] || '')).includes(args[1]));
      const n = Number(args[0]);
      const x = nodos[n < 0 ? nodos.length + n : n];
      if (!x) throw new Error('No apareció: ' + args[1]);
      const [x1, y1, x2, y2] = x.box;
      u.sh(`input tap ${(x1 + x2) >> 1} ${(y1 + y2) >> 1}`);
      await u.sleep(700);
      break;
    }
    case 'tapid':
      await u.tap({ id: args[0] }, 20000);
      break;
    case 'edit': {
      const campos = u.dump().filter((n) => n.class === 'android.widget.EditText' && n.box);
      const c = campos[Number(args[0])];
      if (!c) throw new Error('No existe el campo ' + args[0]);
      const [x1, y1, x2, y2] = c.box;
      u.sh(`input tap ${(x1 + x2) >> 1} ${(y1 + y2) >> 1}`);
      await u.sleep(500);
      u.sh('input keyevent KEYCODE_MOVE_END');
      u.sh('input keyevent ' + Array(60).fill('KEYCODE_DEL').join(' '));
      // Dentro de comillas dobles el shell del dispositivo solo interpreta " ` $ y \
      u.sh(`input text "${args[1].replace(/ /g, '%s').replace(/(["`$\\])/g, '\\$1')}"`);
      await u.sleep(400);
      break;
    }
    case 'shot':
      console.log(u.shot(CAPTURAS, args[0]));
      break;
    case 'texts':
      console.log(u.allText().join(' | '));
      break;
    case 'ids':
      console.log(
        u
          .dump()
          .filter((n) => n['resource-id'])
          .map((n) => `${n['resource-id']} "${n.text || ''}"`)
          .join('\n'),
      );
      break;
    case 'swipe':
      u.sh('input swipe 540 1800 540 700 400');
      await u.sleep(700);
      break;
    case 'swipeup':
      u.sh('input swipe 540 700 540 1800 400');
      await u.sleep(700);
      break;
    case 'wait':
      await u.waitFor({ text: args[0] }, Number(args[1] || 20000));
      break;
    case 'sleep':
      await u.sleep(Number(args[0]));
      break;
    case 'back':
      await u.back();
      break;
    case 'hidekb':
      await u.hideKeyboard();
      break;
    case 'launch':
      await u.launch();
      break;
    case 'perms': {
      const salida = u.sh(`dumpsys package ${u.PKG}`);
      const lineas = salida
        .split('\n')
        .filter((l) => /(CAMERA|LOCATION|RECORD_AUDIO|MEDIA|STORAGE): granted=/.test(l))
        .map((l) => l.trim());
      console.log([...new Set(lineas)].join('\n'));
      break;
    }
    default:
      throw new Error('Comando desconocido: ' + cmd);
  }
}

(async () => {
  const argv = process.argv.slice(2);
  const grupos = [[]];
  for (const a of argv) {
    if (a === '--') grupos.push([]);
    else grupos[grupos.length - 1].push(a);
  }
  for (const [cmd, ...args] of grupos.filter((g) => g.length)) await ejecutar(cmd, args);
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
