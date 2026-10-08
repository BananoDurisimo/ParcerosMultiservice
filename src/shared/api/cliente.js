/**
 * Cliente HTTP de la API REST (backend/ en este mismo repositorio).
 *
 * La URL sale de VITE_API_URL (archivo .env de Vite); si no esta definida se
 * usa la API publicada en Render. El token de la sesion se guarda en
 * sessionStorage: dura mientras la pestaña este abierta y no queda en el
 * equipo al cerrarla.
 */
export const API_URL = (import.meta.env.VITE_API_URL || 'https://parceros-multiservice-api.onrender.com').replace(/\/(api)?\/?$/, ''); // el origen, sin "/api": api() ya lo antepone

const KEY = 'pm-token';

export const leerToken = () => {
  try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; }
};
export const guardarToken = (token) => {
  try { token ? sessionStorage.setItem(KEY, token) : sessionStorage.removeItem(KEY); } catch { /* modo privado */ }
};

/** Id del usuario dentro del token (el servidor es quien lo valida). */
export const idDelToken = (token) => {
  try {
    const base = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return Number(JSON.parse(atob(base)).sub) || null;
  } catch {
    return null;
  }
};

/* Quien escucha (AuthContext) cierra la sesion si el servidor responde 401. */
let alExpirar = () => {};
export const onSesionVencida = (fn) => { alExpirar = fn; };

/** Error de la API: `campo` indica el campo del formulario que lo causo. */
export class ErrorApi extends Error {
  constructor(status, cuerpo) {
    super(cuerpo?.message || 'No fue posible comunicarse con el servidor.');
    this.status = status;
    this.campo = cuerpo?.campo;
  }
}

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
    throw new ErrorApi(0, { message: 'No hay conexión con el servidor. Verifique su internet e intente de nuevo.' });
  }
  const texto = await r.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { /* respuesta sin JSON */ }
  if (r.status === 401 && token && ruta !== '/auth/login') alExpirar();
  if (!r.ok) throw new ErrorApi(r.status, datos);
  return datos;
}
