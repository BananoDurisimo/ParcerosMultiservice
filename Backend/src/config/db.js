import pg from 'pg';
import { env } from './env.js';

/* Tipos que el frontend espera como texto o numero: las fechas sin
 * corrimiento de zona horaria ("2026-08-30") y los NUMERIC como numero. */
pg.types.setTypeParser(1082, (v) => v); // DATE
pg.types.setTypeParser(1114, (v) => v.replace(' ', 'T')); // TIMESTAMP
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v))); // NUMERIC
pg.types.setTypeParser(20, (v) => Number(v)); // BIGINT (COUNT)

/* Con TLS (Render, Supabase) la verificación del certificado permanece activa. */
export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ...(env.dbSsl ? { ssl: { rejectUnauthorized: true } } : {}),
});
export const query = (text, params) => pool.query(text, params);

/**
 * Ejecuta `fn(client)` dentro de una transaccion en la que `app.user_id` es
 * el usuario de la peticion. Asi los triggers de inventario
 * registran al responsable correcto: la variable vive solo en esta
 * transaccion y en esta conexion, no se filtra a otras peticiones.
 */
export async function conUsuario(idUsuario, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true)", [String(idUsuario ?? '')]);
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
