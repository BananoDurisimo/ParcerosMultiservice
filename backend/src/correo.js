import { query } from './db/pool.js';

/*
 * Envio de correos con la API HTTP de Brevo (fetch nativo de Node, sin
 * dependencias). Render gratuito bloquea los puertos SMTP, por eso no se usa
 * SMTP. Sin BREVO_API_KEY el correo no se envia y solo queda un aviso en el log.
 */
export async function enviarCorreo({ para, asunto, html }) {
  if (!process.env.BREVO_API_KEY) return console.warn('Correo sin configurar:', asunto, para);
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { email: process.env.CORREO_REMITENTE, name: 'Parceros Multiservice' },
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
    html: `<p>Hola ${p.nombre}:</p><p>Su pedido <strong>${p.codigo}</strong> cambió al estado <strong>${p.estado}</strong>.</p><p>Parceros Multiservice</p>`,
  });
}
