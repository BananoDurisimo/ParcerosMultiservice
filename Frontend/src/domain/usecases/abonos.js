import { money } from '@core/utils/formato.js';

/* Reglas del abono. */

/** Error del monto escrito, o null. */
export function errorMonto(valor, minimo, maximo, { primero = false } = {}) {
  if (valor === '' || valor === undefined || valor === null) return 'Este campo no puede estar vacío.';
  const n = Number(valor);
  if (Number.isNaN(n) || n <= 0) return 'Ingrese un monto mayor que cero.';
  if (Math.round(n * 100) !== Math.round(n * 1000) / 10) return 'Use como máximo dos decimales.';
  if (minimo > 0 && n < minimo - 0.005) {
    return primero ? `El primer abono debe ser de al menos el 50% del total (${money(minimo)}).` : `El monto mínimo es ${money(minimo)}.`;
  }
  if (n > maximo + 0.005) return `El abono no puede pasar el saldo pendiente (${money(maximo)}).`;
  return null;
}
