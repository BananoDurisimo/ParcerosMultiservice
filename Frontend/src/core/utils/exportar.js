/**
 * Exportacion de los listados y reportes a Excel (.xlsx), y la base de PDF
 * que usa la cotizacion (core/utils/cotizacionPdf.js).
 *
 * Sin librerias: el proyecto no usa dependencias de terceros. El .xlsx es un
 * zip (sin comprimir) de XML escrito a mano y el PDF se arma con las fuentes
 * estandar Helvetica, asi que no hay nada que instalar.
 *
 * Cada modulo arma el documento con las filas que la tabla muestra en ese
 * momento (busqueda y filtros aplicados), de modo que lo exportado coincide
 * con lo que se ve:
 *
 *   {
 *     titulo: 'Abonos',                 // nombre del modulo
 *     archivo: 'abonos',                // base del nombre del archivo
 *     filtros: [['Búsqueda', 'ana'], …], // lo aplicado en la tabla
 *     columnas: [{ titulo, valor(fila), tipo: 'texto'|'dinero'|'numero', ancho, total }],
 *     filas: [...],
 *     indicadores: [{ etiqueta, valor, tipo, nota }],          // hoja Resumen
 *     grupos: [{ titulo, columnas: [...], tipos: [...], filas: [[...]] }], // idem
 *   }
 *
 * El libro trae la hoja «Detalle» (la tabla con encabezado, filtros de
 * columna y fila de totales) y, si el modulo los da, la hoja «Resumen» con
 * los indicadores y las agrupaciones (por estado, por metodo de pago…).
 */

