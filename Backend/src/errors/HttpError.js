/**
 * Error con estado HTTP para el usuario. `campo` permite al frontend mostrar
 * el mensaje dentro del campo del formulario.
 */
export class HttpError extends Error {
  constructor(status, message, campo) {
    super(message);
    this.status = status;
    this.campo = campo;
  }
}

export const prohibido = () => new HttpError(403, 'No tiene permisos para esta acción.');
export const noEncontrado = (message = 'Registro no encontrado.') => new HttpError(404, message);
