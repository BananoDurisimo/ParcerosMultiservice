import { puede } from '../middlewares/auth.middleware.js';
import { AGREGAR, COLECCIONES, ELIMINAR, MODIFICAR, PERFIL } from '../models/colecciones.js';
import { HttpError, prohibido } from '../errors/HttpError.js';
import * as crud from '../services/crud.service.js';
import { validarCreacion, validarEliminacion } from '../validators/crud.validator.js';

/* POST /api/:coleccion, PUT /api/:coleccion/:id y DELETE /api/:coleccion/:id. */

const modeloDe = (coleccion) => {
  const cfg = COLECCIONES[coleccion];
  if (!cfg) throw new HttpError(404, 'Ruta no encontrada.');
  return cfg;
};

export const crear = async (req, res, next) => {
  try {
    const { coleccion } = req.params;
    const cfg = modeloDe(coleccion);
    if (!puede(req.user, cfg.modulos, AGREGAR)) throw prohibido();
    validarCreacion(coleccion, req.body);
    res.status(201).json(await crud.crear(coleccion, cfg, req.body, req.user));
  } catch (e) { next(e); }
};

export const modificar = async (req, res, next) => {
  try {
    const { coleccion } = req.params;
    const cfg = modeloDe(coleccion);
    const id = Number(req.params.id);
    let campos = cfg.campos;
    if (!puede(req.user, cfg.modulos, MODIFICAR)) {
      /* Sin permiso sobre Usuarios, cada quien solo edita su propio perfil. */
      if (coleccion !== 'usuarios' || id !== req.user.id_usuario) throw prohibido();
      campos = PERFIL;
    }
    res.json(await crud.modificar(coleccion, cfg, id, req.body, req.user, campos));
  } catch (e) { next(e); }
};

export const eliminar = async (req, res, next) => {
  try {
    const { coleccion } = req.params;
    const cfg = modeloDe(coleccion);
    if (!puede(req.user, cfg.modulos, ELIMINAR)) throw prohibido();
    const id = Number(req.params.id);
    validarEliminacion(coleccion, id, req.user);
    await crud.eliminar(coleccion, cfg, id, req.user);
    res.status(204).end();
  } catch (e) { next(e); }
};
