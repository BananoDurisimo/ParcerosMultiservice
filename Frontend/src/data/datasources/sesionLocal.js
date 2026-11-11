/**
 * Fuente de datos local: el token de la sesion se guarda en sessionStorage
 * (dura mientras la pestaña este abierta) o, si el usuario marca
 * «Recordarme», en localStorage: la sesion sigue al reabrir el navegador
 * hasta que el token venza (8 horas) o se cierre la sesion.
 */
const KEY = 'pm-token';

export const leerToken = () => {
  try { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || ''; } catch { return ''; }
};
export const guardarToken = (token, recordar = false) => {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
    if (token) (recordar ? localStorage : sessionStorage).setItem(KEY, token);
  } catch { /* modo privado */ }
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
