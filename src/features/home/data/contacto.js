/**
 * Datos de contacto del sitio publico.
 *
 * `WHATSAPP` va en formato internacional y sin signos, como lo pide wa.me.
 * Es el mismo numero de la tarjeta "Telefono".
 */
export const WHATSAPP = '50589920326';

/** Enlace que abre WhatsApp con el mensaje ya escrito. */
export const waLink = (mensaje = 'Hola, quiero cotizar uniformes personalizados.') =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;

export const TELEFONO = { texto: '+505 8992 0326', href: 'tel:+50589920326' };
export const CORREO = 'Pcero2019@gmail.com';
export const DIRECCION = 'De la escuela Máximo Jerez, 2 c. al sur y 10 al este, Managua';
export const MAPA = 'https://maps.google.com/?q=Escuela+M%C3%A1ximo+Jerez+Managua';

export const CONTACTO = [
  { icon: 'phone', l: 'Teléfono', v: TELEFONO.texto, sub: 'Lunes a sábado · 8:00 a.m. – 5:00 p.m.', href: TELEFONO.href },
  { icon: 'whatsapp', l: 'WhatsApp', v: 'Escríbanos ahora', sub: 'Le respondemos en horario de atención.', href: waLink() },
  { icon: 'mail', l: 'Correo', v: CORREO, sub: 'Respondemos dentro de las 24 horas.', href: `mailto:${CORREO}` },
  { icon: 'pin', l: 'Dirección', v: 'Managua, Nicaragua', sub: DIRECCION, href: MAPA },
];
