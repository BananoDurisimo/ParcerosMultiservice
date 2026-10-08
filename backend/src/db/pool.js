import pg from 'pg';
import 'dotenv/config';

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
