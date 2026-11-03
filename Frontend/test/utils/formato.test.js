import { describe, expect, it } from 'vitest';
import { fecha, fechaHora, toISO, codigoPedido, codigoCompra, codigoAbono, mes } from '@core/utils/formato.js';

describe('formato', () => {
  it('fechas en dd/mm/aaaa y horas en 12 h', () => {
    expect(fecha('2026-10-24')).toBe('24/10/2026');
    expect(fecha('')).toBe('—');
    expect(fechaHora('2026-08-30T14:22:10')).toBe('30/08/2026, 02:22 p.m.');
    expect(toISO(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(mes('2026-08')).toBe('Agosto 2026');
  });

  it('códigos de los documentos', () => {
    expect(codigoPedido(7)).toBe('PED-0007');
    expect(codigoCompra(12)).toBe('CMP-0012');
    expect(codigoAbono(3)).toBe('AB-0003');
  });
});
