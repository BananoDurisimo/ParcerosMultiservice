import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

/* Sin un secreto propio cualquiera podria firmar tokens: el servidor no arranca. */
if ((env.jwtSecret || '').length < 32 || env.jwtSecret.startsWith('cambia-este-secreto')) {
  console.error('JWT_SECRET debe ser un valor propio de al menos 32 caracteres (ver .env.example).');
  process.exit(1);
}

const server = app.listen(env.port, () => console.log(`API disponible en http://localhost:${env.port}/api`));
const cerrar = async () => { server.close(); await pool.end(); };
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
