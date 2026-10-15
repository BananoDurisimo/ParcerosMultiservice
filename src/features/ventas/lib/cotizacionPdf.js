/**
 * Cotizacion en PDF para entregar al cliente (A4 vertical).
 *
 * Lleva el encabezado de la empresa, los datos del cliente, los productos y
 * la personalizacion con sus precios, el total con el abono inicial (50%),
 * la descripcion acordada y la imagen del diseño. Los insumos de la receta
 * no aparecen: son internos del taller.
 *
 * `pdfCotizacion` arma el archivo con los datos ya resueltos (se puede probar
 * fuera del navegador); `descargarCotizacion` resuelve los datos, convierte
 * la imagen del diseño a JPEG y lo descarga.
 */
import { documentoPdf, envolver, descargar, dinero, COLORES_PDF } from '@shared/lib/exportar.js';
import { TELEFONO, CORREO, DIRECCION } from '@features/home/data/contacto.js';

const { AZUL, TEXTO, GRIS, CLARO, ZEBRA, LINEA } = COLORES_PDF;
const W = 595, H = 842, M = 40, FILA = 20, LIMITE = H - 60;
const fechaTxt = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const cant = (n) => Number(n || 0).toLocaleString('es-NI', { maximumFractionDigits: 3 });

/**
 * `c`: { codigo, fecha, estado, cliente: { nombre, documento, telefono, correo },
 *        productos: [{ nombre, detalle, cantidad, precio }],
 *        insumos: [{ nombre, unidad, cantidad, precio }],
 *        descripcion, generado (Date) }
 * `diseno`: { bytes, ancho, alto } en JPEG, o null.
 */
