import { ErrorApi, sinConexion } from '@core/errors/ErrorApi.js';
import { leerToken } from '@data/datasources/sesionLocal.js';

/**
 * Cliente HTTP de la API REST (carpeta Backend/ de este repositorio).
 *
 * La URL sale de VITE_API_URL (archivo .env de Vite); si no esta definida se
 * usa la API publicada en Render. Cada peticion lleva el token de la sesion.
 */
export const API_URL = (import.meta.env.VITE_API_URL || 'https://parceros-multiservice-api.onrender.com').replace(/\/(api)?\/?$/, ''); // el origen, sin "/api": api() ya lo antepone

/* Quien escucha (AuthContext) cierra la sesion si el servidor responde 401. */
let alExpirar = () => {};
export const onSesionVencida = (fn) => { alExpirar = fn; };

export async function api(metodo, ruta, cuerpo) {
  const token = leerToken();
  let r;
  try {
    r = await fetch(API_URL + '/api' + ruta, {
      method: metodo,
      headers: {
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw sinConexion();
  }
  const texto = await r.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { /* respuesta sin JSON */ }
  if (r.status === 401 && token && ruta !== '/auth/login') alExpirar();
  if (!r.ok) throw new ErrorApi(r.status, datos);
  return datos;
}
