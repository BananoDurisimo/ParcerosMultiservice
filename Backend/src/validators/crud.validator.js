import { HttpError } from '../errors/HttpError.js';
import { validarClave } from './auth.validator.js';

/** Al crear un usuario la contraseña es obligatoria y de al menos 6 caracteres. */
export const validarCreacion = (coleccion, body) => {
  if (coleccion === 'usuarios') validarClave(body.contrasena, 'contrasena');
};

/** Registros que nunca se eliminan: se anulan con motivo (015 y 018). */
export const validarEliminacion = (coleccion, id, usuario) => {
  if (coleccion === 'usuarios' && id === usuario.id_usuario) {
    throw new HttpError(400, 'No puede eliminar su propio usuario.');
  }
  /* Un abono es dinero recibido: no se borra, se anula con motivo. */
  if (coleccion === 'abonos') throw new HttpError(400, 'Los abonos no se eliminan: anúlelo indicando el motivo.');
  if (coleccion === 'compras') throw new HttpError(400, 'Las compras no se eliminan: anúlela indicando el motivo.');
};
