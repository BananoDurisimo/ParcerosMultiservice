import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { env } from '../config/env.js';

/**
 * Valida el token y carga el usuario con sus acciones por modulo:
 * req.user.acciones = { Clientes: ['Agregar', 'Editar', …], … }. Un modulo
 * asignado sin acciones aparece con la lista vacia.
 * Solo usuarios y roles activos pueden usar la API.
 */
export const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Se requiere autenticación.' });
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ message: 'Token inválido o vencido.' });
  }
  try {
    const { rows } = await query(
      `SELECT u.id_usuario, u.nombre_empleado, u.correo_empresarial, u.id_rol, r.nombre AS rol
         FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
        WHERE u.id_usuario = $1 AND u.activo AND r.activo`,
      [payload.sub]
    );
    if (!rows[0]) return res.status(401).json({ message: 'La sesión ya no es válida.' });
    /* Modulos del rol (aunque no tengan acciones) y sus acciones. */
    const { rows: acciones } = await query(
      `SELECT p.nombre AS modulo, pr.nombre AS accion
         FROM rolxpermiso rp
         JOIN permiso p ON p.id_permiso = rp.id_permiso
         LEFT JOIN (rolxprivilegio rx JOIN privilegio pr ON pr.id_privilegio = rx.id_privilegio)
           ON rx.id_rol = rp.id_rol AND pr.id_permiso = rp.id_permiso
        WHERE rp.id_rol = $1`,
      [rows[0].id_rol]
    );
    req.user = { ...rows[0], acciones: {} };
    acciones.forEach(({ modulo, accion }) => {
      const lista = (req.user.acciones[modulo] ||= []);
      if (accion) lista.push(accion);
    });
    next();
  } catch (e) {
    next(e);
  }
};

/** El usuario puede hacer alguna de `acciones` en alguno de `modulos`. */
export const puede = (user, modulos, acciones) =>
  modulos.some((m) => acciones.some((a) => user.acciones[m]?.includes(a)));

/** El rol tiene asignado alguno de `modulos` (para leer sus datos). */
export const tiene = (user, modulos) => modulos.some((m) => m in user.acciones);

export const requiere = (modulos, acciones) => (req, res, next) =>
  puede(req.user, modulos, acciones) ? next() : res.status(403).json({ message: 'No tiene permisos para esta acción.' });
