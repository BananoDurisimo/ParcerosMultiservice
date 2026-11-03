import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { HttpError } from '../errors/HttpError.js';
import { sha256 } from '../utils/helpers.js';
import { enviarCorreo } from './correo.service.js';
import { correoRecuperacion } from '../utils/plantillasCorreo.js';

const ERROR_LOGIN = 'Correo o contraseña incorrectos.';
const ENLACE_INVALIDO = 'El enlace no es válido o ha vencido. Solicite uno nuevo.';

const normalizar = (correo) => String(correo || '').trim().toLowerCase();
const registrarAcceso = (idUsuario, correo, resultado) =>
  query('INSERT INTO acceso(id_usuario,correo,resultado) VALUES($1,$2,$3)', [idUsuario, correo, resultado]);

/** Valida las credenciales, registra el acceso y entrega el token de la sesion. */
export async function iniciarSesion(correoIngresado, contrasena) {
  const correo = normalizar(correoIngresado);
  const { rows } = await query(
    `SELECT u.*, r.nombre AS rol, r.activo AS rol_activo
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE lower(u.correo_empresarial) = $1`,
    [correo]
  );
  const user = rows[0];
  const claveOk = user && (await bcrypt.compare(String(contrasena || ''), user.contrasena_hash));
  if (!claveOk) {
    await registrarAcceso(user?.id_usuario || null, correo, 'LOGIN_FALLIDO');
    throw new HttpError(401, ERROR_LOGIN);
  }
  if (!user.activo || !user.rol_activo) {
    await registrarAcceso(user.id_usuario, correo, 'LOGIN_FALLIDO');
    throw new HttpError(403, 'El usuario está inactivo. Contacte al administrador.');
  }
  await registrarAcceso(user.id_usuario, correo, 'LOGIN');
  const token = jwt.sign({ sub: user.id_usuario }, env.jwtSecret, { expiresIn: '8h' });
  return { token, user: { id: user.id_usuario, nombre: user.nombre_empleado, correo: user.correo_empresarial, rol: user.rol } };
}

export const cerrarSesion = (usuario) => registrarAcceso(usuario.id_usuario, usuario.correo_empresarial, 'LOGOUT');

/** Cambio de contrasena del propio usuario (Mi cuenta). */
export async function cambiarClave(idUsuario, actual, nueva) {
  const { rows } = await query('SELECT contrasena_hash FROM usuario WHERE id_usuario=$1', [idUsuario]);
  if (!(await bcrypt.compare(String(actual), rows[0].contrasena_hash))) {
    throw new HttpError(400, 'La contraseña actual no es correcta.', 'actual');
  }
  await query('UPDATE usuario SET contrasena_hash=$1 WHERE id_usuario=$2', [await bcrypt.hash(String(nueva), 12), idUsuario]);
}

/*
 * Recuperacion de contraseña: se envia por correo un enlace de un solo uso,
 * valido 30 minutos. Si el correo no existe no pasa nada (la respuesta al
 * cliente es la misma) y el correo se envia sin esperar, para no revelar que
 * usuarios estan registrados.
 */
export async function solicitarRecuperacion(correoIngresado) {
  const correo = normalizar(correoIngresado);
  const { rows: [u] } = await query(
    `SELECT u.id_usuario, u.nombre_empleado FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE lower(u.correo_empresarial) = $1 AND u.activo AND r.activo`,
    [correo]
  );
  if (!u) return;
  const token = crypto.randomBytes(32).toString('hex');
  await query("INSERT INTO recuperacion_clave (token_hash, id_usuario, vence) VALUES ($1, $2, NOW() + interval '30 minutes')", [sha256(token), u.id_usuario]);
  const enlace = `${env.appUrl}/recuperar?token=${token}`;
  enviarCorreo({ para: correo, asunto: 'Restablecer contraseña', html: correoRecuperacion({ nombre: u.nombre_empleado, enlace }) })
    .catch(console.error);
}

export async function tokenVigente(token) {
  const { rows } = await query(
    'SELECT 1 FROM recuperacion_clave WHERE token_hash = $1 AND NOT usado AND vence > NOW()', [sha256(token)]
  );
  return rows.length > 0;
}

export async function restablecerClave(token, nueva) {
  /* Marcar como usado y leer el usuario en una sola sentencia: el enlace no se puede usar dos veces. */
  const { rows: [r] } = await query(
    'UPDATE recuperacion_clave SET usado = TRUE WHERE token_hash = $1 AND NOT usado AND vence > NOW() RETURNING id_usuario', [sha256(token)]
  );
  if (!r) throw new HttpError(400, ENLACE_INVALIDO);
  await query('UPDATE usuario SET contrasena_hash=$1 WHERE id_usuario=$2', [await bcrypt.hash(String(nueva), 12), r.id_usuario]);
}
