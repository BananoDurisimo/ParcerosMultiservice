import crypto from 'node:crypto';

/** Cadenas sin espacios sobrantes y vacias como NULL: el formulario envia ''
 *  en fechas y opcionales. */
export const limpiar = (campos, body) =>
  Object.fromEntries(campos.filter((k) => body[k] !== undefined).map((k) => {
    const v = typeof body[k] === 'string' ? body[k].trim() : body[k];
    return [k, v === '' ? null : v];
  }));

/** Huella SHA-256 en hexadecimal (los tokens de recuperacion se guardan asi). */
export const sha256 = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

/** Texto seguro para insertar en HTML. */
export const escaparHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Codigo visible de un pedido: 7 -> PED-0007. */
export const codigoPedido = (id) => `PED-${String(id).padStart(4, '0')}`;
