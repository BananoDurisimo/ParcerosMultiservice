import test from 'node:test';
import assert from 'node:assert/strict';

process.env.FRONTEND_URL = 'https://bananodurisimo.github.io';
const { default: app } = await import('../src/app.js');

test('CORS: permite la pagina publicada y localhost, rechaza otros origenes', async () => {
  const server = app.listen();
  await new Promise((r) => server.once('listening', r));
  const url = `http://127.0.0.1:${server.address().port}/api/health`;
  const permitido = async (origin) => (await fetch(url, { headers: { Origin: origin } })).headers.get('access-control-allow-origin');
  assert.equal(await permitido('https://bananodurisimo.github.io'), 'https://bananodurisimo.github.io');
  assert.equal(await permitido('http://localhost:5173'), 'http://localhost:5173');
  assert.equal(await permitido('http://localhost:5174'), 'http://localhost:5174');
  assert.equal(await permitido('https://sitio-malicioso.com'), null);
  assert.equal(await permitido('http://localhost.evil.com'), null);
  await new Promise((r) => server.close(r));
});
