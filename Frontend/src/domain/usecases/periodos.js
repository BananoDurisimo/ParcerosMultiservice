import { toISO } from '@core/utils/formato.js';

/* Periodos del dashboard: tramos del grafico, rangos de fechas y variacion
   de cada KPI contra el periodo anterior. */

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Tramos del grafico de area para un periodo: dias de la semana, semanas del
 * mes o meses del año. Los pedidos no guardan hora, por eso "Hoy" muestra los
 * siete dias que terminan hoy.
 */
export function tramosPeriodo(periodo, refISO) {
  const hoy = new Date(refISO + 'T00:00:00');
  const y = hoy.getFullYear(), m = hoy.getMonth();
  switch (periodo) {
    case 'Hoy':
    case 'Semana':
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(y, m, hoy.getDate() - 6 + i);
        return { l: `${DIAS[d.getDay()]} ${d.getDate()}`, desde: toISO(d), hasta: toISO(d) };
      });
    case 'Año':
      return Array.from({ length: m + 1 }, (_, i) => ({
        l: MESES[i], desde: toISO(new Date(y, i, 1)), hasta: toISO(new Date(y, i + 1, 0)),
      }));
    case 'Mes':
    default: {
      const out = [];
      for (let ini = 1, n = 1; ini <= hoy.getDate(); ini += 7, n++) {
        const fin = Math.min(ini + 6, hoy.getDate());
        out.push({ l: `S${n}`, desde: toISO(new Date(y, m, ini)), hasta: toISO(new Date(y, m, fin)) });
      }
      return out;
    }
  }
}

/**
 * Rango [desde, hasta] de un período, tomando "ref" como el "hoy" virtual.
 * `atras = 1` devuelve el período inmediatamente anterior, que es contra el que
 * se compara cada KPI para calcular su porcentaje de variación.
 */
export function rangoPeriodo(periodo, refISO, atras = 0) {
  const base = new Date(refISO + 'T00:00:00');
  const fin = new Date(base);
  let inicio;

  switch (periodo) {
    case 'Hoy':
      fin.setDate(fin.getDate() - atras);
      inicio = new Date(fin);
      break;
    case 'Semana':
      fin.setDate(fin.getDate() - atras * 7);
      inicio = new Date(fin);
      inicio.setDate(inicio.getDate() - 6);
      break;
    case 'Año':
      fin.setFullYear(fin.getFullYear() - atras);
      inicio = new Date(fin.getFullYear(), 0, 1);
      break;
    case 'Mes':
    default:
      fin.setMonth(fin.getMonth() - atras);
      inicio = new Date(fin.getFullYear(), fin.getMonth(), 1);
      break;
  }
  return { desde: toISO(inicio), hasta: toISO(fin) };
}

/** Variación porcentual de un período contra el anterior (redondeada). */
export const variacion = (actual, previo) => {
  if (!previo) return actual ? 100 : 0;
  return Math.round(((actual - previo) / previo) * 100);
};
