import { describe, expect, it } from 'vitest';
import { camposCambiados } from '@domain/usecases/movimientos.js';

describe('historial de movimientos', () => {
  it('devuelve solo las columnas que cambiaron, sin la contraseña', () => {
    const cambios = camposCambiados({ nombre: 'A', telefono: '1', contrasena: 'x' }, { nombre: 'B', telefono: '1', contrasena: 'y' });
    expect(cambios).toEqual([{ campo: 'nombre', etiqueta: 'Nombre', antes: 'A', despues: 'B' }]);
  });

  it('un adjunto reemplazado se informa como tal', () => {
    const [c] = camposCambiados({ ruta_comprobante: 'data:image/png;a' }, { ruta_comprobante: 'data:image/png;b' });
    expect(c.despues).toBe('Archivo reemplazado');
  });
});
