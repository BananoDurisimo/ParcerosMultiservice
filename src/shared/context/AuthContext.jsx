import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
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
  const { db, setActor, registrarAcceso } = useData();
  const [idSesion, setIdSesion] = useState(leerSesion);

  /* El usuario de la sesion se lee siempre de la tabla `usuario`: si lo
     editan, lo desactivan o le cambian el rol, el cambio aplica de inmediato. */
  const user = useMemo(() => {
    const u = db.usuarios.find((x) => x.id === idSesion && x.estado === 'Activo');
    if (!u) return null;
    const rol = db.roles.find((r) => r.id === u.id_rol);
    /* Privilegios agrupados por modulo: { Compras: ['Agregar', 'Editar', …] }. */
    const acciones = {};
    (rol?.privilegios || []).forEach((id) => {
      const pr = db.privilegios.find((x) => x.id === id);
      const modulo = db.permisos.find((p) => p.id === pr?.id_permiso)?.nombre;
      if (!pr || !modulo || !(rol.permisos || []).includes(pr.id_permiso)) return;
      (acciones[modulo] = acciones[modulo] || []).push(pr.nombre);
    });
    return {
      id: u.id,
      correo: u.correo_empresarial,
      nombre: u.nombre_empleado,
      usuario: u.nombre_usuario,
      rol: u.calc_rol,
      id_rol: u.id_rol,
      permisos: rol?.calc_permisos || [],
      acciones,
    };
  }, [db, idSesion]);

  /* El responsable de cada movimiento del historial es el usuario en sesion. */
  useEffect(() => { setActor(user?.id ?? null); }, [user?.id, setActor]);

  const login = useCallback((correo, clave) => {
    const c = String(correo).trim().toLowerCase();
    const u = db.usuarios.find((x) => (x.correo_empresarial || '').toLowerCase() === c);
    // Un solo mensaje: no revela si el correo existe.
    if (!u || u.contrasena !== clave) {
      const error = 'Correo o contraseña incorrectos.';
      registrarAcceso('LOGIN_FALLIDO', { correo: c, resultado: error, id_usuario: u?.id ?? null });
      return { ok: false, error };
    }
    if (u.estado !== 'Activo') {
      const error = 'El usuario está inactivo. Contacte al administrador.';
      registrarAcceso('LOGIN_FALLIDO', { correo: c, resultado: error, id_usuario: u.id });
      return { ok: false, error };
    }
    registrarAcceso('LOGIN', { correo: c, resultado: 'Ingreso exitoso', id_usuario: u.id });
    setIdSesion(u.id);
    try { localStorage.setItem(KEY, JSON.stringify({ id: u.id })); } catch { /* modo privado */ }
    return { ok: true, user: { nombre: u.nombre_empleado } };
  }, [db, registrarAcceso]);

  const logout = useCallback(() => {
    if (user) registrarAcceso('LOGOUT', { correo: user.correo, resultado: 'Sesión cerrada', id_usuario: user.id });
    setIdSesion(null);
    try { localStorage.removeItem(KEY); } catch { /* modo privado */ }
  }, [user, registrarAcceso]);

  /** `permiso` es el nombre de la tabla `permiso` (o una lista: basta con
   *  tener uno); sin permiso, el acceso es libre. */
  const puede = useCallback(
    (permiso) => {
      if (!permiso) return true;
      const lista = Array.isArray(permiso) ? permiso : [permiso];
      return lista.some((p) => !!user?.permisos.includes(p));
    },
    [user]
  );

  /** Privilegio: si el rol puede ejecutar `accion` dentro del modulo `modulo`. */
  const puedeAccion = useCallback(
    (modulo, accion) => !modulo || !!user?.acciones[modulo]?.includes(accion),
    [user]
  );

  const value = useMemo(
    () => ({ user, login, logout, puede, puedeAccion, isAuth: !!user }),
    [user, login, logout, puede, puedeAccion]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const iniciales = (nombre = '') =>
  nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'PM';
