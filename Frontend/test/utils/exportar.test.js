import { describe, it, expect } from 'vitest';
import { libroXlsx } from '@core/utils/exportar.js';

/* El zip va sin comprimir: su XML se puede leer como texto. */
const texto = (partes) => new TextDecoder().decode(new Uint8Array(partes.flatMap((p) => [...p])));

describe('libroXlsx', () => {
  const doc = {
    titulo: 'Abonos',
    generado: new Date(2026, 7, 30, 10, 5),
    filtros: [],
    columnas: [
      { titulo: 'Abono', valor: (r) => r.codigo },
      { titulo: 'Monto', valor: (r) => r.monto, tipo: 'dinero', total: true },
    ],
    filas: [{ codigo: 'AB-0001', monto: 100 }, { codigo: 'AB-0002', monto: 250.5 }],
    indicadores: [{ etiqueta: 'Abonos', valor: 2, tipo: 'numero' }],
    grupos: [],
  };

  it('abre en el detalle, con filtros de columna, totales y la hoja de resumen', () => {
    const xml = texto(libroXlsx(doc));
    expect(xml.indexOf('<sheet name="Detalle"')).toBeLessThan(xml.indexOf('<sheet name="Resumen"'));
    expect(xml).toContain('<autoFilter ref="A5:B7"/>');
    expect(xml).toContain("'Detalle'!$A$5:$B$7");
    expect(xml).toContain('<f>SUBTOTAL(9,B6:B7)</f><v>350.5</v>');
    expect(xml).toContain('<mergeCell ref="A1:B1"/>');
  });
});
