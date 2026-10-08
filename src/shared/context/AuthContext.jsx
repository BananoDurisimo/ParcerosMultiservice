import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useData } from '@shared/context/DataContext.jsx';
import { api, leerToken, guardarToken, idDelToken, onSesionVencida } from '@shared/api/cliente.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { db, cargar, vaciar, estadoDatos } = useData();
  /* La sesion es el token que entrega la API; el id del usuario viene en el. */
  const [idSesion, setIdSesion] = useState(() => idDelToken(leerToken()));

  const cerrarLocal = useCallback(() => {
    guardarToken('');
    setIdSesion(null);
    vaciar();
  }, [vaciar]);

  /* Si el servidor rechaza el token (vencido o usuario desactivado). */
  useEffect(() => { onSesionVencida(cerrarLocal); }, [cerrarLocal]);

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


  /** Inicia sesion contra la API y carga los datos. El servidor registra el
   *  acceso (exitoso o fallido) en la tabla `acceso`. */
  const login = useCallback(async (correo, clave) => {
    try {
      const r = await api('POST', '/auth/login', { correo: String(correo).trim(), contrasena: clave });
      guardarToken(r.token);
      setIdSesion(r.user.id);
      await cargar();
      return { ok: true, user: r.user };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [cargar]);

  const logout = useCallback(() => {
    api('POST', '/auth/logout').catch(() => {}); // el registro del cierre no debe frenar la salida
    cerrarLocal();
  }, [cerrarLocal]);

  /** Cambio de la propia contrasena (Mi cuenta). */
  const cambiarClave = useCallback(
    (actual, nueva) => api('PUT', '/auth/clave', { actual, nueva }).then(() => ({ ok: true }), (e) => ({ ok: false, campo: e.campo, error: e.message })),
    []
  );

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
    () => ({
      user, login, logout, cambiarClave, puede, puedeAccion,
      /* Con token pero sin datos todavia, la sesion sigue abierta: AppLayout
         muestra la carga en vez de mandar al login. */
      isAuth: !!user || (!!idSesion && (estadoDatos === 'cargando' || estadoDatos === 'error')),
      cargandoSesion: !!idSesion && (estadoDatos === 'cargando' || estadoDatos === 'error'),
    }),
    [user, login, logout, cambiarClave, puede, puedeAccion, idSesion, estadoDatos]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const iniciales = (nombre = '') =>
  nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'PM';
