import * as remoto from '@data/datasources/parcerosApi.js';
import { guardarToken } from '@data/datasources/sesionLocal.js';

/* Repositorio de la sesion: la API valida y la sesion local guarda el token. */

/** Inicia sesion y deja guardado el token: devuelve { token, user }. */
export async function iniciarSesion(correo, contrasena) {
  const r = await remoto.iniciarSesion(String(correo).trim(), contrasena);
  guardarToken(r.token);
  return r;
}

/** El registro del cierre en el servidor no debe frenar la salida. */
export const registrarCierre = () => remoto.cerrarSesion().catch(() => {});

export const cambiarClave = (actual, nueva) => remoto.cambiarClave(actual, nueva);
export const solicitarRecuperacion = (correo) => remoto.solicitarRecuperacion(correo);
export const validarEnlace = (token) => remoto.validarEnlace(token);
export const restablecerClave = (token, nueva) => remoto.restablecerClave(token, nueva);
