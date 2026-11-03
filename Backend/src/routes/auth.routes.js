import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

/* /api/auth: sesion, cambio y recuperacion de contraseña. */
const router = Router();

router.post('/login', auth.login);
router.get('/me', requireAuth, auth.me);
router.post('/logout', requireAuth, auth.logout);
router.put('/clave', requireAuth, auth.cambiarClave);
router.post('/recuperar', auth.solicitarRecuperacion);
router.get('/recuperar/:token', auth.validarToken);
router.post('/restablecer', auth.restablecer);

export default router;
