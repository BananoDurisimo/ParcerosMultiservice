import { readdir, readFile } from 'node:fs/promises';
import { pool } from '../db/pool.js';

/*
 * Aplica, en orden, los archivos de src/db/migrations que todavia no se han
 * ejecutado y los anota en `schema_migrations`. Asi cada migracion corre una
 * sola vez aunque el comando se ejecute en cada despliegue.
 *
 * Una base creada antes de existir esta tabla ya tiene aplicada la 001:
 * si la tabla `permiso` existe, la 001 se marca como aplicada sin correrla.
 */
const carpeta = new URL('../db/migrations/', import.meta.url);

try {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (archivo VARCHAR(120) PRIMARY KEY, aplicada TIMESTAMP NOT NULL DEFAULT NOW())');

  const { rows: [base] } = await pool.query("SELECT to_regclass('public.permiso') IS NOT NULL AS existe");
  if (base.existe) {
    await pool.query("INSERT INTO schema_migrations(archivo) VALUES ('001_initial_schema.sql') ON CONFLICT DO NOTHING");
  }

  const { rows } = await pool.query('SELECT archivo FROM schema_migrations');
  const aplicadas = new Set(rows.map((r) => r.archivo));
  const archivos = (await readdir(carpeta)).filter((f) => f.endsWith('.sql')).sort();

  for (const archivo of archivos) {
    if (aplicadas.has(archivo)) continue;
    const sql = await readFile(new URL(archivo, carpeta), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations(archivo) VALUES ($1)', [archivo]);
    console.log(`Migración aplicada: ${archivo}`);
  }
  console.log('Base de datos al día.');
} finally {
  await pool.end();
}
