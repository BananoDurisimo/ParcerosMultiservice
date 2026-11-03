import test from 'node:test';
import assert from 'node:assert/strict';
import { correoEstadoPedido } from '../src/utils/plantillasCorreo.js';

const pedido = {
  codigo: 'PED-0007', nombre: 'Club <Los Halcones>', estado: 'Pedido completado - falta pago', orden: 3,
  fecha_creacion: '2026-10-01', fecha_entrega: '2026-10-28', total: 15100, abonado: 7550, saldo: 7550,
  productos: [{ nombre: 'Camiseta Dry Fit M', cantidad: 20 }],
};

test('correo de estado: muestra el pedido, el saldo y los productos', () => {
  const html = correoEstadoPedido(pedido);
  assert.match(html, /PED-0007/);
  assert.match(html, /Pedido completado - falta pago/);
  assert.match(html, /C\$ 7,550\.00/);
  assert.match(html, /Camiseta Dry Fit M/);
  assert.match(html, /28\/10\/2026/);
});

test('correo de estado: escapa el HTML de los datos del cliente', () => {
  const html = correoEstadoPedido(pedido);
  assert.ok(!html.includes('<Los Halcones>'));
  assert.match(html, /Club &lt;Los Halcones&gt;/);
});

test('correo de estado: un estado desconocido no rompe la plantilla', () => {
  const html = correoEstadoPedido({ ...pedido, orden: 99, estado: 'Otro' });
  assert.match(html, /Su pedido cambió a «Otro»/);
});
