import * as auth from '../services/auth.service.js';
import { validarCambioClave, validarRestablecer } from '../validators/auth.validator.js';

/* Cada manejador traduce la peticion al servicio y la respuesta a HTTP. Los
   errores (HttpError o de PostgreSQL) los responde errors/errorHandler.js. */

export const login = async (req, res, next) => {
  try {
    res.json(await auth.iniciarSesion(req.body?.correo, req.body?.contrasena, req.ip));
  } catch (e) { next(e); }
};

export const me = (req, res) => res.json({ user: req.user });

export const cambiarClave = async (req, res, next) => {
  try {
    validarCambioClave(req.body || {});
    const { actual = '', nueva = '' } = req.body || {};
    await auth.cambiarClave(req.user.id_usuario, actual, nueva);
    res.status(204).end();
  } catch (e) { next(e); }
};

export const solicitarRecuperacion = async (req, res, next) => {
  try {
    await auth.solicitarRecuperacion(req.body?.correo, req.ip);
    res.status(204).end();
  } catch (e) { next(e); }
};

export const validarToken = async (req, res, next) => {
  try {
    res.json({ valido: await auth.tokenVigente(req.params.token) });
  } catch (e) { next(e); }
};

export const restablecer = async (req, res, next) => {
  try {
    validarRestablecer(req.body || {});
    const { token = '', nueva = '' } = req.body || {};
    await auth.restablecerClave(token, nueva);
    res.status(204).end();
  } catch (e) { next(e); }
};
