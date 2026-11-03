import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { escaparHtml as h } from '../utils/helpers.js';

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

/** Avisa al cliente el estado actual de su pedido. */
export async function notificarEstadoPedido(idPedido) {
  const { rows: [p] } = await query(
    `SELECT 'PED-' || lpad(p.id_pedido::text, 4, '0') AS codigo, c.nombre, c.correo, e.nombre AS estado
       FROM pedido p JOIN cliente c USING (id_cliente) JOIN estado_pedido e USING (id_estado_pedido)
      WHERE p.id_pedido = $1`,
    [idPedido]
  );
  if (!p) return;
  await enviarCorreo({
    para: p.correo,
    asunto: `Su pedido ${p.codigo}: ${p.estado}`,
    html: `<p>Hola ${h(p.nombre)}:</p><p>Su pedido <strong>${p.codigo}</strong> cambió al estado <strong>${h(p.estado)}</strong>.</p><p>Parceros Multiservice</p>`,
  });
}
