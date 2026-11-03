import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import auth from './auth.routes.js';
import datos from './datos.routes.js';
import crud from './crud.routes.js';

/* Todas las rutas cuelgan de /api. Salvo health y auth, exigen sesion. */
const router = Router();

router.get('/health', (_, res) => res.json({ ok: true, service: 'parceros-multiservice-api' }));
router.use('/auth', auth);
router.use('/', requireAuth, datos);
router.use('/', requireAuth, crud);

export default router;
