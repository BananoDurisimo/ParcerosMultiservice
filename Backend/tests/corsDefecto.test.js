import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * Sin FRONTEND_URL la API no debe aceptar cualquier origen: el valor por
 * defecto tiene que ser cerrado, no abierto.
 *
 * DOTENV_CONFIG_PATH apunta a un archivo inexistente para que dotenv no cargue
 * el .env del equipo, que si define FRONTEND_URL (dotenv ignora en silencio un
 * archivo que no existe).
 */
process.env.DOTENV_CONFIG_PATH = 'no-existe.env';
delete process.env.FRONTEND_URL;
const { default: app } = await import('../src/app.js');

test('CORS sin FRONTEND_URL: permite localhost y rechaza un origen ajeno', async (t) => {
  const server = app.listen();
  await new Promise((r) => server.once('listening', r));
  /* db.js abre el pool al importarse; sin cerrarlo el proceso no termina. */
  t.after(async () => { const { pool } = await import('../src/config/db.js'); await pool.end(); });
  const url = `http://127.0.0.1:${server.address().port}/api/health`;
  const permitido = async (origin) => (await fetch(url, { headers: { Origin: origin } })).headers.get('access-control-allow-origin');
  assert.equal(await permitido('http://localhost:5173'), 'http://localhost:5173');
  assert.equal(await permitido('https://sitio-malicioso.com'), null);
  assert.equal(await permitido('https://bananodurisimo.github.io'), null);
  await new Promise((r) => server.close(r));
});
