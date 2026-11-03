import { CAMPOS_NO_AUDITADOS, ETIQUETA_CAMPO } from '@core/constants/movimientos.js';

const textoValor = (v) => {
  if (v === undefined || v === null || v === '') return '—';
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === 'object' ? JSON.stringify(x) : x)).join(', ');
  if (typeof v === 'string' && v.startsWith('data:')) return 'Archivo adjunto';
  return String(v);
};

/**
 * Compara valor_anterior contra valor_nuevo y devuelve solo las columnas que
 * cambiaron: [{ campo, etiqueta, antes, despues }].
 */
export const camposCambiados = (anterior, nuevo) => {
  const claves = [...new Set([...Object.keys(anterior || {}), ...Object.keys(nuevo || {})])].filter(
    (k) => !CAMPOS_NO_AUDITADOS.includes(k)
  );
  const igual = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');
  return claves
    .filter((campo) => !igual(anterior?.[campo], nuevo?.[campo]))
    .map((campo) => {
      const antes = textoValor(anterior?.[campo]);
      const despues = textoValor(nuevo?.[campo]);
      return {
        campo,
        etiqueta: ETIQUETA_CAMPO[campo] || campo,
        antes,
        /* Un adjunto reemplazado por otro se lee igual ("Archivo adjunto"). */
        despues: antes === despues ? 'Archivo reemplazado' : despues,
      };
    });
};
