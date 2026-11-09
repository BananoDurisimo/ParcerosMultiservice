import { api } from '@core/network/cliente.js';

/* Fuente de datos remota: los endpoints de la API (Backend/src/routes). */

/** Todas las tablas que usa el frontend, con los nombres de la base de datos. */
export const obtenerDatos = () => api('GET', '/datos');
export const obtenerArchivo = (col, id) => api('GET', `/archivos/${col}/${id}`);
export const crear = (col, cuerpo) => api('POST', '/' + col, cuerpo);
export const actualizar = (col, id, cuerpo) => api('PUT', `/${col}/${id}`, cuerpo);
export const eliminar = (col, id) => api('DELETE', `/${col}/${id}`);

export const iniciarSesion = (correo, contrasena) => api('POST', '/auth/login', { correo, contrasena });
export const cambiarClave = (actual, nueva) => api('PUT', '/auth/clave', { actual, nueva });
export const solicitarRecuperacion = (correo) => api('POST', '/auth/recuperar', { correo });
export const validarEnlace = async (token) => (await api('GET', `/auth/recuperar/${encodeURIComponent(token)}`)).valido;
export const restablecerClave = (token, nueva) => api('POST', '/auth/restablecer', { token, nueva });
