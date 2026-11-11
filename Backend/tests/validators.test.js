import test from 'node:test';
import assert from 'node:assert/strict';
import { validarCambioClave, validarRestablecer } from '../src/validators/auth.validator.js';
import { validarArchivo, validarCreacion, validarEliminacion, validarModificacion } from '../src/validators/crud.validator.js';
import { COLECCIONES } from '../src/models/colecciones.js';
import { HttpError } from '../src/errors/HttpError.js';

const falla = (fn, status, campo) => assert.throws(fn, (e) => e instanceof HttpError && e.status === status && e.campo === campo);

test('contraseñas: al menos 6 caracteres', () => {
  falla(() => validarCambioClave({ nueva: '123' }), 400, 'nueva');
  falla(() => validarRestablecer({ nueva: '' }), 400, 'nueva');
  falla(() => validarCreacion('usuarios', { contrasena: '12' }), 400, 'contrasena');
  assert.doesNotThrow(() => validarCambioClave({ nueva: '123456' }));
  assert.doesNotThrow(() => validarCreacion('clientes', {}));
  falla(() => validarModificacion('usuarios', { contrasena: '12' }), 400, 'contrasena');
  assert.doesNotThrow(() => validarModificacion('usuarios', {}));
});

test('adjuntos: solo data URL de los tipos de la colección', () => {
  const { pedidos, abonos, clientes } = COLECCIONES;
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  const pdf = 'data:application/pdf;base64,JVBERi0=';
  assert.doesNotThrow(() => validarArchivo(pedidos, { ruta_imagen_diseno: png }));
  assert.doesNotThrow(() => validarArchivo(pedidos, { ruta_imagen_diseno: '' }));
  assert.doesNotThrow(() => validarArchivo(abonos, { ruta_comprobante: pdf }));
  assert.doesNotThrow(() => validarArchivo(clientes, { ruta_imagen_diseno: 'lo-que-sea' }));
  falla(() => validarArchivo(pedidos, { ruta_imagen_diseno: pdf }), 400, 'ruta_imagen_diseno');
  falla(() => validarArchivo(pedidos, { ruta_imagen_diseno: 'https://externo/imagen.png' }), 400, 'ruta_imagen_diseno');
  falla(() => validarArchivo(pedidos, { ruta_imagen_diseno: 'data:text/html;base64,PHNjcmlwdD4=' }), 400, 'ruta_imagen_diseno');
  falla(() => validarArchivo(abonos, { ruta_comprobante: 'data:image/png;base64,' + 'A'.repeat(7_200_000) }), 400, 'ruta_comprobante');
});

test('eliminación: abonos, compras y el propio usuario no se eliminan', () => {
  const yo = { id_usuario: 3 };
  falla(() => validarEliminacion('abonos', 1, yo), 400, undefined);
  falla(() => validarEliminacion('compras', 1, yo), 400, undefined);
  falla(() => validarEliminacion('usuarios', 3, yo), 400, undefined);
  assert.doesNotThrow(() => validarEliminacion('usuarios', 4, yo));
  assert.doesNotThrow(() => validarEliminacion('clientes', 1, yo));
});