export function pdfCotizacion(c, diseno) {
  const d = documentoPdf({ ancho: W, alto: H });
  const { rect, texto, linea } = d;
  let y;
  const pagina = (primera) => {
    d.nueva();
    if (primera) return;
    rect(0, 0, W, 40, AZUL);
    texto(`Cotización ${c.codigo} · ${c.cliente.nombre}`, M, 25, { t: 10, neg: true, color: '#FFFFFF', ancho: W - 2 * M });
    y = 60;
  };
  const espacio = (alto) => { if (y + alto > LIMITE) pagina(false); };

  /* ---- Encabezado ---- */
  pagina(true);
  rect(0, 0, W, 96, AZUL);
  texto('Parceros Multiservice', M, 40, { t: 21, neg: true, color: '#FFFFFF' });
  texto('Uniformes deportivos personalizados', M, 60, { t: 10, color: '#DBEAFE' });
  texto(`${TELEFONO.texto} · ${CORREO}`, M, 78, { t: 8.5, color: '#DBEAFE' });
  texto('COTIZACIÓN', W - M, 40, { t: 17, neg: true, color: '#FFFFFF', der: true });
  texto(c.codigo, W - M, 60, { t: 11, neg: true, color: '#DBEAFE', der: true });
  texto(`Fecha: ${fechaTxt(c.fecha)}`, W - M, 78, { t: 8.5, color: '#DBEAFE', der: true });

  /* ---- Cliente ---- */
  y = 116;
  rect(M, y, W - 2 * M, 66, CLARO, LINEA);
  texto('CLIENTE', M + 12, y + 16, { t: 7.5, neg: true, color: GRIS });
  texto(c.cliente.nombre, M + 12, y + 33, { t: 12.5, neg: true, ancho: 300 });
  texto(c.cliente.documento || '', M + 12, y + 50, { t: 9, color: GRIS, ancho: 300 });
  texto('CONTACTO', W - M - 190, y + 16, { t: 7.5, neg: true, color: GRIS });
  texto(c.cliente.telefono || '—', W - M - 190, y + 33, { t: 9.5, ancho: 178 });
  texto(c.cliente.correo || '—', W - M - 190, y + 50, { t: 9, color: GRIS, ancho: 178 });
  y += 86;

  /* ---- Tablas ---- */
  const tabla = (titulo, columnas, filas) => {
    espacio(46 + FILA);
    texto(titulo, M, y + 12, { t: 11.5, neg: true });
    y += 20;
    const cabecera = () => {
      rect(M, y, W - 2 * M, FILA, AZUL);
      let x = M;
      columnas.forEach((col) => {
        const der = col.al === 'r';
        texto(col.t, der ? x + col.w - 6 : x + 6, y + 13.5, { t: 8, neg: true, color: '#FFFFFF', der, ancho: col.w - 10 });
        x += col.w;
      });
      y += FILA;
    };
    cabecera();
    filas.forEach((f, i) => {
      if (y + FILA > LIMITE) { pagina(false); cabecera(); }
      if (i % 2) rect(M, y, W - 2 * M, FILA, ZEBRA);
      let x = M;
      columnas.forEach((col, k) => {
        const der = col.al === 'r';
        texto(f[k], der ? x + col.w - 6 : x + 6, y + 13.5, { t: 8.5, der, ancho: col.w - 10 });
        x += col.w;
      });
      y += FILA;
    });
    linea(M, y, W - M, y);
    y += 16;
  };

  const subtotal = (l) => Number(l.cantidad || 0) * Number(l.precio || 0);
  const totalProductos = c.productos.reduce((s, l) => s + subtotal(l), 0);
  const totalInsumos = c.insumos.reduce((s, l) => s + subtotal(l), 0);
  const total = Math.round((totalProductos + totalInsumos) * 100) / 100;

  if (c.productos.length) {
    tabla('Productos', [
      { t: 'Producto', w: 160 }, { t: 'Detalle', w: 140 }, { t: 'Cant.', w: 45, al: 'r' },
      { t: 'Precio unit.', w: 85, al: 'r' }, { t: 'Subtotal', w: 85, al: 'r' },
    ], c.productos.map((l) => [l.nombre, l.detalle, cant(l.cantidad), dinero(l.precio), dinero(subtotal(l))]));
  }
  if (c.insumos.length) {
    tabla('Personalización', [
      { t: 'Insumo', w: 250 }, { t: 'Cantidad', w: 95, al: 'r' },
      { t: 'Precio unit.', w: 85, al: 'r' }, { t: 'Subtotal', w: 85, al: 'r' },
    ], c.insumos.map((l) => [l.nombre, `${cant(l.cantidad)} ${l.unidad}`, dinero(l.precio), dinero(subtotal(l))]));
  }

  /* ---- Totales ---- */
  const filasTotal = [
    ...(c.productos.length && c.insumos.length ? [['Subtotal productos', dinero(totalProductos)], ['Subtotal personalización', dinero(totalInsumos)]] : []),
    ['TOTAL', dinero(total)],
    ['Abono inicial (50%)', dinero(Math.round(total * 50) / 100)],
  ];
  espacio(filasTotal.length * 20 + 10);
  const xt = W - M - 250;
  filasTotal.forEach(([k, v]) => {
    const esTotal = k === 'TOTAL';
    if (esTotal) rect(xt, y, 250, 22, CLARO);
    texto(k, xt + 10, y + 15, { t: esTotal ? 11 : 9, neg: esTotal, color: esTotal ? TEXTO : GRIS });
    texto(v, W - M - 10, y + 15, { t: esTotal ? 12 : 9.5, neg: true, der: true, color: esTotal ? AZUL : TEXTO });
    y += esTotal ? 24 : 18;
  });
  y += 10;

  /* ---- Descripcion ---- */
  if (c.descripcion) {
    const renglones = envolver(c.descripcion, W - 2 * M - 24, 9.5);
    espacio(40 + Math.min(renglones.length, 6) * 13);
    texto('Descripción de la personalización', M, y + 12, { t: 11.5, neg: true });
    y += 22;
    const alto = renglones.length * 13 + 16;
    if (y + alto <= LIMITE) rect(M, y, W - 2 * M, alto, ZEBRA, LINEA);
    y += 16;
    renglones.forEach((r) => { espacio(13); texto(r, M + 12, y, { t: 9.5 }); y += 13; });
    y += 14;
  }

  /* ---- Diseño ---- */
  if (diseno) {
    const nombre = d.registrarImagen(diseno);
    /* Se ajusta al espacio que queda en la pagina (titulo + condiciones del
       final incluidos) si alcanza para verlo bien; si no, va a la siguiente. */
    const libre = LIMITE - y - 22 - 16 - 40;
    if (libre < 170) pagina(false);
    const maxW = W - 2 * M, maxH = Math.min(300, libre < 170 ? 300 : libre);
    const k = Math.min(maxW / diseno.ancho, maxH / diseno.alto, 1.5);
    const iw = diseno.ancho * k, ih = diseno.alto * k;
    espacio(ih + 30);
    texto('Diseño aprobado', M, y + 12, { t: 11.5, neg: true });
    y += 22;
    d.imagen(nombre, M + (maxW - iw) / 2, y, iw, ih);
    y += ih + 16;
  }

  /* ---- Condiciones ---- */
  espacio(40);
  envolver('Precios en córdobas (C$). El pedido inicia al registrar el abono inicial (50% del total o el pago completo); el saldo se cancela antes de la entrega.', W - 2 * M, 8.5)
    .forEach((r) => { texto(r, M, y + 10, { t: 8.5, color: GRIS }); y += 12; });

  return d.armar((i, totalPaginas) => {
    linea(M, H - 40, W - M, H - 40);
    texto(`Parceros Multiservice · ${DIRECCION}`, M, H - 24, { t: 7.5, color: GRIS, ancho: W - 2 * M - 80 });
    texto(`Página ${i + 1} de ${totalPaginas}`, W - M, H - 24, { t: 7.5, color: GRIS, der: true });
  });
}

