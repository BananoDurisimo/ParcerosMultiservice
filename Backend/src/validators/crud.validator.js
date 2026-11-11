import { HttpError } from '../errors/HttpError.js';
import { validarClave } from './auth.validator.js';

/** Al crear un usuario la contraseña es obligatoria y de al menos 6 caracteres. */
export const validarCreacion = (coleccion, body) => {
  if (coleccion === 'usuarios') validarClave(body.contrasena, 'contrasena');
};

/** Al editar un usuario la contraseña es opcional, pero si viene debe cumplir. */
export const validarModificacion = (coleccion, body) => {
  if (coleccion === 'usuarios' && body.contrasena) validarClave(body.contrasena, 'contrasena');
};

/* 5 MB en base64 son unos 7 millones de caracteres. */
const MAX_ADJUNTO = 7_100_000;

/**
 * El adjunto es un data URL de los tipos de la coleccion y de maximo 5 MB.
 * Nada mas se guarda en esa columna (ni direcciones externas ni HTML).
 */
export const validarArchivo = (cfg, body) => {
  if (!cfg.archivo) return;
  const v = body[cfg.archivo.columna];
  if (v === undefined || v === null || v === '') return;
  const formato = new RegExp(`^data:${cfg.archivo.tipos};base64,[A-Za-z0-9+/]+=*$`);
  if (typeof v !== 'string' || v.length > MAX_ADJUNTO || !formato.test(v)) {
    throw new HttpError(400, 'El archivo adjunto no es válido: revise el formato y que no supere 5 MB.', cfg.archivo.columna);
  }
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
