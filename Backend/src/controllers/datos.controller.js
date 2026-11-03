import { obtenerDatos } from '../services/datos.service.js';

export const listarDatos = async (req, res, next) => {
  try {
    res.json(await obtenerDatos());
  } catch (e) { next(e); }
};
