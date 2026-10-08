const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const TOKEN_KEY = 'pm-api-token';

export const token = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (value) => localStorage.setItem(TOKEN_KEY, value),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Cliente HTTP único del frontend. Ningún componente debe guardar claves de
 * PostgreSQL o de JWT: solamente recibe el token de sesión emitido por la API. */
export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const session = token.get();
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(session ? { Authorization: `Bearer ${session}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) token.clear();
    throw new Error(data.message || 'No fue posible comunicarse con el servidor.');
  }
  return data;
}

export const authApi = {
  login: async (correo, contrasena) => {
    const data = await api('/auth/login', { method: 'POST', body: { correo, contrasena } });
    token.set(data.token);
    return data.user;
  },
  me: () => api('/auth/me'),
  logout: async () => { try { await api('/auth/logout', { method: 'POST' }); } finally { token.clear(); } },
};
