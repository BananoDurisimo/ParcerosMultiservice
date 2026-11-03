import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { enviarCorreo } from '../correo.js';

const router = Router();
const ERROR_LOGIN = 'Correo o contraseña incorrectos.';
const ENLACE_INVALIDO = 'El enlace no es válido o ha vencido. Solicite uno nuevo.';
const sha = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

router.post('/login', async (req, res, next) => {
  try {
    const correo = String(req.body.correo || '').trim().toLowerCase();
    const { rows } = await query(
      `SELECT u.*, r.nombre AS rol, r.activo AS rol_activo
         FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
        WHERE lower(u.correo_empresarial) = $1`,
      [correo]
    );
    const user = rows[0];
    const claveOk = user && (await bcrypt.compare(String(req.body.contrasena || ''), user.contrasena_hash));
    if (!claveOk) {
      await query("INSERT INTO acceso(id_usuario,correo,resultado) VALUES($1,$2,'LOGIN_FALLIDO')", [user?.id_usuario || null, correo]);
      return res.status(401).json({ message: ERROR_LOGIN });
    }
    if (!user.activo || !user.rol_activo) {
      await query("INSERT INTO acceso(id_usuario,correo,resultado) VALUES($1,$2,'LOGIN_FALLIDO')", [user.id_usuario, correo]);
      return res.status(403).json({ message: 'El usuario está inactivo. Contacte al administrador.' });
    }
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
    const { actual = '', nueva = '' } = req.body;
    if (String(nueva).length < 6) return res.status(400).json({ campo: 'nueva', message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    const { rows } = await query('SELECT contrasena_hash FROM usuario WHERE id_usuario=$1', [req.user.id_usuario]);
    if (!(await bcrypt.compare(String(actual), rows[0].contrasena_hash))) {
      return res.status(400).json({ campo: 'actual', message: 'La contraseña actual no es correcta.' });
    }
    await query('UPDATE usuario SET contrasena_hash=$1 WHERE id_usuario=$2', [await bcrypt.hash(String(nueva), 12), req.user.id_usuario]);
    res.status(204).end();
  } catch (e) { next(e); }
});

/*
 * Recuperacion de contraseña: /recuperar envia por correo un enlace de un solo
 * uso, valido 30 minutos. La respuesta es la misma exista o no el correo, y el
 * correo se envia sin esperar, para no revelar que usuarios estan registrados.
 */
router.post('/recuperar', async (req, res, next) => {
  try {
    const correo = String(req.body.correo || '').trim().toLowerCase();
    const { rows: [u] } = await query(
      `SELECT u.id_usuario, u.nombre_empleado FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
        WHERE lower(u.correo_empresarial) = $1 AND u.activo AND r.activo`,
      [correo]
    );
    if (u) {
      const token = crypto.randomBytes(32).toString('hex');
      await query("INSERT INTO recuperacion_clave (token_hash, id_usuario, vence) VALUES ($1, $2, NOW() + interval '30 minutes')", [sha(token), u.id_usuario]);
      const enlace = `${process.env.APP_URL || 'http://localhost:5173'}/recuperar?token=${token}`;
      enviarCorreo({
        para: correo,
        asunto: 'Restablecer contraseña',
        html: `<p>Hola ${u.nombre_empleado}:</p><p>Para definir una contraseña nueva abra este enlace: <a href="${enlace}">Restablecer contraseña</a>.</p><p>Es válido por 30 minutos y se puede usar una sola vez. Si no lo solicitó, ignore este correo.</p>`,
      }).catch(console.error);
    }
    res.status(204).end();
  } catch (e) { next(e); }
});

router.get('/recuperar/:token', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT 1 FROM recuperacion_clave WHERE token_hash = $1 AND NOT usado AND vence > NOW()', [sha(req.params.token)]
    );
    res.json({ valido: rows.length > 0 });
  } catch (e) { next(e); }
});

router.post('/restablecer', async (req, res, next) => {
  try {
    const { token = '', nueva = '' } = req.body;
    if (String(nueva).length < 6) return res.status(400).json({ campo: 'nueva', message: 'La contraseña debe tener al menos 6 caracteres.' });
    /* Marcar como usado y leer el usuario en una sola sentencia: el enlace no se puede usar dos veces. */
    const { rows: [r] } = await query(
      'UPDATE recuperacion_clave SET usado = TRUE WHERE token_hash = $1 AND NOT usado AND vence > NOW() RETURNING id_usuario', [sha(token)]
    );
    if (!r) return res.status(400).json({ message: ENLACE_INVALIDO });
    await query('UPDATE usuario SET contrasena_hash=$1 WHERE id_usuario=$2', [await bcrypt.hash(String(nueva), 12), r.id_usuario]);
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