/** Imagen (data URL de cualquier formato) -> JPEG { bytes, ancho, alto }, con fondo blanco. */
export function aJpeg(dataUrl, maximo = 1400) {
  return new Promise((resolve) => {
    if (!dataUrl) { resolve(null); return; }
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maximo / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * k));
      const h = Math.max(1, Math.round(img.naturalHeight * k));
      const cv = Object.assign(document.createElement('canvas'), { width: w, height: h });
      const g = cv.getContext('2d');
      g.fillStyle = '#FFFFFF';
      g.fillRect(0, 0, w, h);
      g.drawImage(img, 0, 0, w, h);
      const bin = atob(cv.toDataURL('image/jpeg', 0.88).split(',')[1]);
      resolve({ bytes: Uint8Array.from(bin, (ch) => ch.charCodeAt(0)), ancho: w, alto: h });
    };
    img.onerror = () => resolve(null); // sin imagen valida, la cotizacion sale sin diseño
    img.src = dataUrl;
  });
}

/** Datos de la cotizacion a partir del registro (`r` de db.pedidos). */
export function datosCotizacion(r, db) {
  const cli = db.clientes.find((x) => x.id === r.id_cliente) || {};
  return {
    codigo: r.calc_codigo,
    fecha: r.fecha_creacion,
    cliente: {
      nombre: cli.nombre || r.calc_cliente,
      documento: cli.documento ? `${cli.tipodocumento}: ${cli.documento}` : '',
      telefono: cli.telefono,
      correo: cli.correo,
    },
    productos: (r.productos || []).map((l) => {
      const p = db.productos.find((x) => x.id === l.id_producto);
      return {
        nombre: p?.nombre || `Producto #${l.id_producto}`,
        detalle: p ? `${p.calc_categoria} · Talla ${p.calc_talla} · ${p.calc_tela}` : '',
        cantidad: l.cantidad,
        precio: l.precio_unitario,
      };
    }),
    insumos: (r.insumos || []).map((l) => {
      const i = db.insumos.find((x) => x.id === l.id_insumo);
      return { nombre: i?.nombre || `Insumo #${l.id_insumo}`, unidad: i?.calc_abreviatura || '', cantidad: l.cantidad, precio: l.precio_unitario };
    }),
    descripcion: r.descripcion,
  };
}

export async function descargarCotizacion(r, db) {
  const diseno = await aJpeg(r.imagen_diseno);
  const pdf = pdfCotizacion(datosCotizacion(r, db), diseno);
  descargar([pdf], 'application/pdf', `cotizacion-${r.calc_codigo}.pdf`);
}
