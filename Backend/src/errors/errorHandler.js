import { HttpError } from './HttpError.js';

export const rutaNoEncontrada = (_, res) => res.status(404).json({ message: 'Ruta no encontrada.' });

/*
 * Errores de la API y de PostgreSQL traducidos a mensajes para el usuario.
 * `campo` permite al frontend mostrar el error dentro del campo del formulario.
 */
const CAMPO = /Key \(([^)]+)\)=/;

// eslint-disable-next-line no-unused-vars
export const manejarErrores = (err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json(err.campo ? { campo: err.campo, message: err.message } : { message: err.message });
  }
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'El archivo adjunto es demasiado grande.' });
  switch (err.code) {
    case '23505': {
      const campo = err.detail?.match(CAMPO)?.[1];
      return res.status(409).json({ campo, message: 'Ya existe un registro con este valor.' });
    }
    case '23503':
      return res.status(409).json({ message: req.method === 'DELETE'
        ? 'No se puede eliminar: tiene registros asociados. Puede desactivarlo en su lugar.'
        : 'Uno de los registros relacionados no existe.' });
    case '23502':
      return res.status(400).json({ campo: err.column, message: 'Este campo no puede estar vacío.' });
    case '23514':
    case '22P02':
    case '22001':
    case '22003':
      return res.status(400).json({ message: 'Hay un valor no válido en el formulario.' });
    case 'P0001': // RAISE EXCEPTION de los triggers
      return res.status(400).json({ message: err.message });
    default:
      console.error(err);
      return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
