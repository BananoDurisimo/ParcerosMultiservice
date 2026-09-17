import { createContext, useContext, useState, useCallback } from 'react';
import { seed } from '@shared/data/mock.js';

const AuthContext = createContext(null);
const KEY = 'pm-user';

/** Usuarios de demostracion tomados de la tabla `usuario` (la validacion real
 *  ira contra la API REST). Se expone un usuario activo por rol. */
export const DEMO = seed.roles
  .map((rol) => {
    const u = seed.usuarios.find((x) => x.id_rol === rol.id && x.estado === 'Activo');
    if (!u) return null;
    return {
      id: u.id,
      correo: u.correo_empresarial,
      clave: u.contrasena,
      nombre: u.nombre_empleado,
      usuario: u.nombre_usuario,
      rol: rol.nombre,
      id_rol: rol.id,
    };
  })
  .filter(Boolean);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
  });

  const login = useCallback((correo, clave) => {
    const found = DEMO.find((u) => u.correo.toLowerCase() === String(correo).trim().toLowerCase());
    if (!found) return { ok: false, error: 'No existe un usuario registrado con ese correo.' };
    if (found.clave !== clave) return { ok: false, error: 'La contraseña es incorrecta.' };
    const u = { ...found };
    delete u.clave;
    setUser(u);
    try { localStorage.setItem(KEY, JSON.stringify(u)); } catch { /* noop */ }
    return { ok: true, user: u };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try { localStorage.removeItem(KEY); } catch { /* noop */ }
  }, []);

  const update = useCallback((patch) => {
    setUser((u) => {
      const nu = { ...u, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(nu)); } catch { /* noop */ }
      return nu;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, update, isAuth: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const iniciales = (nombre = '') =>
  nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'PM';
