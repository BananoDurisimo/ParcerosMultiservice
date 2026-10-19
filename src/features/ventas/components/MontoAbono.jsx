import Icon from '@shared/components/Icon.jsx';
import { money } from '@shared/data/mock.js';

/**
 * Monto de un abono: se escribe libre, dentro de los limites del pedido.
 * El primer abono debe ser de al menos el 50% del total; ninguno puede pasar
 * el saldo. Debajo se muestran el minimo y el maximo para no adivinar, y
 * `atajos` ([{ titulo, monto }]) llenan el campo con un clic (50%, saldo).
 */
export default function MontoAbono({
  label = 'Monto del abono', value, onChange, error, disabled, vacio, required = true,
  minimo, maximo, atajos = [], nota,
}) {
  const sinPedido = maximo === undefined || maximo === null;
  const n = Number(value);
  const escrito = value !== '' && value !== undefined && value !== null;

  return (
    <div className="field">
      <label htmlFor="f-monto-abono">{label} {required && !disabled && <span className="req">*</span>}</label>
      {sinPedido && !disabled ? (
        <span className="caption">{vacio}</span>
      ) : (
        <>
          <div className="input-unidad monto-libre">
            <span className="unidad prefijo">C$</span>
            <input
              id="f-monto-abono"
              className={`input ${error ? 'has-error' : ''}`}
              type="number" min="0" step="0.01" inputMode="decimal"
              value={value ?? ''} disabled={disabled} placeholder="0.00"
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
          {!disabled && atajos.length > 0 && (
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {atajos.map((a) => (
                <button
                  type="button" key={a.titulo}
                  className={`btn btn-sm ${escrito && Math.abs(n - a.monto) < 0.005 ? 'btn-info' : ''}`}
                  onClick={() => onChange(String(a.monto))}
                >
                  {a.titulo}: {money(a.monto)}
                </button>
              ))}
            </div>
          )}
          {!disabled && !error && (
            <span className="caption">
              {minimo > 0 ? `Mínimo ${money(minimo)}` : 'Cualquier monto'} · máximo {money(maximo)}{nota ? ` · ${nota}` : ''}
            </span>
          )}
        </>
      )}
      {error && <span className="field-error"><Icon name="alert" size={12} /> {error}</span>}
    </div>
  );
}

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
