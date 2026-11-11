import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { codigoPedido } from '../utils/helpers.js';
import { correoEstadoPedido } from '../utils/plantillasCorreo.js';

/*
 * Envio de correos con la API HTTP de Brevo (fetch nativo de Node, sin
 * dependencias). Render gratuito bloquea los puertos SMTP, por eso no se usa
 * SMTP. Sin BREVO_API_KEY el correo no se envia y solo queda un aviso en el log.
 */
export async function enviarCorreo({ para, asunto, html }) {
  if (!env.brevoApiKey) return console.warn('Correo sin configurar:', asunto, para);
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.brevoApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { email: env.correoRemitente, name: 'Parceros Multiservice' },
      to: [{ email: para }],
      subject: asunto,
      htmlContent: html,
    }),
  });
  if (!r.ok) throw new Error(`Brevo ${r.status}: ${await r.text()}`);
}

/** Datos del pedido que muestra el correo al cliente. */
export async function datosCorreoPedido(idPedido) {
  const { rows: [p] } = await query(
    `SELECT p.id_pedido, p.fecha_creacion, p.fecha_entrega, c.nombre, c.correo,
            e.nombre AS estado, e.orden, t.total, t.abonado, t.saldo
       FROM pedido p
       JOIN cliente c USING (id_cliente)
       JOIN estado_pedido e USING (id_estado_pedido)
       JOIN v_pedido_total t USING (id_pedido)
      WHERE p.id_pedido = $1`,
    [idPedido]
  );
  if (!p) return null;
  const { rows: productos } = await query(
    `SELECT pr.nombre, d.cantidad FROM detalle_pedido_producto d JOIN producto pr USING (id_producto)
      WHERE d.id_pedido = $1 ORDER BY pr.nombre`,
    [idPedido]
  );
  return { ...p, codigo: codigoPedido(p.id_pedido), productos };
}

/** Avisa al cliente el estado actual de su pedido. */
export async function notificarEstadoPedido(idPedido) {
  const p = await datosCorreoPedido(idPedido);
  if (!p) return;
  await enviarCorreo({
    para: p.correo,
    asunto: `Su pedido ${p.codigo}: ${p.estado}`,
    html: correoEstadoPedido(p),
  });
}
