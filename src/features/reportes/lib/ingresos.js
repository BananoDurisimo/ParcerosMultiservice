/**
 * Calculo de ingresos del modulo Reportes. Funciones puras: reciben las
 * colecciones de `useData().db` y no leen nada por su cuenta, asi se pueden
 * probar sin React (ingresos.test.js).
 *
 * Un ingreso es un abono: la tabla `abono` guarda cada pago recibido, y el
 * pedido (cotizacion, pedido o venta) solo aporta su total. Los ingresos se
 * suman SIEMPRE desde las filas de abono y nunca desde `pedido.calc_abonado`,
 * por eso un pago no se cuenta dos veces ni el saldo pendiente se confunde con
 * dinero recibido.
 */
import { COTIZACION } from '../../../shared/data/mock.js';

export const ABONO = 'Abono';
export const PAGO_COMPLETO = 'Pago completo';
export const TIPOS = [ABONO, PAGO_COMPLETO];

export const redondear = (n) => Math.round(n * 100) / 100;
const suma = (arr, fn) => redondear(arr.reduce((s, x) => s + Number(fn(x) || 0), 0));

/**
 * Un movimiento por cada abono valido, con su tipo:
 *  - «Pago completo»: el pago que deja el saldo del pedido en cero (tanto el
 *    pago total de entrada como el que liquida el saldo despues de un abono);
 *  - «Abono»: el pago que deja saldo pendiente.
 * El valor de cada movimiento es solo lo recibido en esa transaccion.
 * La hora sale del registro de auditoria (`movimientos`, INSERT del abono):
 * la tabla `abono` guarda unicamente la fecha del pago.
 */
export function construirMovimientos(db) {
  const pedidos = new Map(db.pedidos.map((p) => [p.id, p]));
  const horaDe = new Map();
  (db.movimientos || []).forEach((m) => {
    if (m.tabla === 'abono' && m.accion === 'INSERT' && m.fecha_cambio) horaDe.set(m.id_registro, m.fecha_cambio.slice(11, 16));
  });

  const porPedido = new Map();
  db.abonos
    .filter((a) => Number(a.monto) > 0 && pedidos.has(a.id_pedido))
    .forEach((a) => porPedido.set(a.id_pedido, [...(porPedido.get(a.id_pedido) || []), a]));

  const out = [];
  porPedido.forEach((abonos, idPedido) => {
    const p = pedidos.get(idPedido);
    let acumulado = 0;
    [...abonos].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id).forEach((a, i) => {
      acumulado = redondear(acumulado + Number(a.monto));
      const saldoTras = Math.max(0, redondear(p.calc_total - acumulado));
      const hora = horaDe.get(a.id) || '';
      out.push({
        id: a.id,
        codigo: a.calc_codigo,
        id_pedido: idPedido,
        pedido: p.calc_codigo,
        cliente: p.calc_cliente,
        tipo: saldoTras <= 0 ? PAGO_COMPLETO : ABONO,
        metodo: a.metodo_pago,
        monto: redondear(Number(a.monto)),
        fecha: a.fecha,
        hora,
        orden: `${a.fecha} ${hora || '00:00'}`,
        estado: p.estado,
        totalPedido: p.calc_total,
        saldoTras,
        numero: i + 1,
        url_comprobante: a.url_comprobante || '',
      });
    });
  });
  return out.sort((a, b) => b.orden.localeCompare(a.orden) || b.id - a.id);
}

/** Aplica los filtros activos. Las fechas son ISO (YYYY-MM-DD) y se comparan como texto. */
export function filtrarMovimientos(movs, { desde, hasta, tipo = '', metodo = '' }) {
  return movs.filter(
    (m) => (!desde || m.fecha >= desde) && (!hasta || m.fecha <= hasta) && (!tipo || m.tipo === tipo) && (!metodo || m.metodo === metodo)
  );
}

/** Resumen de los movimientos ya filtrados: cada fila se suma una sola vez. */
export function resumir(movs) {
  const abonos = movs.filter((m) => m.tipo === ABONO);
  const completos = movs.filter((m) => m.tipo === PAGO_COMPLETO);
  return {
    total: suma(movs, (m) => m.monto),
    abonos: suma(abonos, (m) => m.monto),
    completos: suma(completos, (m) => m.monto),
    transacciones: movs.length,
    nAbonos: abonos.length,
    nCompletos: completos.length,
  };
}

/**
 * Pendiente de cobro al cierre del periodo (indicador aparte, nunca parte de
 * los ingresos): total de cada pedido creado hasta `hasta` menos lo abonado
 * hasta esa fecha. Las cotizaciones aun no son ventas y no cuentan. Sin
 * `hasta` es el saldo actual.
 */
export function pendienteDeCobro(db, hasta) {
  const abonado = new Map();
  db.abonos.forEach((a) => {
    if (!hasta || a.fecha <= hasta) abonado.set(a.id_pedido, (abonado.get(a.id_pedido) || 0) + Number(a.monto || 0));
  });
  return suma(
    db.pedidos.filter((p) => p.estado !== COTIZACION && (!hasta || p.fecha_creacion <= hasta)),
    (p) => Math.max(0, redondear(p.calc_total - (abonado.get(p.id) || 0)))
  );
}

/* ---------------------------------------------------------------- periodos */

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmt = (s) => s.split('-').reverse().join('/');
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * Rango de fechas y etiqueta de un periodo alrededor de `ref` (ISO):
 * Dia, Semana (lunes a domingo), Mes y Año calendario, o Personalizado
 * (`desde`/`hasta`). Un rango personalizado incompleto queda abierto.
 */
export function rangoDe(periodo, ref, { desde = '', hasta = '' } = {}) {
  const d = new Date(`${ref}T00:00:00`);
  switch (periodo) {
    case 'Día':
      return { desde: ref, hasta: ref, etiqueta: `Día ${fmt(ref)}` };
    case 'Semana': {
      const ini = new Date(d);
      ini.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const fin = new Date(ini);
      fin.setDate(ini.getDate() + 6);
      return { desde: iso(ini), hasta: iso(fin), etiqueta: `Semana del ${fmt(iso(ini))} al ${fmt(iso(fin))}` };
    }
    case 'Año':
      return { desde: `${d.getFullYear()}-01-01`, hasta: `${d.getFullYear()}-12-31`, etiqueta: `Año ${d.getFullYear()}` };
    case 'Personalizado': {
      const etiqueta = desde && hasta ? `Del ${fmt(desde)} al ${fmt(hasta)}` : desde ? `Desde el ${fmt(desde)}` : hasta ? `Hasta el ${fmt(hasta)}` : 'Todas las fechas';
      return { desde, hasta, etiqueta };
    }
    case 'Mes':
    default:
      return {
        desde: iso(new Date(d.getFullYear(), d.getMonth(), 1)),
        hasta: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
        etiqueta: `${MESES[d.getMonth()][0].toUpperCase()}${MESES[d.getMonth()].slice(1)} de ${d.getFullYear()}`,
      };
  }
}
