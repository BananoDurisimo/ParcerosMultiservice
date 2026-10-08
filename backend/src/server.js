import app from './app.js';
import { pool } from './db/pool.js';
const port=Number(process.env.PORT||3000);
const server=app.listen(port,()=>console.log(`API disponible en http://localhost:${port}/api`));
const close=async()=>{server.close();await pool.end();};
process.on('SIGINT',close); process.on('SIGTERM',close);
