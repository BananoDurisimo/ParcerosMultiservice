/**
 * Datos de contacto del sitio publico.
 *
 * `WHATSAPP` va en formato internacional y sin signos, como lo pide wa.me.
 * Es el mismo numero de la tarjeta "Telefono".
 */
export const WHATSAPP = '50584552210';

/** Enlace que abre WhatsApp con el mensaje ya escrito. */
export const waLink = (mensaje = 'Hola, quiero cotizar uniformes personalizados.') =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;

export const TELEFONO = { texto: '+505 8455 2210', href: 'tel:+50584552210' };

export const CONTACTO = [
  { icon: 'phone', l: 'Teléfono', v: TELEFONO.texto, sub: 'Lunes a sábado · 8:00 a.m. – 5:00 p.m.', href: TELEFONO.href },
  { icon: 'whatsapp', l: 'WhatsApp', v: 'Escríbanos ahora', sub: 'Le respondemos en horario de atención.', href: waLink() },
  { icon: 'mail', l: 'Correo', v: 'ventas@parceros.ni', sub: 'Respondemos dentro de las 24 horas.', href: 'mailto:ventas@parceros.ni' },
  { icon: 'pin', l: 'Dirección', v: 'Bo. Monseñor Lezcano, Managua', sub: 'De la iglesia 2 c. al sur, 1 c. abajo.', href: 'https://maps.google.com/?q=Monse%C3%B1or+Lezcano+Managua' },
];
