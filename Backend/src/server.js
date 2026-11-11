import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

const server = app.listen(env.port, () => console.log(`API disponible en http://localhost:${env.port}/api`));
const cerrar = async () => { server.close(); await pool.end(); };
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
