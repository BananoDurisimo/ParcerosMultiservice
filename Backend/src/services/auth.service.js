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

const normalizar = (correo) => String(correo || '').trim().toLowerCase().slice(0, 120);

/* Se compara contra este hash cuando el correo no existe, para que la
   respuesta tarde lo mismo y no revele que correos estan registrados. */
const HASH_SENUELO = bcrypt.hashSync('sin-usuario', 12);

/* Freno a la fuerza bruta y al envio masivo de correos: intentos por correo e
   IP cada 15 minutos. Vive en memoria (una sola instancia en Render); con
   varias instancias habria que llevarlo a la base de datos. */
const VENTANA_MS = 15 * 60 * 1000;
const intentos = new Map();
const cuenta = (clave) => {
  const i = intentos.get(clave);
  if (i && i.vence < Date.now()) intentos.delete(clave);
  return intentos.get(clave)?.n || 0;
};
const anotar = (clave) => {
  if (intentos.size > 10000) intentos.clear();
  const i = intentos.get(clave) || { n: 0, vence: Date.now() + VENTANA_MS };
  i.n += 1;
  intentos.set(clave, i);
};
const MAX_LOGIN = 8;
const MAX_RECUPERAR = 3;

/** Valida las credenciales y entrega el token de la sesion. */
export async function iniciarSesion(correoIngresado, contrasena, ip = '') {
  const correo = normalizar(correoIngresado);
  const clave = `login|${ip}|${correo}`;
  if (cuenta(clave) >= MAX_LOGIN) throw new HttpError(429, 'Demasiados intentos fallidos. Espere 15 minutos e intente de nuevo.');
  const { rows } = await query(
    `SELECT u.*, r.nombre AS rol, r.activo AS rol_activo
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE lower(u.correo_empresarial) = $1`,
    [correo]
  );
  const user = rows[0];
  const coincide = await bcrypt.compare(String(contrasena || ''), user?.contrasena_hash || HASH_SENUELO);
  if (!user || !coincide) {
    anotar(clave);
    throw new HttpError(401, ERROR_LOGIN);
  }
  intentos.delete(clave);
  if (!user.activo || !user.rol_activo) throw new HttpError(403, 'El usuario está inactivo. Contacte al administrador.');
  const token = jwt.sign({ sub: user.id_usuario }, env.jwtSecret, { expiresIn: '8h' });
  return { token, user: { id: user.id_usuario, nombre: user.nombre_empleado, correo: user.correo_empresarial, rol: user.rol } };
}

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
export async function solicitarRecuperacion(correoIngresado, ip = '') {
  const correo = normalizar(correoIngresado);
  /* Pasado el limite no se envia nada mas; la respuesta sigue siendo la misma. */
  const clave = `recuperar|${ip}|${correo}`;
  if (cuenta(clave) >= MAX_RECUPERAR) return;
  anotar(clave);
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
