import Icon from '@shared/components/Icon.jsx';
import { money } from '@shared/data/mock.js';

/**
 * Monto de un abono: no se digita, se elige entre los valores permitidos.
 * El primer abono es el 50% del total o el 100%; el segundo, el saldo
 * restante. `opciones` es [{ value, titulo, monto }].
 */
export default function MontoAbono({ label = 'Monto del abono', opciones = [], value, onChange, error, disabled, vacio, required = true }) {
  return (
    <div className="field">
      <label>{label} {required && !disabled && <span className="req">*</span>}</label>
      {opciones.length === 0 ? (
        <span className="caption">{vacio}</span>
      ) : (
        <div className={`monto-opciones ${error ? 'has-error' : ''}`} role="radiogroup" aria-label={label}>
          {opciones.map((o) => {
            const on = value !== '' && value !== undefined && String(o.value) === String(value);
            return (
              <button
                type="button"
                role="radio"
                aria-checked={on}
                key={o.value}
                className={`monto-op ${on ? 'is-on' : ''}`}
                disabled={disabled}
                onClick={() => onChange(o.value)}
              >
                <span className="pct">{on && <Icon name="check" size={12} />} {o.titulo}</span>
                <strong className="money">{money(o.monto)}</strong>
              </button>
            );
          })}
        </div>
      )}
      {error && <span className="field-error"><Icon name="alert" size={12} /> {error}</span>}
    </div>
  );
}
