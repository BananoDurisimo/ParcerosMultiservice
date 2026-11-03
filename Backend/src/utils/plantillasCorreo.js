import { escaparHtml as h } from './helpers.js';

/*
 * Plantillas HTML de los correos. Van con tablas y estilos en linea porque
 * Gmail, Outlook y los clientes moviles ignoran las hojas de estilo y el
 * diseño con flex o grid.
 */

/* Datos de contacto del negocio (los mismos del sitio publico). */
export const EMPRESA = {
  nombre: 'Parceros Multiservice',
  lema: 'Uniformes deportivos personalizados',
  logo: 'https://bananodurisimo.github.io/ParcerosMultiservice/logo.jpg',
  whatsapp: '50589920326',
  telefono: '+505 8992 0326',
  correo: 'Pcero2019@gmail.com',
  direccion: 'De la escuela Máximo Jerez, 2 c. al sur y 10 al este, Managua',
};

const C = {
  navy: '#0A1A33', azul: '#2563EB', azulSuave: '#EFF4FF', texto: '#111827', gris: '#4B5563',
  linea: '#E5E7EB', fondo: '#F3F4F6', verde: '#16A34A', verdeSuave: '#ECFDF3', ambar: '#B45309', ambarSuave: '#FFF7E6',
};
const FUENTE = "font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

const dinero = (n) => `C$ ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fecha = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

/* Mensaje y color de cada estado (por su `orden` en estado_pedido). */
const ESTADOS = {
  1: { titulo: 'Recibimos su cotización aprobada', color: C.azul, fondo: C.azulSuave,
    texto: 'Ya tenemos registrada su cotización. Para iniciar la confección solo falta el abono inicial, de al menos el 50% del total.' },
  2: { titulo: '¡Su pedido ya está en producción!', color: C.azul, fondo: C.azulSuave,
    texto: 'Recibimos su abono y empezamos a confeccionar sus prendas. Le avisaremos en cuanto estén listas.' },
  3: { titulo: 'Sus prendas están listas', color: C.ambar, fondo: C.ambarSuave,
    texto: 'Terminamos la confección de su pedido. Para entregárselo queda pendiente el saldo que verá abajo.' },
  4: { titulo: '¡Su pedido está listo para entrega!', color: C.verde, fondo: C.verdeSuave,
    texto: 'Sus prendas están terminadas y el pedido está pagado en su totalidad. Escríbanos para coordinar la entrega.' },
  5: { titulo: '¡Gracias por su compra!', color: C.verde, fondo: C.verdeSuave,
    texto: 'Registramos la entrega de su pedido. Esperamos que disfrute sus uniformes y que nos vuelva a elegir.' },
};

/* Recorrido que ve el cliente: los dos estados de "completado" son un solo paso. */
const PASOS = ['Cotización', 'En producción', 'Listo', 'Entregado'];
const PASO_DE_ORDEN = { 1: 0, 2: 1, 3: 2, 4: 2, 5: 3 };

function recorrido(orden) {
  const actual = PASO_DE_ORDEN[orden] ?? 0;
  const celdas = PASOS.map((nombre, i) => {
    const hecho = i <= actual;
    const circulo = hecho ? C.azul : '#FFFFFF';
    const borde = hecho ? C.azul : '#CBD5E1';
    const numero = hecho ? '#FFFFFF' : '#94A3B8';
    return `<td align="center" valign="top" width="25%" style="padding:0 4px;">
        <div style="width:30px;height:30px;line-height:30px;border-radius:50%;background:${circulo};border:2px solid ${borde};color:${numero};font-weight:700;font-size:13px;${FUENTE}margin:0 auto;">${i < actual ? '&#10003;' : i + 1}</div>
        <div style="margin-top:6px;font-size:12px;${FUENTE}color:${i === actual ? C.texto : C.gris};font-weight:${i === actual ? 700 : 400};">${nombre}</div>
      </td>`;
  }).join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 4px;"><tr>${celdas}</tr></table>`;
}

const fila = (etiqueta, valor, resaltar) => `<tr>
    <td style="padding:9px 0;border-bottom:1px solid ${C.linea};${FUENTE}font-size:14px;color:${C.gris};">${etiqueta}</td>
    <td align="right" style="padding:9px 0;border-bottom:1px solid ${C.linea};${FUENTE}font-size:14px;color:${resaltar || C.texto};font-weight:${resaltar ? 700 : 600};">${valor}</td>
  </tr>`;

const boton = (texto, enlace, color) =>
  `<a href="${enlace}" style="display:inline-block;background:${color};color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;${FUENTE}padding:12px 22px;border-radius:8px;">${texto}</a>`;

