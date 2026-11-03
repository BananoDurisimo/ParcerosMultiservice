import { Router } from 'express';
import { listarDatos } from '../controllers/datos.controller.js';

/* GET /api/datos: todas las tablas que usa el frontend en una sola respuesta. */
const router = Router();

router.get('/datos', listarDatos);

export default router;
