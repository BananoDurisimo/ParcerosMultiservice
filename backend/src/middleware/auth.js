import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';

export const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Se requiere autenticación.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query('SELECT u.id_usuario, u.nombre_empleado, u.correo_empresarial, r.nombre rol FROM usuario u JOIN rol r ON r.id_rol=u.id_rol WHERE u.id_usuario=$1 AND u.activo=true', [payload.sub]);
    if (!rows[0]) return res.status(401).json({ message: 'La sesión ya no es válida.' });
    req.user = rows[0];
    await query("SELECT set_config('app.user_id', $1, false)", [String(req.user.id_usuario)]);
    next();
  } catch { return res.status(401).json({ message: 'Token inválido o vencido.' }); }
};

export const allowRoles = (...roles) => (req, res, next) => roles.includes(req.user.rol) ? next() : res.status(403).json({ message: 'No tiene permisos para esta acción.' });
