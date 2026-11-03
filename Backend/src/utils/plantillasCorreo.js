import { escaparHtml as h } from './helpers.js';

/* Plantillas HTML de los correos. */

/** Enlace para restablecer la contraseña de un usuario del sistema. */
export const correoRecuperacion = ({ nombre, enlace }) =>
  `<p>Hola ${h(nombre)}:</p><p>Para definir una contraseña nueva abra este enlace: <a href="${enlace}">Restablecer contraseña</a>.</p><p>Es válido por 30 minutos y se puede usar una sola vez. Si no lo solicitó, ignore este correo.</p>`;
