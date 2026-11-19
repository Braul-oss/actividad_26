// Convierte docs/reporte.html en entrega/Reporte_Actividad_26_Permisos.pdf usando Edge o Chrome.
// Uso: node scripts/generar-reporte.js
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright-core');

const RAIZ = path.join(__dirname, '..');
const ENTRADA = path.join(RAIZ, 'docs', 'reporte.html');
const SALIDA = path.join(RAIZ, 'entrega', 'Reporte_Actividad_26_Permisos.pdf');
const NAVEGADORES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

(async () => {
  const exe = NAVEGADORES.find((p) => fs.existsSync(p));
  if (!exe) throw new Error('Se requiere Microsoft Edge o Google Chrome.');
  const navegador = await chromium.launch({ executablePath: exe });
  const pagina = await navegador.newPage();
  await pagina.goto(pathToFileURL(ENTRADA).href, { waitUntil: 'load' });
  // Verifica que todas las imágenes existan y hayan cargado.
  const rotas = await pagina.$$eval('img', (imgs) => imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')));
  if (rotas.length) throw new Error('Imágenes no encontradas:\n' + rotas.join('\n'));
  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  await pagina.pdf({
    path: SALIDA,
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="width:100%;font-size:8px;color:#6b7280;padding:0 15mm;display:flex;justify-content:space-between;font-family:Segoe UI,Arial">' +
      '<span>Actividad 26 · Configuración y validación de permisos en una aplicación móvil</span>' +
      '<span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>',
    margin: { top: '16mm', bottom: '18mm', left: '15mm', right: '15mm' },
  });
  const paginas = (fs.readFileSync(SALIDA, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`PDF generado: ${SALIDA} (${paginas} páginas)`);
  await navegador.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
