import pg from 'pg';
import 'dotenv/config';

/* Tipos que el frontend espera como texto o numero: las fechas sin
 * corrimiento de zona horaria ("2026-08-30") y los NUMERIC como numero. */
pg.types.setTypeParser(1082, (v) => v); // DATE
pg.types.setTypeParser(1114, (v) => v.replace(' ', 'T')); // TIMESTAMP
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v))); // NUMERIC
pg.types.setTypeParser(20, (v) => Number(v)); // BIGINT (COUNT)

const connectionString = process.env.DATABASE_URL;
/* PostgreSQL local normalmente no usa TLS; proveedores administrados como
 * Render y Supabase lo exigen para conexiones externas. La verificación del
 * certificado permanece activa. */
const useSsl = process.env.DB_SSL === 'true' ||
  /(?:render\.com|supabase\.co)/i.test(connectionString || '');

export const pool = new pg.Pool({
  connectionString,
  ...(useSsl ? { ssl: { rejectUnauthorized: true } } : {}),
});
export const query = (text, params) => pool.query(text, params);

/**
 * Ejecuta `fn(client)` dentro de una transaccion en la que `app.user_id` es
 * el usuario de la peticion. Asi los triggers de auditoria y de inventario
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
