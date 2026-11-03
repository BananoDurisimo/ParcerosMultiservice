import { ESTADOS_PEDIDO } from '@core/constants/catalogos.js';

/* Reglas del pedido: consumo de inventario, lineas y totales. */

const redondear = (n) => Math.round(n * 100) / 100;
const subtotal = (l) => Number(l.cantidad || 0) * Number(l.precio_unitario || 0);

/** Un pedido descuenta sus insumos del inventario desde que entra en
 *  produccion ("Pedido en proceso") y el descuento se mantiene hasta la
 *  entrega: mientras es cotizacion todavia no consume nada. */
export const consumeInventario = (estado) => ESTADOS_PEDIDO.indexOf(estado) >= 1;

/** Todo lo que un pedido gasta del inventario: la copia de la receta de sus
 *  productos mas los insumos de personalizacion. */
export const consumoPedido = (p) => [...(p?.insumos_receta || []), ...(p?.insumos || [])];

/** Lo que se echo a perder de la personalizacion, como [{ id_insumo, cantidad }]. */
export const defectosInsumos = (insumos = []) =>
  insumos.filter((l) => Number(l.defectuosas) > 0).map((l) => ({ id_insumo: l.id_insumo, cantidad: Number(l.defectuosas) }));

/** Junta varias listas [{ id_insumo, cantidad }] sumando las de un mismo insumo. */
export const sumarLineas = (...listas) => {
  const m = new Map();
  listas.flat().forEach((l) => m.set(l.id_insumo, (m.get(l.id_insumo) || 0) + Number(l.cantidad || 0)));
  return [...m].map(([id_insumo, cantidad]) => ({ id_insumo, cantidad: Math.round(cantidad * 1000) / 1000 }));
};

/** Lo que costaron unos insumos ([{ id_insumo, cantidad }]) al precio de su
 *  ultima compra. `insumo` busca la fila del insumo por id. */
export const gastoInsumos = (lineas = [], insumo) =>
  redondear(lineas.reduce((s, l) => s + Number(l.cantidad || 0) * Number(insumo(l.id_insumo)?.calc_costo || 0), 0));

/** Total que se cobra: productos + insumos de personalizacion. */
export const totalLineas = (productos = [], insumos = []) =>
  redondear([...productos, ...insumos].reduce((s, l) => s + subtotal(l), 0));
