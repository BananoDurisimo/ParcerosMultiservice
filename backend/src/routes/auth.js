import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const correo = String(req.body.correo || '').trim().toLowerCase();
    const { rows } = await query('SELECT u.*, r.nombre rol FROM usuario u JOIN rol r ON r.id_rol=u.id_rol WHERE lower(u.correo_empresarial)=lower($1)', [correo]);
    const user = rows[0];
    if (!user || !user.activo || !(await bcrypt.compare(req.body.contrasena || '', user.contrasena_hash))) {
      await query("INSERT INTO acceso(id_usuario,correo,resultado) VALUES($1,$2,'LOGIN_FALLIDO')", [user?.id_usuario || null, correo]);
      return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
    }
    await query("INSERT INTO acceso(id_usuario,correo,resultado) VALUES($1,$2,'LOGIN')", [user.id_usuario, correo]);
    const token = jwt.sign({ sub: user.id_usuario, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id_usuario, nombre: user.nombre_empleado, correo: user.correo_empresarial, rol: user.rol } });
  } catch (error) { next(error); }
});
router.get('/me', requireAuth, (req,res) => res.json({ user:req.user }));
router.post('/logout', requireAuth, async (req,res,next) => { try { await query("INSERT INTO acceso(id_usuario,correo,resultado) VALUES($1,$2,'LOGOUT')",[req.user.id_usuario,req.user.correo_empresarial]); res.status(204).end(); } catch(e) { next(e); } });
export default router;
