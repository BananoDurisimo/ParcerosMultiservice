/**
 * Formato de valores para mostrar: dinero, fechas, horas y codigos de
 * documento (la base de datos solo guarda el id).
 */

export const money = (n) =>
  'C$ ' + Number(n || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const shortMoney = (n) => {
  const v = Number(n || 0);
  if (v >= 1000000) return 'C$ ' + (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return 'C$ ' + (v / 1000).toFixed(1) + 'K';
  return 'C$ ' + v.toFixed(0);
};

export const fecha = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** "2026-08" -> "Agosto 2026". */
export const mes = (periodo) => {
  if (!periodo) return '—';
  const [y, m] = periodo.split('-');
  return `${MESES_LARGOS[Number(m) - 1] || '—'} ${y}`;
};

/** Fecha local en formato ISO (yyyy-mm-dd), sin el corrimiento a UTC de toISOString(). */
export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "Hoy" del sistema: con los datos reales de la API es la fecha del equipo. */
export const hoyISO = () => toISO(new Date());

/** Fecha y hora de un timestamp ISO ("2026-08-30T14:22:10") -> "30/08/2026, 02:22 p.m." */
export const fechaHora = (iso) => {
  if (!iso) return '—';
  const [dia, h24 = ''] = iso.split('T');
  if (!h24) return fecha(dia);
  const [h, m] = h24.split(':');
  const hh = Number(h);
  const sufijo = hh < 12 ? 'a.m.' : 'p.m.';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${fecha(dia)}, ${String(h12).padStart(2, '0')}:${m} ${sufijo}`;
};

/** Solo la hora de un timestamp ISO. */
export const hora = (iso) => (iso && iso.includes('T') ? iso.split('T')[1].slice(0, 5) : '—');

/** Codigos con que se muestran los documentos (la tabla solo guarda el id). */
export const codigoCompra = (id) => `CMP-${String(id).padStart(4, '0')}`;
export const codigoPedido = (id) => `PED-${String(id).padStart(4, '0')}`;
export const codigoAbono = (id) => `AB-${String(id).padStart(4, '0')}`;

/** Etiqueta legible de una fila, sea cual sea la tabla. */
export const etiquetaFila = (r) =>
  r?.nombre || r?.nombre_empleado || r?.correo_empresarial || r?.correo || (r?.id ? `#${r.id}` : '—');
