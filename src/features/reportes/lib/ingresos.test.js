import test from 'node:test';
import assert from 'node:assert/strict';
import { construirMovimientos, filtrarMovimientos, resumir, pendienteDeCobro, rangoDe, ABONO, PAGO_COMPLETO } from './ingresos.js';

/* P1 total 1000: abono 500 (1 oct) + saldo 500 (20 oct). P2 total 800: pago completo (5 oct).
   P3 total 600: un abono de 300 (nov) y saldo 300 pendiente. P4: cotizacion sin pagos. */
const db = {
  pedidos: [
    { id: 1, calc_codigo: 'PED-0001', calc_cliente: 'Ana', calc_total: 1000, estado: 'Pedido completado', fecha_creacion: '2026-09-25' },
    { id: 2, calc_codigo: 'PED-0002', calc_cliente: 'Beto', calc_total: 800, estado: 'Pedido entregado / vendido', fecha_creacion: '2026-10-01' },
    { id: 3, calc_codigo: 'PED-0003', calc_cliente: 'Cami', calc_total: 600, estado: 'Pedido en proceso', fecha_creacion: '2026-10-28' },
    { id: 4, calc_codigo: 'PED-0004', calc_cliente: 'Dani', calc_total: 400, estado: 'Cotización aprobada por el cliente', fecha_creacion: '2026-10-02' },
  ],
  abonos: [
    { id: 11, id_pedido: 1, monto: 500, fecha: '2026-10-01', metodo_pago: 'Efectivo', calc_codigo: 'AB-0011' },
    { id: 12, id_pedido: 1, monto: 500, fecha: '2026-10-20', metodo_pago: 'Transferencia', calc_codigo: 'AB-0012' },
    { id: 13, id_pedido: 2, monto: 800, fecha: '2026-10-05', metodo_pago: 'Tarjeta', calc_codigo: 'AB-0013' },
    { id: 14, id_pedido: 3, monto: 300, fecha: '2026-11-02', metodo_pago: 'Efectivo', calc_codigo: 'AB-0014' },
  ],
  movimientos: [{ tabla: 'abono', accion: 'INSERT', id_registro: 13, fecha_cambio: '2026-10-05T14:32:10' }],
};
const movs = construirMovimientos(db);
const octubre = rangoDe('Mes', '2026-10-09');

test('cada abono es un movimiento y el pago que salda se registra por lo recibido', () => {
  assert.equal(movs.length, 4);
  const porId = Object.fromEntries(movs.map((m) => [m.id, m]));
  assert.deepEqual([porId[11].tipo, porId[12].tipo, porId[13].tipo, porId[14].tipo], [ABONO, PAGO_COMPLETO, PAGO_COMPLETO, ABONO]);
  assert.equal(porId[12].monto, 500); // no 1000: no repite el abono anterior
  assert.equal(porId[13].hora, '14:32');
});

test('el resumen de octubre suma cada pago una sola vez', () => {
  const r = resumir(filtrarMovimientos(movs, octubre));
  assert.deepEqual([r.total, r.abonos, r.completos, r.transacciones], [1800, 500, 1300, 3]);
  assert.equal(r.total, r.abonos + r.completos);
});

test('los filtros de tipo y metodo recortan el reporte', () => {
  assert.equal(resumir(filtrarMovimientos(movs, { ...octubre, tipo: ABONO })).total, 500);
  assert.equal(resumir(filtrarMovimientos(movs, { ...octubre, metodo: 'Tarjeta' })).total, 800);
  assert.equal(resumir(filtrarMovimientos(movs, { desde: '2026-10-20', hasta: '2026-10-20' })).transacciones, 1);
});

test('el pendiente es aparte: saldo al cierre, sin cotizaciones', () => {
  assert.equal(pendienteDeCobro(db, '2026-10-31'), 600); // P1 y P2 pagados; P3 (creado el 28) debe sus 600 hasta el 2 de nov
  assert.equal(pendienteDeCobro(db, '2026-10-10'), 500); // P1 debia 500 (P2 ya pagado)
  assert.equal(pendienteDeCobro(db), 300);               // hoy: solo P3
});

test('rangos de periodo', () => {
  assert.deepEqual([octubre.desde, octubre.hasta], ['2026-10-01', '2026-10-31']);
  const s = rangoDe('Semana', '2026-10-09'); // viernes
  assert.deepEqual([s.desde, s.hasta], ['2026-10-05', '2026-10-11']);
  assert.deepEqual([rangoDe('Año', '2026-10-09').desde, rangoDe('Día', '2026-10-09').hasta], ['2026-01-01', '2026-10-09']);
});
