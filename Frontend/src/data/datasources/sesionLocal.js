/**
 * Fuente de datos local: el token de la sesion se guarda en sessionStorage.
 * Dura mientras la pestaña este abierta y no queda en el equipo al cerrarla.
 */
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
