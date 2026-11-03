import { describe, expect, it } from 'vitest';
import { consumeInventario, consumoPedido, defectosInsumos, sumarLineas, gastoInsumos, totalLineas } from '@domain/usecases/pedidos.js';
import { COTIZACION, EN_PROCESO, ENTREGADO } from '@core/constants/catalogos.js';

describe('reglas del pedido', () => {
  it('solo descuenta inventario desde que entra en producción', () => {
    expect(consumeInventario(COTIZACION)).toBe(false);
    expect(consumeInventario(EN_PROCESO)).toBe(true);
    expect(consumeInventario(ENTREGADO)).toBe(true);
  });

  it('el consumo es la receta más la personalización', () => {
    const p = { insumos_receta: [{ id_insumo: 1, cantidad: 2 }], insumos: [{ id_insumo: 2, cantidad: 1 }] };
    expect(consumoPedido(p)).toEqual([{ id_insumo: 1, cantidad: 2 }, { id_insumo: 2, cantidad: 1 }]);
    expect(consumoPedido(null)).toEqual([]);
  });

  it('suma las líneas de un mismo insumo y lista los defectuosos', () => {
    expect(sumarLineas([{ id_insumo: 1, cantidad: 1.2 }], [{ id_insumo: 1, cantidad: 0.3 }, { id_insumo: 2, cantidad: 1 }]))
      .toEqual([{ id_insumo: 1, cantidad: 1.5 }, { id_insumo: 2, cantidad: 1 }]);
    expect(defectosInsumos([{ id_insumo: 3, defectuosas: '2' }, { id_insumo: 4, defectuosas: 0 }]))
      .toEqual([{ id_insumo: 3, cantidad: 2 }]);
  });

  it('total = productos + personalización; gasto al costo de la última compra', () => {
    expect(totalLineas([{ cantidad: 10, precio_unitario: 350 }], [{ cantidad: 2, precio_unitario: 250 }])).toBe(4000);
    const insumo = (id) => ({ 1: { calc_costo: 120 } })[id];
    expect(gastoInsumos([{ id_insumo: 1, cantidad: 1.5 }], insumo)).toBe(180);
  });
});
