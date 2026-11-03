import { HttpError } from '../errors/HttpError.js';

const MINIMO = 6;

/** La contraseña nueva debe tener al menos 6 caracteres. */
export const validarClave = (clave, campo, mensaje = `La contraseña debe tener al menos ${MINIMO} caracteres.`) => {
  if (String(clave ?? '').length < MINIMO) throw new HttpError(400, mensaje, campo);
};

export const validarCambioClave = ({ nueva = '' }) =>
  validarClave(nueva, 'nueva', `La nueva contraseña debe tener al menos ${MINIMO} caracteres.`);

export const validarRestablecer = ({ nueva = '' }) => validarClave(nueva, 'nueva');
