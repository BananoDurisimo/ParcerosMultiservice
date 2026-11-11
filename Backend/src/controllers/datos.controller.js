import { obtenerDatos, obtenerArchivo } from '../services/datos.service.js';
import { COLECCIONES } from '../models/colecciones.js';
import { puede } from '../middlewares/auth.middleware.js';
import { prohibido } from '../errors/HttpError.js';

export const listarDatos = async (req, res, next) => {
  try {
    res.json(await obtenerDatos());
  } catch (e) { next(e); }
};

export const verArchivo = async (req, res, next) => {
  try {
    const cfg = COLECCIONES[req.params.coleccion];
    if (cfg?.archivo && !puede(req.user, cfg.modulos, cfg.archivo.acciones)) throw prohibido();
    res.json(await obtenerArchivo(cfg, Number(req.params.id)));
  } catch (e) { next(e); }
};
