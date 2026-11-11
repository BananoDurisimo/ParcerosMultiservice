import { Router } from 'express';
import * as crud from '../controllers/crud.controller.js';

/* Escritura de las colecciones de models/colecciones.js. */
const router = Router();

router.post('/:coleccion', crud.crear);
router.put('/:coleccion/:id', crud.modificar);
router.delete('/:coleccion/:id', crud.eliminar);

export default router;
