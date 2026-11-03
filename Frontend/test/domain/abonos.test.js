import { describe, expect, it } from 'vitest';
import { errorMonto } from '@domain/usecases/abonos.js';

describe('monto del abono', () => {
  it('es obligatorio, mayor que cero y con dos decimales como máximo', () => {
    expect(errorMonto('', 0, 100)).toMatch(/vacío/);
    expect(errorMonto('-5', 0, 100)).toMatch(/mayor que cero/);
    expect(errorMonto('10.555', 0, 100)).toMatch(/dos decimales/);
  });

  it('el primer abono es de al menos el 50% y ninguno pasa el saldo', () => {
    expect(errorMonto('40', 50, 100, { primero: true })).toMatch(/50%/);
    expect(errorMonto('120', 0, 100)).toMatch(/saldo pendiente/);
    expect(errorMonto('50', 50, 100, { primero: true })).toBeNull();
  });
});
