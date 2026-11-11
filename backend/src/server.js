import app from './app.js';
import { pool } from './db/pool.js';

/* Sin un secreto propio cualquiera podria firmar tokens: el servidor no arranca. */
const secreto = process.env.JWT_SECRET || '';
if (secreto.length < 32 || secreto.startsWith('cambia-este-secreto')) {
  console.error('JWT_SECRET debe ser un valor propio de al menos 32 caracteres (ver .env.example).');
  process.exit(1);
}

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => console.log(`API disponible en http://localhost:${port}/api`));
const close = async () => { server.close(); await pool.end(); };
process.on('SIGINT', close);
process.on('SIGTERM', close);
