import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';

/**
 * Valida el token y carga el usuario con sus acciones por modulo:
 * req.user.acciones = { Clientes: ['Agregar', 'Editar', …], … }.
 * Solo usuarios y roles activos pueden usar la API.
 */
export const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Se requiere autenticación.' });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
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
    const { rows: acciones } = await query(
      `SELECT p.nombre AS modulo, pr.nombre AS accion
         FROM rolxprivilegio rx
         JOIN privilegio pr ON pr.id_privilegio = rx.id_privilegio
         JOIN permiso p ON p.id_permiso = pr.id_permiso
        WHERE rx.id_rol = $1`,
      [rows[0].id_rol]
    );
    req.user = { ...rows[0], acciones: {} };
    acciones.forEach(({ modulo, accion }) => { (req.user.acciones[modulo] ||= []).push(accion); });
    next();
  } catch (e) {
    next(e);
  }
};

/** El usuario puede hacer alguna de `acciones` en alguno de `modulos`. */
export const puede = (user, modulos, acciones) =>
  modulos.some((m) => acciones.some((a) => user.acciones[m]?.includes(a)));

export const requiere = (modulos, acciones) => (req, res, next) =>
  puede(req.user, modulos, acciones) ? next() : res.status(403).json({ message: 'No tiene permisos para esta acción.' });
