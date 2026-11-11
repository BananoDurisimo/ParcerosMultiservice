import { puede } from '../middlewares/auth.middleware.js';
import { AGREGAR, CAMBIAR_ESTADO, COLECCIONES, EDITAR, ELIMINAR, PERFIL } from '../models/colecciones.js';
import { HttpError, noEncontrado, prohibido } from '../errors/HttpError.js';
import * as crud from '../services/crud.service.js';
import { validarArchivo, validarCreacion, validarEliminacion, validarModificacion } from '../validators/crud.validator.js';

/* POST /api/:coleccion, PUT /api/:coleccion/:id y DELETE /api/:coleccion/:id. */

/* Se responde solo la llave del registro: el frontend recarga los datos tras
   cada cambio, y la fila completa traia el adjunto (hasta 5 MB) y, en los
   usuarios, el hash de la contraseña. */
const llave = (cfg, fila) => ({ [cfg.pk]: fila[cfg.pk] });

const modeloDe = (req) => {
  const { coleccion } = req.params;
  const cfg = Object.hasOwn(COLECCIONES, coleccion) ? COLECCIONES[coleccion] : null;
  if (!cfg) throw new HttpError(404, 'Ruta no encontrada.');
  if (!req.body || typeof req.body !== 'object') req.body = {};
  let id = null;
  if (req.params.id !== undefined) {
    id = Number(req.params.id);
    if (!(Number.isInteger(id) && id > 0)) throw noEncontrado();
  }
  return { coleccion, cfg, id };
};

export const crear = async (req, res, next) => {
  try {
    const { coleccion, cfg } = modeloDe(req);
    if (!puede(req.user, cfg.modulos, AGREGAR)) throw prohibido();
    validarCreacion(coleccion, req.body);
    validarArchivo(cfg, req.body);
    res.status(201).json(llave(cfg, await crud.crear(coleccion, cfg, req.body, req.user)));
  } catch (e) { next(e); }
};

/**
 * Columnas que el usuario puede cambiar segun sus privilegios: con «Editar»,
 * los datos; con «Cambiar estado» o «Anular», el estado; con ambos, todo.
 * `detalle` indica si tambien puede cambiar lo que cuelga del registro
 * (lineas, permisos del rol, contraseña de otro usuario).
 */
const alcance = (req, coleccion, cfg, id) => {
  const editar = puede(req.user, cfg.modulos, EDITAR);
  const estado = puede(req.user, cfg.modulos, CAMBIAR_ESTADO);
  const deEstado = cfg.estado || ['activo'];
  let campos;
  if (editar) campos = estado ? cfg.campos : cfg.campos.filter((c) => !deEstado.includes(c));
  else if (estado) campos = cfg.campos.filter((c) => deEstado.includes(c));
  /* Sin permiso sobre Usuarios, cada quien solo edita su propio perfil. */
  else if (coleccion === 'usuarios' && id === req.user.id_usuario) campos = PERFIL;
  else throw prohibido();
  return { campos: campos.filter((c) => !cfg.soloCrear?.includes(c)), detalle: editar };
};

export const modificar = async (req, res, next) => {
  try {
    const { coleccion, cfg, id } = modeloDe(req);
    const { campos, detalle } = alcance(req, coleccion, cfg, id);
    if (detalle) validarModificacion(coleccion, req.body);
    validarArchivo(cfg, req.body);
    res.json(llave(cfg, await crud.modificar(coleccion, cfg, id, req.body, req.user, campos, detalle)));
  } catch (e) { next(e); }
};

export const eliminar = async (req, res, next) => {
  try {
    const { coleccion, cfg, id } = modeloDe(req);
    if (!puede(req.user, cfg.modulos, ELIMINAR)) throw prohibido();
    validarEliminacion(coleccion, id, req.user);
    await crud.eliminar(coleccion, cfg, id, req.user);
    res.status(204).end();
  } catch (e) { next(e); }
};