/** Marco comun: encabezado con el logo, contenido y pie con el contacto. */
function marco(contenido, preencabezado) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(EMPRESA.nombre)}</title></head>
<body style="margin:0;padding:0;background:${C.fondo};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${h(preencabezado)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.fondo};">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid ${C.linea};">
        <tr><td style="background:${C.navy};padding:22px 28px;">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td style="padding-right:14px;"><img src="${EMPRESA.logo}" width="48" height="48" alt="Parceros" style="display:block;border-radius:10px;border:0;"></td>
            <td style="${FUENTE}">
              <div style="color:#FFFFFF;font-size:18px;font-weight:700;">${EMPRESA.nombre}</div>
              <div style="color:#9FB3D1;font-size:13px;margin-top:2px;">${EMPRESA.lema}</div>
            </td>
          </tr></table>
        </td></tr>
        ${contenido}
        <tr><td style="background:#F9FAFB;border-top:1px solid ${C.linea};padding:20px 28px;${FUENTE}font-size:12px;line-height:1.6;color:${C.gris};">
          <strong style="color:${C.texto};">${EMPRESA.nombre}</strong> · ${h(EMPRESA.direccion)}<br>
          Tel. ${EMPRESA.telefono} · <a href="mailto:${EMPRESA.correo}" style="color:${C.azul};text-decoration:none;">${EMPRESA.correo}</a><br>
          Este es un mensaje automático; para cualquier consulta escríbanos por WhatsApp o al correo.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Aviso al cliente del estado de su pedido.
 * `p`: { codigo, nombre, estado, orden, fecha_creacion, fecha_entrega, total, abonado, saldo, productos: [{ nombre, cantidad }] }
 */
export function correoEstadoPedido(p) {
  const e = ESTADOS[p.orden] || { titulo: `Su pedido cambió a «${p.estado}»`, texto: '', color: C.azul, fondo: C.azulSuave };
  const saldo = Number(p.saldo || 0);
  const whatsapp = `https://wa.me/${EMPRESA.whatsapp}?text=${encodeURIComponent(`Hola, les escribo por mi pedido ${p.codigo}.`)}`;
  const productos = (p.productos || []).length
    ? `<tr><td style="padding:4px 28px 0;">
        <div style="${FUENTE}font-size:13px;font-weight:700;color:${C.texto};text-transform:uppercase;letter-spacing:.04em;margin:14px 0 6px;">Productos</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          ${p.productos.map((l) => fila(h(l.nombre), `${Number(l.cantidad)} und.`)).join('')}
        </table>
      </td></tr>`
    : '';

  const contenido = `
        <tr><td style="padding:28px 28px 6px;${FUENTE}">
          <div style="font-size:15px;color:${C.gris};">Hola, <strong style="color:${C.texto};">${h(p.nombre)}</strong>:</div>
          <h1 style="margin:10px 0 8px;font-size:23px;line-height:1.25;color:${C.texto};${FUENTE}">${e.titulo}</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:${C.gris};">${e.texto}</p>
        </td></tr>
        <tr><td style="padding:18px 28px 6px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${e.fondo};border-radius:10px;">
            <tr><td style="padding:14px 16px;${FUENTE}">
              <div style="font-size:12px;color:${C.gris};text-transform:uppercase;letter-spacing:.05em;">Estado del pedido ${h(p.codigo)}</div>
              <div style="margin-top:4px;font-size:17px;font-weight:700;color:${e.color};">${h(p.estado)}</div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:14px 24px 4px;">${recorrido(p.orden)}</td></tr>
        <tr><td style="padding:8px 28px 0;">
          <div style="${FUENTE}font-size:13px;font-weight:700;color:${C.texto};text-transform:uppercase;letter-spacing:.04em;margin:14px 0 6px;">Resumen</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${fila('Pedido', h(p.codigo))}
            ${fila('Fecha de creación', fecha(p.fecha_creacion))}
            ${p.fecha_entrega ? fila(Number(p.orden) === 5 ? 'Entregado el' : 'Entrega estimada', fecha(p.fecha_entrega)) : ''}
            ${fila('Total', dinero(p.total))}
            ${fila('Abonado', dinero(p.abonado))}
            ${fila('Saldo pendiente', dinero(saldo), saldo > 0 ? C.ambar : C.verde)}
          </table>
        </td></tr>
        ${productos}
        <tr><td align="center" style="padding:26px 28px 30px;">
          ${boton('Escríbanos por WhatsApp', whatsapp, '#16A34A')}
          <div style="${FUENTE}font-size:13px;color:${C.gris};margin-top:12px;">Mencione el código <strong style="color:${C.texto};">${h(p.codigo)}</strong> para atenderle más rápido.</div>
        </td></tr>`;
  return marco(contenido, `${p.codigo}: ${p.estado}. ${e.texto}`);
}

/** Enlace para restablecer la contraseña de un usuario del sistema. */
export const correoRecuperacion = ({ nombre, enlace }) =>
  `<p>Hola ${h(nombre)}:</p><p>Para definir una contraseña nueva abra este enlace: <a href="${enlace}">Restablecer contraseña</a>.</p><p>Es válido por 30 minutos y se puede usar una sola vez. Si no lo solicitó, ignore este correo.</p>`;
