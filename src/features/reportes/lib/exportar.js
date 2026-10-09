/**
 * Exportacion del reporte de ingresos a CSV, Excel (.xlsx) y PDF.
 *
 * Sin librerias: el proyecto no usa dependencias de terceros. El .xlsx es un
 * zip (sin comprimir) de XML escrito a mano y el PDF se arma con las fuentes
 * estandar Helvetica, asi que no hay nada que instalar.
 *
 * Todos los formatos reciben el mismo objeto `datos` (ya filtrado por la
 * pagina), de modo que lo exportado coincide con lo que se ve en pantalla:
 *   { periodo, tipo, metodo, generado (Date), resumen, pendiente, movimientos }
 */

const f = (iso) => iso.split('-').reverse().join('/');
const dinero = (n) => 'C$ ' + Number(n || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const generadoTxt = (d) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** [encabezado, valor de la fila, ancho PDF, alineacion] */
const COLUMNAS = [
  ['Fecha', (m) => f(m.fecha), 54, 'l'],
  ['Hora', (m) => m.hora || '—', 34, 'l'],
  ['Abono', (m) => m.codigo, 52, 'l'],
  ['Pedido', (m) => m.pedido, 56, 'l'],
  ['Cliente', (m) => m.cliente, 140, 'l'],
  ['Tipo de movimiento', (m) => m.tipo, 96, 'l'],
  ['Método de pago', (m) => m.metodo, 78, 'l'],
  ['Valor recibido', (m) => m.monto, 92, 'r'],
  ['Estado del pedido', (m) => m.estado, 168, 'l'],
];

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const nombreArchivo = (d, ext) => `reporte-ingresos_${slug(d.periodo)}${d.tipo ? '_' + slug(d.tipo) : ''}${d.metodo ? '_' + slug(d.metodo) : ''}.${ext}`;

function descargar(partes, tipo, nombre) {
  const url = URL.createObjectURL(new Blob(partes, { type: tipo }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ CSV */

/** Solo los registros filtrados (un encabezado y una fila por movimiento),
 *  con fecha ISO y valores sin formato para importarlos a otras herramientas. */
export function exportarCsv(d) {
  const celda = (v) => (/[",\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const filas = d.movimientos.map((m) => [m.fecha, m.hora, m.codigo, m.pedido, m.cliente, m.tipo, m.metodo, m.monto.toFixed(2), m.estado]);
  const csv = [COLUMNAS.map((c) => c[0]), ...filas].map((r) => r.map(celda).join(',')).join('\r\n');
  descargar(['﻿', csv], 'text/csv;charset=utf-8', nombreArchivo(d, 'csv'));
}

/* ----------------------------------------------------------------- XLSX */

const enc = new TextEncoder();
const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
const crc32 = (u8) => {
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) c = TABLA_CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** Zip sin compresion (metodo "store"): lo unico que un .xlsx necesita. */
function zip(archivos) {
  const ahora = new Date();
  const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);
  const dia = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();
  const partes = [];
  const central = [];
  let offset = 0;
  const cabecera = (n, escribir) => {
    const b = new DataView(new ArrayBuffer(n));
    escribir(b);
    return new Uint8Array(b.buffer);
  };
  archivos.forEach(({ nombre, datos }) => {
    const nom = enc.encode(nombre);
    const crc = crc32(datos);
    partes.push(
      cabecera(30, (b) => {
        b.setUint32(0, 0x04034b50, true); b.setUint16(4, 20, true); b.setUint16(6, 0x0800, true);
        b.setUint16(10, hora, true); b.setUint16(12, dia, true); b.setUint32(14, crc, true);
        b.setUint32(18, datos.length, true); b.setUint32(22, datos.length, true); b.setUint16(26, nom.length, true);
      }), nom, datos
    );
    central.push(
      cabecera(46, (b) => {
        b.setUint32(0, 0x02014b50, true); b.setUint16(4, 20, true); b.setUint16(6, 20, true); b.setUint16(8, 0x0800, true);
        b.setUint16(12, hora, true); b.setUint16(14, dia, true); b.setUint32(16, crc, true);
        b.setUint32(20, datos.length, true); b.setUint32(24, datos.length, true); b.setUint16(28, nom.length, true);
        b.setUint32(42, offset, true);
      }), nom
    );
    offset += 30 + nom.length + datos.length;
  });
  const tamCentral = central.reduce((s, p) => s + p.length, 0);
  const fin = cabecera(22, (b) => {
    b.setUint32(0, 0x06054b50, true); b.setUint16(8, archivos.length, true); b.setUint16(10, archivos.length, true);
    b.setUint32(12, tamCentral, true); b.setUint32(16, offset, true);
  });
  return [...partes, ...central, fin];
}

const esc = (s) => String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const LETRAS = 'ABCDEFGHIJ';

/** Hoja a partir de filas de celdas: texto, numero o { f: formula, v: valor }; `s` es el estilo. */
function hoja(filas, anchos, congelar) {
  const xml = filas.map((fila, r) => {
    const celdas = fila.map((c, i) => {
      if (c === null || c === undefined || c === '') return '';
      const { v, s, f: formula } = typeof c === 'object' ? c : { v: c };
      const ref = `${LETRAS[i]}${r + 1}`;
      const estilo = s ? ` s="${s}"` : '';
      if (formula) return `<c r="${ref}"${estilo}><f>${esc(formula)}</f><v>${v}</v></c>`;
      return typeof v === 'number'
        ? `<c r="${ref}"${estilo}><v>${v}</v></c>`
        : `<c r="${ref}"${estilo} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${celdas}</row>`;
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetViews><sheetView workbookViewId="0" showGridLines="${congelar ? 1 : 0}">${congelar ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : ''}</sheetView></sheetViews>` +
    `<cols>${anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` +
    `<sheetData>${xml}</sheetData></worksheet>`;
}

/* Estilos: 1 encabezado · 2 dinero · 3 total (dinero) · 4 total (texto) · 5 titulo · 6 negrita */
const ESTILOS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;C$&quot;\\ #,##0.00"/></numFmts>' +
  '<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FF2563EB"/><name val="Calibri"/></font></fonts>' +
  '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFEFF4FF"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="164" fontId="1" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/** Dos hojas: «Resumen» (indicadores) y «Movimientos» (columnas, con fila de total). Los totales son formulas. */
export function exportarXlsx(d) {
  const n = d.movimientos.length;
  const ultima = Math.max(n + 1, 2);
  const rango = (col) => `Movimientos!${col}2:${col}${ultima}`;
  const { resumen: r } = d;

  const movimientos = [
    COLUMNAS.map(([titulo]) => ({ v: titulo, s: 1 })),
    ...d.movimientos.map((m) => [f(m.fecha), m.hora || '', m.codigo, m.pedido, m.cliente, m.tipo, m.metodo, { v: m.monto, s: 2 }, m.estado]),
    [{ v: 'TOTAL RECIBIDO', s: 4 }, { v: '', s: 4 }, { v: '', s: 4 }, { v: '', s: 4 }, { v: '', s: 4 }, { v: '', s: 4 }, { v: '', s: 4 },
      { f: `SUM(H2:H${ultima})`, v: r.total, s: 3 }, { v: '', s: 4 }],
  ];
  const resumen = [
    [{ v: 'Parceros Multiservice', s: 5 }],
    [{ v: 'Reporte de ingresos recibidos', s: 6 }],
    [],
    [{ v: 'Período', s: 6 }, d.periodo],
    [{ v: 'Tipo de movimiento', s: 6 }, d.tipo || 'Todos'],
    [{ v: 'Método de pago', s: 6 }, d.metodo || 'Todos'],
    [{ v: 'Generado', s: 6 }, generadoTxt(d.generado)],
    [],
    [{ v: 'Indicador', s: 1 }, { v: 'Valor', s: 1 }],
    ['Ingresos totales', { f: `SUM(${rango('H')})`, v: r.total, s: 2 }],
    ['Ingresos por abonos', { f: `SUMIF(${rango('F')},"Abono",${rango('H')})`, v: r.abonos, s: 2 }],
    ['Ingresos por pagos completos', { f: `SUMIF(${rango('F')},"Pago completo",${rango('H')})`, v: r.completos, s: 2 }],
    ['Transacciones registradas', { f: `COUNT(${rango('H')})`, v: r.transacciones }],
    [],
    [{ v: 'Indicador aparte (no forma parte de los ingresos)', s: 6 }],
    ['Pendiente de cobro al cierre del período', { v: d.pendiente, s: 2 }],
  ];

  const archivos = {
    '[Content_Types].xml': `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `${XML}<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets><sheet name="Resumen" sheetId="1" r:id="rId1"/><sheet name="Movimientos" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': ESTILOS,
    'xl/worksheets/sheet1.xml': hoja(resumen, [44, 36], false),
    'xl/worksheets/sheet2.xml': hoja(movimientos, [12, 8, 11, 12, 30, 20, 17, 18, 34], true),
  };
  const partes = zip(Object.entries(archivos).map(([nombre, xml]) => ({ nombre, datos: enc.encode(xml) })));
  descargar(partes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', nombreArchivo(d, 'xlsx'));
}

/* ------------------------------------------------------------------ PDF */

/* Anchos de Helvetica (por mil) de ' ' a '~'; el resto de letras acentuadas usa el de su base. */
const ANCHOS = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const BASE = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n', Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ñ: 'N', ü: 'u' };
const ancho = (s, t, neg) =>
  [...s].reduce((a, c) => { const b = BASE[c] || c, k = b.charCodeAt(0) - 32; return a + (k >= 0 && k < ANCHOS.length ? ANCHOS[k] : 556); }, 0) * t / 1000 * (neg ? 1.06 : 1);
const recortar = (s, max, t, neg) => {
  if (ancho(s, t, neg) <= max) return s;
  let o = s;
  while (o.length > 1 && ancho(o + '...', t, neg) > max) o = o.slice(0, -1);
  return o + '...';
};
/* Texto Unicode -> bytes de WinAnsi (cp1252), con \ ( ) escapados. */
const ESPECIALES = { '—': 0x97, '–': 0x96, '…': 0x85, '€': 0x80 };
const lit = (s) => [...s].map((c) => {
  const b = ESPECIALES[c] ?? (c.charCodeAt(0) < 256 ? c.charCodeAt(0) : 63);
  return b === 92 || b === 40 || b === 41 ? '\\' + String.fromCharCode(b) : String.fromCharCode(b);
}).join('');
const rgb = (hex) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');

const AZUL = '#2563EB', TEXTO = '#111827', GRIS = '#6B7280', CLARO = '#EFF4FF', ZEBRA = '#F8FAFC', AVISO = '#FEF3C7', LINEA = '#D1D5DB';

/** PDF horizontal (A4): encabezado, filtros, resumen, tabla paginada y total. */
export function exportarPdf(d) {
  const W = 842, H = 595, M = 36, ALTO_FILA = 18;
  const paginas = [];
  let ops;
  const nueva = () => { ops = []; paginas.push(ops); };
  const rect = (x, y, w, h, color, borde) =>
    ops.push(`${rgb(color)} rg ${x} ${H - y - h} ${w} ${h} re f` + (borde ? ` ${rgb(borde)} RG 0.6 w ${x} ${H - y - h} ${w} ${h} re S` : ''));
  const texto = (s, x, y, { t = 9, neg = false, color = TEXTO, der = false, ancho: max } = {}) => {
    const str = max ? recortar(String(s), max, t, neg) : String(s);
    const px = der ? x - ancho(str, t, neg) : x;
    ops.push(`BT /${neg ? 'F2' : 'F1'} ${t} Tf ${rgb(color)} rg ${px.toFixed(2)} ${H - y} Td (${lit(str)}) Tj ET`);
  };
  const cabeceraTabla = (y) => {
    rect(M, y, W - 2 * M, 20, AZUL);
    let x = M;
    COLUMNAS.forEach(([titulo, , w, al]) => {
      texto(titulo, al === 'r' ? x + w - 6 : x + 6, y + 13.5, { t: 8.5, neg: true, color: '#FFFFFF', der: al === 'r', ancho: w - 10 });
      x += w;
    });
    return y + 20;
  };

  nueva();
  rect(0, 0, W, 72, AZUL);
  texto('Parceros Multiservice', M, 34, { t: 22, neg: true, color: '#FFFFFF' });
  texto('Reporte de ingresos recibidos', M, 54, { t: 11, color: '#DBEAFE' });
  texto(`Generado: ${generadoTxt(d.generado)}`, W - M, 34, { t: 9, color: '#DBEAFE', der: true });

  [['PERÍODO CONSULTADO', d.periodo], ['TIPO DE MOVIMIENTO', d.tipo || 'Todos'], ['MÉTODO DE PAGO', d.metodo || 'Todos']].forEach(([et, val], i) => {
    const x = M + i * 270;
    texto(et, x, 98, { t: 7.5, color: GRIS, neg: true });
    texto(val, x, 112, { t: 11, neg: true, ancho: 255 });
  });

  const { resumen: r } = d;
  const tarjetas = [
    ['INGRESOS TOTALES', dinero(r.total), `${r.transacciones} transacciones`, CLARO],
    ['POR ABONOS', dinero(r.abonos), `${r.nAbonos} abonos`, CLARO],
    ['POR PAGOS COMPLETOS', dinero(r.completos), `${r.nCompletos} pagos`, CLARO],
    ['TRANSACCIONES', String(r.transacciones), 'movimientos registrados', CLARO],
    ['PENDIENTE DE COBRO', dinero(d.pendiente), 'aparte: no suma a los ingresos', AVISO],
  ];
  const wt = (W - 2 * M - 4 * 10) / 5;
  tarjetas.forEach(([et, val, nota, fondo], i) => {
    const x = M + i * (wt + 10);
    rect(x, 130, wt, 58, fondo, LINEA);
    texto(et, x + 10, 146, { t: 7.5, color: GRIS, neg: true, ancho: wt - 16 });
    texto(val, x + 10, 166, { t: 13.5, neg: true, ancho: wt - 16 });
    texto(nota, x + 10, 180, { t: 7.5, color: GRIS, ancho: wt - 16 });
  });

  texto('Movimientos', M, 214, { t: 12, neg: true });
  let y = cabeceraTabla(222);
  const limite = H - 46;

  if (!d.movimientos.length) texto('No hay movimientos para los filtros seleccionados.', M + 6, y + 18, { t: 9.5, color: GRIS });
  d.movimientos.forEach((m, i) => {
    if (y + ALTO_FILA > limite) { nueva(); y = cabeceraTabla(M); }
    if (i % 2) rect(M, y, W - 2 * M, ALTO_FILA, ZEBRA);
    let x = M;
    COLUMNAS.forEach(([, valor, w, al]) => {
      const v = valor(m);
      texto(al === 'r' ? dinero(v) : v, al === 'r' ? x + w - 6 : x + 6, y + 12, { t: 8, der: al === 'r', ancho: w - 10 });
      x += w;
    });
    y += ALTO_FILA;
  });
  if (d.movimientos.length) {
    if (y + 24 > limite) { nueva(); y = M; }
    rect(M, y + 2, W - 2 * M, 22, CLARO);
    texto('TOTAL RECIBIDO', M + 6, y + 17, { t: 9, neg: true });
    texto(dinero(r.total), M + COLUMNAS.slice(0, 7).reduce((a, c) => a + c[2], 0) + COLUMNAS[7][2] - 6, y + 17, { t: 9.5, neg: true, der: true });
  }

  paginas.forEach((p, i) => {
    ops = p;
    ops.push(`${rgb(LINEA)} RG 0.6 w ${M} ${H - (H - 32)} m ${W - M} ${H - (H - 32)} l S`);
    texto('Parceros Multiservice · Reporte de ingresos', M, H - 18, { t: 8, color: GRIS });
    texto(`Página ${i + 1} de ${paginas.length}`, W - M, H - 18, { t: 8, color: GRIS, der: true });
  });

  /* Objetos: 1 catalogo · 2 paginas · 3-4 fuentes · luego (pagina, contenido) por cada hoja. */
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Count ${paginas.length} /Kids [${paginas.map((_, i) => `${5 + 2 * i} 0 R`).join(' ')}] >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];
  paginas.forEach((p, i) => {
    const flujo = p.join('\n');
    objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + 2 * i} 0 R >>`);
    objetos.push(`<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`);
  });

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = objetos.map((o, i) => { const at = pdf.length; pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  descargar([Uint8Array.from(pdf, (c) => c.charCodeAt(0) & 0xff)], 'application/pdf', nombreArchivo(d, 'pdf'));
}