export const dinero = (n) => 'C$ ' + Number(n || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numero = (n) => Number(n || 0).toLocaleString('es-NI', { maximumFractionDigits: 3 });
const generadoTxt = (d) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fechaArchivo = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const nombreArchivo = (doc, tipo, ext) => `${tipo}-${slug(doc.archivo || doc.titulo)}_${fechaArchivo(doc.generado)}.${ext}`;

/** Totales de las columnas marcadas con `total`. */
const totales = (doc) => doc.columnas.map((c) => (c.total ? doc.filas.reduce((s, f) => s + Number(c.valor(f) || 0), 0) : null));

export function descargar(partes, tipo, nombre) {
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

/* Estilos (indice de cellXfs). Las celdas de las tablas llevan borde fino. */
const S = { ENCABEZADO: 1, DINERO: 2, TOTAL_DINERO: 3, TOTAL_TEXTO: 4, TITULO: 5, NEGRITA: 6, NUMERO: 7, TOTAL_NUMERO: 8, TEXTO: 9, NOTA: 10 };
const ESTILOS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;C$&quot;\\ #,##0.00"/><numFmt numFmtId="165" formatCode="#,##0.###"/></numFmts>' +
  '<fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FF2563EB"/><name val="Calibri"/></font>' +
  '<font><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font></fonts>' +
  '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFEFF4FF"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="11"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
  '<xf numFmtId="164" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
  '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +
  '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
  '<xf numFmtId="165" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
  '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/** Celda de una tabla segun su tipo: los importes y cantidades van como numero. */
const celda = (v, tipo) => (tipo === 'dinero' ? { v: Number(v || 0), s: S.DINERO }
  : tipo === 'numero' ? { v: Number(v || 0), s: S.NUMERO }
    : { v: v === null || v === undefined || v === '' ? '—' : String(v), s: S.TEXTO });

/** Ancho de columna (en caracteres) a partir de lo que va a mostrar. */
const largo = (v, tipo) => String(tipo === 'dinero' ? dinero(v) : tipo === 'numero' ? numero(v) : v ?? '').length;
const anchoColumna = (titulo, valores, tipo) =>
  Math.max(10, Math.min(60, Math.max(String(titulo).length, ...valores.map((v) => largo(v, tipo))) + 3));

/**
 * Hoja a partir de filas de celdas (texto, numero o { v, s, f: formula }).
 * `altos`: { fila: alto }; `filtro`: rango con filtros de columna;
 * `combinar`: rangos de celdas combinadas; `congelar`: filas fijas arriba.
 */
function hoja(filas, { anchos, congelar = 0, filtro, combinar = [], altos = {}, activa = false }) {
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
    const alto = altos[r] ? ` ht="${altos[r]}" customHeight="1"` : '';
    return `<row r="${r + 1}"${alto}>${celdas}</row>`;
  }).join('');
  const panel = congelar ? `<pane ySplit="${congelar}" topLeftCell="A${congelar + 1}" activePane="bottomLeft" state="frozen"/>` : '';
  return XML +
    `<worksheet xmlns="${NS}">` +
    `<sheetViews><sheetView workbookViewId="0"${activa ? ' tabSelected="1"' : ''}>${panel}</sheetView></sheetViews>` +
    '<sheetFormatPr defaultRowHeight="18"/>' +
    `<cols>${anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` +
    `<sheetData>${xml}</sheetData>` +
    (filtro ? `<autoFilter ref="${filtro}"/>` : '') +
    (combinar.length ? `<mergeCells count="${combinar.length}">${combinar.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '') +
    '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' +
    '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
    '</worksheet>';
}

/** Libro con la hoja «Detalle» y, si el modulo los da, la hoja «Resumen». */
export function libroXlsx(doc) {
  const n = doc.filas.length;
  const nc = doc.columnas.length;
  const ultima = letra(Math.max(nc, 2) - 1);
  const sumas = totales(doc);
  const tipos = doc.columnas.map((c) => c.tipo);
  const ENCAB = 5; // titulo, generado, filtros, renglon en blanco y encabezado de columnas
  const valores = doc.filas.map((f) => doc.columnas.map((c) => c.valor(f)));
  const datos = [
    [{ v: `Parceros Multiservice · ${doc.titulo}`, s: S.TITULO }],
    [{ v: `Generado: ${generadoTxt(doc.generado)} · ${n} registro(s)`, s: S.NOTA }],
    [{ v: doc.filtros?.length ? `Filtros: ${doc.filtros.map(([k, v]) => `${k}: ${v}`).join(' · ')}` : 'Sin filtros: todos los registros', s: S.NOTA }],
    [],
    doc.columnas.map((c) => ({ v: c.titulo, s: S.ENCABEZADO })),
    ...valores.map((fila) => fila.map((v, i) => celda(v, tipos[i]))),
  ];
  if (sumas.some((x) => x !== null)) {
    datos.push(doc.columnas.map((c, i) => {
      if (i === 0 && sumas[0] === null) return { v: 'TOTAL', s: S.TOTAL_TEXTO };
      if (sumas[i] === null) return { v: '', s: S.TOTAL_TEXTO };
      const col = letra(i);
      return { f: `SUBTOTAL(9,${col}${ENCAB + 1}:${col}${Math.max(ENCAB + n, ENCAB + 1)})`, v: sumas[i], s: c.tipo === 'dinero' ? S.TOTAL_DINERO : S.TOTAL_NUMERO };
    }));
  }
  const anchos = doc.columnas.map((c, i) => anchoColumna(c.titulo, valores.map((f) => f[i]), tipos[i]));
  const rangoTabla = `A${ENCAB}:${letra(nc - 1)}${ENCAB + Math.max(n, 1)}`;

  const hojas = [{
    nombre: 'Detalle',
    filtro: rangoTabla,
    xml: hoja(datos, {
      anchos, congelar: ENCAB, filtro: rangoTabla, activa: true,
      combinar: [`A1:${ultima}1`, `A2:${ultima}2`, `A3:${ultima}3`], altos: { 0: 26, [ENCAB - 1]: 30 },
    }),
  }];

  if (doc.indicadores?.length || doc.grupos?.length) {
    const resumen = [[{ v: `Parceros Multiservice · Reporte de ${doc.titulo.toLowerCase()}`, s: S.TITULO }], [{ v: `Generado: ${generadoTxt(doc.generado)}`, s: S.NOTA }], []];
    const altos = { 0: 26 };
    /* Ancho de cada columna: el texto mas largo que recibe. */
    const largos = [0, 0, 0];
    const medir = (vals, tiposFila = []) => vals.forEach((v, i) => { if (i < largos.length) largos[i] = Math.max(largos[i], largo(v, tiposFila[i])); });
    if (doc.indicadores?.length) {
      resumen.push([{ v: 'Indicador', s: S.ENCABEZADO }, { v: 'Valor', s: S.ENCABEZADO }, { v: 'Nota', s: S.ENCABEZADO }]);
      altos[resumen.length - 1] = 24;
      doc.indicadores.forEach((k) => {
        medir([k.etiqueta, k.valor, k.nota], [null, k.tipo]);
        resumen.push([{ v: k.etiqueta, s: S.TEXTO }, celda(k.valor, k.tipo), { v: k.nota || '', s: S.TEXTO }]);
      });
      resumen.push([]);
    }
    (doc.grupos || []).forEach((g) => {
      resumen.push([{ v: g.titulo, s: S.NEGRITA }]);
      resumen.push(g.columnas.map((t) => ({ v: t, s: S.ENCABEZADO })));
      altos[resumen.length - 1] = 24;
      medir(g.columnas);
      g.filas.forEach((f) => {
        medir(f, g.tipos);
        resumen.push(f.map((v, i) => celda(v, g.tipos?.[i])));
      });
      resumen.push([]);
    });
    hojas.push({ nombre: 'Resumen', xml: hoja(resumen, { anchos: largos.map((l) => Math.max(14, Math.min(60, l + 3))), altos }) });
  }

  /* Excel guarda el rango de los filtros de columna como un nombre oculto. */
  const absoluto = (rango) => rango.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2');
  const filtros = hojas.map((h, i) => (h.filtro
    ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${h.nombre}'!${absoluto(h.filtro)}</definedName>`
    : '')).join('');
  const archivos = {
    '[Content_Types].xml': `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `${XML}<workbook xmlns="${NS}" xmlns:r="${REL}"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${hojas.map((h, i) => `<sheet name="${h.nombre}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${filtros ? `<definedNames>${filtros}</definedNames>` : ''}</workbook>`,
    'xl/_rels/workbook.xml.rels': `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${hojas.length + 1}" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': ESTILOS,
  };
  hojas.forEach((h, i) => { archivos[`xl/worksheets/sheet${i + 1}.xml`] = h.xml; });
  return zip(Object.entries(archivos).map(([nombre, xml]) => ({ nombre, datos: enc.encode(xml) })));
}

export function exportarExcel(doc) {
  doc = { generado: new Date(), ...doc };
  descargar(libroXlsx(doc), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', nombreArchivo(doc, 'reporte', 'xlsx'));
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

export const COLORES_PDF = { AZUL: '#2563EB', TEXTO: '#111827', GRIS: '#6B7280', CLARO: '#EFF4FF', ZEBRA: '#F8FAFC', LINEA: '#D1D5DB' };
const { TEXTO, LINEA } = COLORES_PDF;
const W = 842, H = 595;

/** Parte un texto en renglones que caben en `max` puntos (respeta los saltos de linea). */
export const envolver = (s, max, t = 9, neg = false) =>
  String(s ?? '').split(/\r?\n/).flatMap((parrafo) => {
    const lineas = [];
    let actual = '';
    parrafo.split(/\s+/).filter(Boolean).forEach((palabra) => {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (ancho(prueba, t, neg) <= max || !actual) actual = prueba;
      else { lineas.push(actual); actual = palabra; }
    });
    return [...lineas, actual];
  });

/**
 * Documento PDF de bajo nivel: paginas, rectangulos, lineas, texto con
 * Helvetica e imagenes JPEG. Las coordenadas se dan desde la esquina
 * superior izquierda (y crece hacia abajo), como en pantalla.
 *
 *   const d = documentoPdf({ ancho: 595, alto: 842 }); // A4 vertical
 *   d.nueva(); d.texto('Hola', 40, 60, { t: 14, neg: true });
 *   const img = d.registrarImagen({ bytes, ancho, alto }); d.imagen(img, 40, 80, 200, 120);
 *   const pdf = d.armar(); // Uint8Array
 */
export function documentoPdf({ ancho: AW = W, alto: AH = H } = {}) {
  const paginas = [];
  const imagenes = [];
  let ops;
  const nueva = () => { ops = []; paginas.push(ops); };
  const rect = (x, y, w, h, color, borde) =>
    ops.push(`${rgb(color)} rg ${x} ${AH - y - h} ${w} ${h} re f` + (borde ? ` ${rgb(borde)} RG 0.6 w ${x} ${AH - y - h} ${w} ${h} re S` : ''));
  const linea = (x1, y1, x2, y2, color = LINEA, grosor = 0.6) =>
    ops.push(`${rgb(color)} RG ${grosor} w ${x1} ${AH - y1} m ${x2} ${AH - y2} l S`);
  const texto = (s, x, y, { t = 9, neg = false, color = TEXTO, der = false, centro = false, ancho: max } = {}) => {
    const str = max ? recortar(String(s), max, t, neg) : String(s);
    const w = ancho(str, t, neg);
    const px = der ? x - w : centro ? x - w / 2 : x;
    ops.push(`BT /${neg ? 'F2' : 'F1'} ${t} Tf ${rgb(color)} rg ${px.toFixed(2)} ${AH - y} Td (${lit(str)}) Tj ET`);
  };
  /** `bytes`: Uint8Array de un JPEG. Devuelve el nombre con que se dibuja. */
  const registrarImagen = ({ bytes, ancho: iw, alto: ih }) => {
    imagenes.push({ bytes, iw, ih });
    return `Im${imagenes.length}`;
  };
  const imagen = (nombre, x, y, w, h) => ops.push(`q ${w} 0 0 ${h} ${x} ${AH - y - h} cm /${nombre} Do Q`);

  /** `pie(i, total)` dibuja el pie de cada pagina antes de armar el archivo. */
  const armar = (pie) => {
    if (pie) paginas.forEach((p, i) => { ops = p; pie(i, paginas.length); });
    /* Objetos: 1 catalogo · 2 paginas · 3-4 fuentes · imagenes · luego (pagina, contenido) por cada hoja. */
    const base = 5 + imagenes.length;
    const objetos = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      `<< /Type /Pages /Count ${paginas.length} /Kids [${paginas.map((_, i) => `${base + 2 * i} 0 R`).join(' ')}] >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    ];
    imagenes.forEach(({ bytes, iw, ih }) => {
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      objetos.push(`<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n${bin}\nendstream`);
    });
    const recursosImg = imagenes.length ? ` /XObject << ${imagenes.map((_, i) => `/Im${i + 1} ${5 + i} 0 R`).join(' ')} >>` : '';
    paginas.forEach((p, i) => {
      const flujo = p.join('\n');
      objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${AW} ${AH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${recursosImg} >> /Contents ${base + 1 + 2 * i} 0 R >>`);
      objetos.push(`<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`);
    });
    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = objetos.map((o, i) => { const at = pdf.length; pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Uint8Array.from(pdf, (c) => c.charCodeAt(0) & 0xff);
  };

  return { nueva, rect, linea, texto, registrarImagen, imagen, armar, ancho: AW, alto: AH };
}

/* ------------------------------------------------------------ Agrupar */

/**
 * Resumen agrupado para el reporte (hoja Resumen del Excel): una fila por valor de `clave(fila)` con
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
