import { Router } from 'express';
import { listarDatos, verArchivo } from '../controllers/datos.controller.js';

/* GET /api/datos: todas las tablas que usa el frontend en una sola respuesta.
   GET /api/archivos/:coleccion/:id: el adjunto de un registro, al abrirlo. */
const router = Router();

router.get('/datos', listarDatos);
router.get('/archivos/:coleccion/:id', verArchivo);

export default router;
