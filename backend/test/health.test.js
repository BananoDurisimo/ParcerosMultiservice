import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
test('la aplicación expone health check', async () => {
  const server=app.listen(); await new Promise(resolve=>server.once('listening',resolve));
  const {port}=server.address(); const response=await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal(response.status,200); assert.equal((await response.json()).ok,true); await new Promise(resolve=>server.close(resolve));
});
