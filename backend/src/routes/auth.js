import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const ERROR_LOGIN = 'Correo o contraseña incorrectos.';
/* Se compara contra este hash cuando el correo no existe, para que la
   respuesta tarde lo mismo y no revele que correos estan registrados. */
const HASH_SENUELO = bcrypt.hashSync('sin-usuario', 12);

/* Freno a la fuerza bruta: 8 intentos fallidos por correo e IP cada 15 minutos.
   Vive en memoria (una sola instancia en Render); con varias instancias habria
   que llevarlo a la base de datos. */
const MAX_INTENTOS = 8;
const VENTANA_MS = 15 * 60 * 1000;
const intentos = new Map();
const bloqueado = (clave) => {
  const i = intentos.get(clave);
  if (i && i.vence < Date.now()) intentos.delete(clave);
  return (intentos.get(clave)?.n || 0) >= MAX_INTENTOS;
};
const anotarFallo = (clave) => {
  if (intentos.size > 10000) intentos.clear();
  const i = intentos.get(clave) || { n: 0, vence: Date.now() + VENTANA_MS };
  i.n += 1;
  intentos.set(clave, i);
};

router.post('/login', async (req, res, next) => {
  try {
    const correo = String(req.body?.correo || '').trim().toLowerCase().slice(0, 120);
    const clave = `${req.ip}|${correo}`;
    if (bloqueado(clave)) {
      return res.status(429).json({ message: 'Demasiados intentos fallidos. Espere 15 minutos e intente de nuevo.' });
    }
    const { rows } = await query(
      `SELECT u.*, r.nombre AS rol, r.activo AS rol_activo
         FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
        WHERE lower(u.correo_empresarial) = $1`,
      [correo]
    );
    const user = rows[0];
    const coincide = await bcrypt.compare(String(req.body?.contrasena || ''), user?.contrasena_hash || HASH_SENUELO);
    if (!user || !coincide) {
      anotarFallo(clave);
      await query("INSERT INTO acceso(id_usuario,correo,resultado) VALUES($1,$2,'LOGIN_FALLIDO')", [user?.id_usuario || null, correo]);
      return res.status(401).json({ message: ERROR_LOGIN });
    }
    if (!user.activo || !user.rol_activo) {
      await query("INSERT INTO acceso(id_usuario,correo,resultado) VALUES($1,$2,'LOGIN_FALLIDO')", [user.id_usuario, correo]);
      return res.status(403).json({ message: 'El usuario está inactivo. Contacte al administrador.' });
    }
    intentos.delete(clave);
    await query("INSERT INTO acceso(id_usuario,correo,resultado) VALUES($1,$2,'LOGIN')", [user.id_usuario, correo]);
    const token = jwt.sign({ sub: user.id_usuario }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id_usuario, nombre: user.nombre_empleado, correo: user.correo_empresarial, rol: user.rol } });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await query("INSERT INTO acceso(id_usuario,correo,resultado) VALUES($1,$2,'LOGOUT')", [req.user.id_usuario, req.user.correo_empresarial]);
    res.status(204).end();
  } catch (e) { next(e); }
});

/** Cambio de contrasena del propio usuario (Mi cuenta). */
router.put('/clave', requireAuth, async (req, res, next) => {
  try {
    const { actual = '', nueva = '' } = req.body || {};
    if (String(nueva).length < 6) return res.status(400).json({ campo: 'nueva', message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    const { rows } = await query('SELECT contrasena_hash FROM usuario WHERE id_usuario=$1', [req.user.id_usuario]);
    if (!(await bcrypt.compare(String(actual), rows[0].contrasena_hash))) {
      return res.status(400).json({ campo: 'actual', message: 'La contraseña actual no es correcta.' });
    }
    await query('UPDATE usuario SET contrasena_hash=$1 WHERE id_usuario=$2', [await bcrypt.hash(String(nueva), 12), req.user.id_usuario]);
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
