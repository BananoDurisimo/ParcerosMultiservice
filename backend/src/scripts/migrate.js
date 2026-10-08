import { readFile } from 'node:fs/promises';
import { pool } from '../db/pool.js';
const sql = await readFile(new URL('../db/migrations/001_initial_schema.sql', import.meta.url), 'utf8');
try { await pool.query(sql); console.log('Migración aplicada correctamente.'); } finally { await pool.end(); }
