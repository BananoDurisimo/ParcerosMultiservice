/**
 * Exportacion de los listados a Excel (.xlsx) y PDF, y reporte en PDF.
 *
 * Sin librerias: el proyecto no usa dependencias de terceros. El .xlsx es un
 * zip (sin comprimir) de XML escrito a mano y el PDF se arma con las fuentes
 * estandar Helvetica, asi que no hay nada que instalar.
 *
 * Los tres formatos reciben el mismo documento, armado por cada modulo con
 * las filas que la tabla muestra en ese momento (busqueda y filtros
 * aplicados), de modo que lo exportado coincide con lo que se ve:
 *
 *   {
 *     titulo: 'Abonos',                 // nombre del modulo
 *     archivo: 'abonos',                // base del nombre del archivo
 *     filtros: [['Búsqueda', 'ana'], …], // lo aplicado en la tabla
 *     columnas: [{ titulo, valor(fila), tipo: 'texto'|'dinero'|'numero', ancho, total }],
 *     filas: [...],
 *     indicadores: [{ etiqueta, valor, tipo, nota }],          // solo reporte y hoja Resumen
 *     grupos: [{ titulo, columnas: [...], tipos: [...], filas: [[...]] }], // idem
 *   }
 *
 * - Exportar (PDF o Excel): la tabla tal cual, con la fila de totales.
 * - Reporte (PDF): encabezado, filtros, indicadores, resumen agrupado
 *   (por estado, por metodo de pago, por proveedor…) y el detalle.
 */

