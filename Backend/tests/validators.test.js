import test from 'node:test';
import assert from 'node:assert/strict';
import { validarCambioClave, validarRestablecer } from '../src/validators/auth.validator.js';
import { validarCreacion, validarEliminacion } from '../src/validators/crud.validator.js';
import { HttpError } from '../src/errors/HttpError.js';

const falla = (fn, status, campo) => assert.throws(fn, (e) => e instanceof HttpError && e.status === status && e.campo === campo);

test('contraseñas: al menos 6 caracteres', () => {
  falla(() => validarCambioClave({ nueva: '123' }), 400, 'nueva');
  falla(() => validarRestablecer({ nueva: '' }), 400, 'nueva');
  falla(() => validarCreacion('usuarios', { contrasena: '12' }), 400, 'contrasena');
  assert.doesNotThrow(() => validarCambioClave({ nueva: '123456' }));
  assert.doesNotThrow(() => validarCreacion('clientes', {}));
});

test('eliminación: abonos, compras y el propio usuario no se eliminan', () => {
  const yo = { id_usuario: 3 };
  falla(() => validarEliminacion('abonos', 1, yo), 400, undefined);
  falla(() => validarEliminacion('compras', 1, yo), 400, undefined);
  falla(() => validarEliminacion('usuarios', 3, yo), 400, undefined);
  assert.doesNotThrow(() => validarEliminacion('usuarios', 4, yo));
  assert.doesNotThrow(() => validarEliminacion('clientes', 1, yo));
});
