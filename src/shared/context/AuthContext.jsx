import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { seed } from '@shared/data/mock.js';
import { useData } from '@shared/context/DataContext.jsx';

const AuthContext = createContext(null);
const KEY = 'pm-sesion';

/** Accesos rapidos de la pantalla de login: un usuario activo por rol,
 *  tomado de los datos semilla (la validacion real ira contra la API REST). */
export const DEMO = seed.roles
  .map((rol) => {
    const u = seed.usuarios.find((x) => x.id_rol === rol.id && x.estado === 'Activo');
    if (!u) return null;
    return { correo: u.correo_empresarial, clave: u.contrasena, rol: rol.nombre };
  })
  .filter(Boolean);

const leerSesion = () => {
  try { return Number(JSON.parse(localStorage.getItem(KEY) || 'null')?.id) || null; } catch { return null; }
};

export function AuthProvider({ children }) {
  const { db } = useData();
  const [idSesion, setIdSesion] = useState(leerSesion);

  /* El usuario de la sesion se lee siempre de la tabla `usuario`: si lo
     editan, lo desactivan o le cambian el rol, el cambio aplica de inmediato. */
  const user = useMemo(() => {
    const u = db.usuarios.find((x) => x.id === idSesion && x.estado === 'Activo');
    if (!u) return null;
    return {
      id: u.id,
      correo: u.correo_empresarial,
      nombre: u.nombre_empleado,
      usuario: u.nombre_usuario,
      rol: u.calc_rol,
      id_rol: u.id_rol,
      permisos: db.roles.find((r) => r.id === u.id_rol)?.calc_permisos || [],
    };
  }, [db, idSesion]);

  const login = useCallback((correo, clave) => {
    const c = String(correo).trim().toLowerCase();
    const u = db.usuarios.find((x) => (x.correo_empresarial || '').toLowerCase() === c);
    // Un solo mensaje: no revela si el correo existe.
    if (!u || u.contrasena !== clave) return { ok: false, error: 'Correo o contraseña incorrectos.' };
    if (u.estado !== 'Activo') return { ok: false, error: 'El usuario está inactivo. Contacte al administrador.' };
    setIdSesion(u.id);
    try { localStorage.setItem(KEY, JSON.stringify({ id: u.id })); } catch { /* modo privado */ }
    return { ok: true, user: { nombre: u.nombre_empleado } };
  }, [db]);

  const logout = useCallback(() => {
    setIdSesion(null);
    try { localStorage.removeItem(KEY); } catch { /* modo privado */ }
  }, []);

  /** `permiso` es el nombre de la tabla `permiso`; sin permiso, el acceso es libre. */
  const puede = useCallback((permiso) => !permiso || !!user?.permisos.includes(permiso), [user]);

  const value = useMemo(() => ({ user, login, logout, puede, isAuth: !!user }), [user, login, logout, puede]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const iniciales = (nombre = '') =>
  nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'PM';