export const dinero = (n) => 'C$ ' + Number(n || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numero = (n) => Number(n || 0).toLocaleString('es-NI', { maximumFractionDigits: 3 });
const generadoTxt = (d) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const formatear = (v, tipo) => (tipo === 'dinero' ? dinero(v) : tipo === 'numero' ? numero(v) : v === null || v === undefined || v === '' ? '—' : String(v));
const esNumerica = (tipo) => tipo === 'dinero' || tipo === 'numero';

const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fechaArchivo = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const nombreArchivo = (doc, tipo, ext) => `${tipo}-${slug(doc.archivo || doc.titulo)}_${fechaArchivo(doc.generado)}.${ext}`;

/** Totales de las columnas marcadas con `total`. */
const totales = (doc) => doc.columnas.map((c) => (c.total ? doc.filas.reduce((s, f) => s + Number(c.valor(f) || 0), 0) : null));

function descargar(partes, tipo, nombre) {
  const url = URL.createObjectURL(new Blob(partes, { type: tipo }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
export function zip(archivos) {
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
/** 0 -> A, 25 -> Z, 26 -> AA… */
export const letra = (i) => (i >= 26 ? letra(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26));

/** Hoja a partir de filas de celdas: texto, numero o { v, s, f: formula }; `s` es el estilo. */
function hoja(filas, anchos, congelar) {
  const xml = filas.map((fila, r) => {
    const celdas = fila.map((c, i) => {
      if (c === null || c === undefined || c === '') return '';
      const { v, s, f: formula } = typeof c === 'object' ? c : { v: c };
      const ref = `${letra(i)}${r + 1}`;
      const estilo = s ? ` s="${s}"` : '';
      if (formula) return `<c r="${ref}"${estilo}><f>${esc(formula)}</f><v>${v}</v></c>`;
      if (v === null || v === undefined || v === '') return estilo ? `<c r="${ref}"${estilo}/>` : '';
      return typeof v === 'number'
        ? `<c r="${ref}"${estilo}><v>${v}</v></c>`
        : `<c r="${ref}"${estilo} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${celdas}</row>`;
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetViews><sheetView workbookViewId="0" showGridLines="${congelar ? 1 : 0}">${congelar ? `<pane ySplit="${congelar}" topLeftCell="A${congelar + 1}" activePane="bottomLeft" state="frozen"/>` : ''}</sheetView></sheetViews>` +
    `<cols>${anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` +
    `<sheetData>${xml}</sheetData></worksheet>`;
}

/* Estilos: 1 encabezado · 2 dinero · 3 total (dinero) · 4 total (texto) · 5 titulo · 6 negrita · 7 numero · 8 total (numero) */
const ESTILOS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;C$&quot;\\ #,##0.00"/><numFmt numFmtId="165" formatCode="#,##0.###"/></numFmts>' +
  '<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FF2563EB"/><name val="Calibri"/></font></fonts>' +
  '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFEFF4FF"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="164" fontId="1" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="165" fontId="1" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

const celda = (v, tipo) => (tipo === 'dinero' ? { v: Number(v || 0), s: 2 } : tipo === 'numero' ? { v: Number(v || 0), s: 7 } : (v ?? ''));

/** Libro con la hoja «Datos» (las columnas de la tabla, con fila de totales
 *  como formula) y, si el modulo los da, la hoja «Resumen» con los
 *  indicadores y las agrupaciones. */
export function libroXlsx(doc) {
  const n = doc.filas.length;
  const sumas = totales(doc);
  const ENCAB = 4; // titulo, generado, filtros, encabezado de columnas
  const datos = [
    [{ v: `Parceros Multiservice · ${doc.titulo}`, s: 5 }],
    [`Generado: ${generadoTxt(doc.generado)} · ${n} registro(s)`],
    [doc.filtros?.length ? `Filtros: ${doc.filtros.map(([k, v]) => `${k}: ${v}`).join(' · ')}` : 'Sin filtros: todos los registros'],
    doc.columnas.map((c) => ({ v: c.titulo, s: 1 })),
    ...doc.filas.map((f) => doc.columnas.map((c) => celda(c.valor(f), c.tipo))),
  ];
  if (sumas.some((x) => x !== null)) {
    datos.push(doc.columnas.map((c, i) => {
      if (i === 0 && sumas[0] === null) return { v: 'TOTAL', s: 4 };
      if (sumas[i] === null) return { v: '', s: 4 };
      const col = letra(i);
      return { f: `SUM(${col}${ENCAB + 1}:${col}${Math.max(ENCAB + n, ENCAB + 1)})`, v: sumas[i], s: c.tipo === 'dinero' ? 3 : 8 };
    }));
  }
  const anchos = doc.columnas.map((c) => Math.max(10, Math.min(48, Math.round((c.ancho || 80) / 5.2))));

  const hojas = [{ nombre: 'Datos', xml: hoja(datos, anchos, ENCAB) }];
  if (doc.indicadores?.length || doc.grupos?.length) {
    const resumen = [[{ v: 'Parceros Multiservice', s: 5 }], [{ v: `Reporte de ${doc.titulo.toLowerCase()}`, s: 6 }], []];
    if (doc.indicadores?.length) {
      resumen.push([{ v: 'Indicador', s: 1 }, { v: 'Valor', s: 1 }]);
      doc.indicadores.forEach((k) => resumen.push([k.etiqueta, celda(k.valor, k.tipo)]));
      resumen.push([]);
    }
    (doc.grupos || []).forEach((g) => {
      resumen.push([{ v: g.titulo, s: 6 }]);
      resumen.push(g.columnas.map((t) => ({ v: t, s: 1 })));
      g.filas.forEach((f) => resumen.push(f.map((v, i) => celda(v, g.tipos?.[i]))));
      resumen.push([]);
    });
    hojas.unshift({ nombre: 'Resumen', xml: hoja(resumen, [40, 22, 22, 22], 0) });
  }

  const archivos = {
    '[Content_Types].xml': `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `${XML}<workbook xmlns="${NS}" xmlns:r="${REL}"><sheets>${hojas.map((h, i) => `<sheet name="${h.nombre}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${hojas.length + 1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': ESTILOS,
  };
  hojas.forEach((h, i) => { archivos[`xl/worksheets/sheet${i + 1}.xml`] = h.xml; });
  return zip(Object.entries(archivos).map(([nombre, xml]) => ({ nombre, datos: enc.encode(xml) })));
}

export function exportarExcel(doc) {
  doc = { generado: new Date(), ...doc };
  descargar(libroXlsx(doc), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', nombreArchivo(doc, 'listado', 'xlsx'));
}

/* ------------------------------------------------------------------ PDF */

/* Anchos de Helvetica (por mil) de ' ' a '~'; las letras acentuadas usan el de su base. */
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
const ESPECIALES = { '—': 0x97, '–': 0x96, '…': 0x85, '€': 0x80, '·': 0xb7 };
const lit = (s) => [...s].map((c) => {
  const b = ESPECIALES[c] ?? (c.charCodeAt(0) < 256 ? c.charCodeAt(0) : 63);
  return b === 92 || b === 40 || b === 41 ? '\\' + String.fromCharCode(b) : String.fromCharCode(b);
}).join('');
const rgb = (hex) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');

const AZUL = '#2563EB', TEXTO = '#111827', GRIS = '#6B7280', CLARO = '#EFF4FF', ZEBRA = '#F8FAFC', LINEA = '#D1D5DB';
const W = 842, H = 595, M = 36, ALTO_FILA = 18, LIMITE = H - 46;

/** Hoja A4 horizontal con cursor vertical y salto de pagina automatico. */
function lienzo(doc, subtitulo) {
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

  /* Encabezado de la primera pagina: banda azul, titulo y filtros. */
  nueva();
  rect(0, 0, W, 72, AZUL);
  texto('Parceros Multiservice', M, 34, { t: 22, neg: true, color: '#FFFFFF' });
  texto(subtitulo, M, 54, { t: 11, color: '#DBEAFE' });
  texto(`Generado: ${generadoTxt(doc.generado)}`, W - M, 34, { t: 9, color: '#DBEAFE', der: true });
  texto(`${doc.filas.length} registro(s)`, W - M, 54, { t: 9, color: '#DBEAFE', der: true });
  texto('FILTROS APLICADOS', M, 96, { t: 7.5, color: GRIS, neg: true });
  texto(doc.filtros?.length ? doc.filtros.map(([k, v]) => `${k}: ${v}`).join('   ·   ') : 'Ninguno: se incluyen todos los registros.', M, 110, { t: 10, ancho: W - 2 * M });
  let y = 126;

  /** Tabla paginada con encabezado repetido. Los anchos se ajustan al de la pagina. */
  const tabla = (titulo, columnas, filas, { tipos = [], pie = null, vacio = 'No hay registros para los filtros aplicados.' } = {}) => {
    const base = columnas.map((c) => c.ancho || 80);
    const escala = (W - 2 * M) / base.reduce((a, b) => a + b, 0);
    const anchos = base.map((w) => w * escala);
    const alinear = (i) => (esNumerica(tipos[i]) ? 'r' : 'l');
    const cabecera = () => {
      rect(M, y, W - 2 * M, 20, AZUL);
      let x = M;
      columnas.forEach((c, i) => {
        const w = anchos[i];
        texto(c.titulo, alinear(i) === 'r' ? x + w - 6 : x + 6, y + 13.5, { t: 8.5, neg: true, color: '#FFFFFF', der: alinear(i) === 'r', ancho: w - 10 });
        x += w;
      });
      y += 20;
    };
    const fila = (valores, fondo, negrita) => {
      if (fondo) rect(M, y, W - 2 * M, ALTO_FILA, fondo);
      let x = M;
      valores.forEach((v, i) => {
        const w = anchos[i];
        const txt = v === null || v === undefined ? '' : formatear(v, tipos[i]);
        texto(txt, alinear(i) === 'r' ? x + w - 6 : x + 6, y + 12, { t: 8, neg: negrita, der: alinear(i) === 'r', ancho: w - 10 });
        x += w;
      });
      y += ALTO_FILA;
    };

    if (y + 60 > LIMITE) { nueva(); y = M; }
    texto(titulo, M, y + 14, { t: 12, neg: true });
    y += 22;
    cabecera();
    if (!filas.length) { texto(vacio, M + 6, y + 14, { t: 9.5, color: GRIS }); y += 22; }
    filas.forEach((f, i) => {
      if (y + ALTO_FILA > LIMITE) { nueva(); y = M; cabecera(); }
      fila(f, i % 2 ? ZEBRA : null, false);
    });
    if (pie && filas.length) {
      if (y + ALTO_FILA > LIMITE) { nueva(); y = M; }
      fila(pie, CLARO, true);
    }
    y += 14;
  };

  /** Tarjetas de indicadores, cinco por renglon. */
  const tarjetas = (lista) => {
    const porFila = Math.min(5, lista.length);
    const wt = (W - 2 * M - (porFila - 1) * 10) / porFila;
    lista.forEach((k, i) => {
      const col = i % porFila;
      if (col === 0 && i) y += 68;
      if (col === 0 && y + 58 > LIMITE) { nueva(); y = M; }
      const x = M + col * (wt + 10);
      rect(x, y, wt, 58, CLARO, LINEA);
      texto(k.etiqueta.toUpperCase(), x + 10, y + 16, { t: 7.5, color: GRIS, neg: true, ancho: wt - 16 });
      texto(formatear(k.valor, k.tipo), x + 10, y + 36, { t: 13.5, neg: true, ancho: wt - 16 });
      if (k.nota) texto(k.nota, x + 10, y + 50, { t: 7.5, color: GRIS, ancho: wt - 16 });
    });
    y += 78;
  };

  /** Pie de pagina y armado del archivo. */
  const cerrar = (pieTxt) => {
    paginas.forEach((p, i) => {
      ops = p;
      ops.push(`${rgb(LINEA)} RG 0.6 w ${M} 32 m ${W - M} 32 l S`);
      texto(`Parceros Multiservice · ${pieTxt}`, M, H - 18, { t: 8, color: GRIS });
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
    return Uint8Array.from(pdf, (c) => c.charCodeAt(0) & 0xff);
  };

  return { tabla, tarjetas, cerrar };
}

const detalle = (doc) => {
  const sumas = totales(doc);
  const tipos = doc.columnas.map((c) => c.tipo);
  const pie = sumas.some((x) => x !== null) ? doc.columnas.map((_, i) => (sumas[i] !== null ? sumas[i] : i === 0 ? 'TOTAL' : '')) : null;
  return { filas: doc.filas.map((f) => doc.columnas.map((c) => c.valor(f))), tipos, pie };
};

/** PDF del listado: la tabla con su fila de totales. */
export function pdfListado(doc) {
  const l = lienzo(doc, `Listado de ${doc.titulo.toLowerCase()}`);
  const d = detalle(doc);
  l.tabla(doc.titulo, doc.columnas, d.filas, { tipos: d.tipos, pie: d.pie });
  return l.cerrar(`Listado de ${doc.titulo.toLowerCase()}`);
}

/** PDF del reporte: indicadores, resumen agrupado y detalle. */
export function pdfReporte(doc) {
  const l = lienzo(doc, `Reporte de ${doc.titulo.toLowerCase()}`);
  if (doc.indicadores?.length) l.tarjetas(doc.indicadores);
  (doc.grupos || []).forEach((g) => {
    l.tabla(g.titulo, g.columnas.map((titulo, i) => ({ titulo, ancho: i === 0 ? 240 : 110 })), g.filas, { tipos: g.tipos || [], vacio: 'Sin datos.' });
  });
  const d = detalle(doc);
  l.tabla(`Detalle de ${doc.titulo.toLowerCase()}`, doc.columnas, d.filas, { tipos: d.tipos, pie: d.pie });
  return l.cerrar(`Reporte de ${doc.titulo.toLowerCase()}`);
}

export function exportarPdf(doc) {
  doc = { generado: new Date(), ...doc };
  descargar([pdfListado(doc)], 'application/pdf', nombreArchivo(doc, 'listado', 'pdf'));
}

export function generarReporte(doc) {
  doc = { generado: new Date(), ...doc };
  descargar([pdfReporte(doc)], 'application/pdf', nombreArchivo(doc, 'reporte', 'pdf'));
}

/* ------------------------------------------------------------ Agrupar */

/**
 * Resumen agrupado para el reporte: una fila por valor de `clave(fila)` con
 * el numero de registros y la suma de `monto(fila)`, de mayor a menor.
 */
export function agrupar(filas, clave, monto) {
  const m = new Map();
  filas.forEach((f) => {
    const k = clave(f) || '—';
    const g = m.get(k) || { n: 0, total: 0 };
    g.n += 1;
    g.total += monto ? Number(monto(f) || 0) : 0;
    m.set(k, g);
  });
  return [...m].sort((a, b) => b[1].total - a[1].total || b[1].n - a[1].n).map(([k, g]) => (monto ? [k, g.n, g.total] : [k, g.n]));
}
