/** Error de la API: `campo` indica el campo del formulario que lo causo. */
export class ErrorApi extends Error {
  constructor(status, cuerpo) {
    super(cuerpo?.message || 'No fue posible comunicarse con el servidor.');
    this.status = status;
    this.campo = cuerpo?.campo;
  }
}

/** Sin conexion con el servidor (la peticion ni siquiera llego). */
export const sinConexion = () =>
  new ErrorApi(0, { message: 'No hay conexión con el servidor. Verifique su internet e intente de nuevo.' });
