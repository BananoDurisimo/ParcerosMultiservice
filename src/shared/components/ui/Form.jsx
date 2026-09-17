import { useState } from 'react';
import Icon from '@shared/components/Icon.jsx';
import { money } from '@shared/data/mock.js';

/**
 * Las opciones de un select, multiselect o editor de líneas se declaran como
 * texto plano (columnas varchar: estado, método de pago…) o como
 * `{ value, label }` cuando el campo es una llave foránea: `value` es el id
 * que se guarda y `label` el nombre que ve el usuario.
 */
export const normOpciones = (options = []) =>
  options.map((o) => (o && typeof o === 'object' ? o : { value: o, label: o }));

/** Devuelve el valor original de la opción elegida (conserva el tipo numérico de los ids). */
const valorDe = (opts, texto) => {
  const o = opts.find((x) => String(x.value) === String(texto));
  return o ? o.value : '';
};

/* --------------------------------------------------------------
   Validaciones (punto 7: notificacion de validacion de campos)
   -------------------------------------------------------------- */
export function validar(fields, values) {
  const errs = {};
  fields.forEach((f) => {
    if (f.type === 'items') {
      if (f.required && (!values[f.name] || values[f.name].length === 0)) errs[f.name] = 'Agregue al menos una línea.';
      return;
    }
    const v = values[f.name];
    const vacio = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    if (f.required && vacio) { errs[f.name] = 'Este campo no puede estar vacío.'; return; }
    if (vacio) return;
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) errs[f.name] = 'Ingrese un correo electrónico válido.';
    if (f.type === 'tel' && !/^[\d\s()+-]{7,}$/.test(v)) errs[f.name] = 'Ingrese un teléfono válido (mínimo 7 dígitos).';
    if (f.type === 'url' && !/^https?:\/\/\S+$/i.test(v)) errs[f.name] = 'Ingrese una URL válida (debe iniciar con http:// o https://).';
    if ((f.type === 'number' || f.type === 'money') && (isNaN(Number(v)) || Number(v) < 0)) errs[f.name] = 'Ingrese un valor numérico válido.';
    if (f.min !== undefined && Number(v) < f.min) errs[f.name] = `El valor mínimo permitido es ${f.min}.`;
    if (f.type === 'text' && f.noSpecial && /[<>{}[\]$%^*]/.test(v)) errs[f.name] = 'Este campo no puede contener caracteres especiales.';
    if (f.maxLength && String(v).length > f.maxLength) errs[f.name] = `Máximo ${f.maxLength} caracteres.`;
  });
  return errs;
}

/* --------------------------------------------------------------
   Campo individual
   -------------------------------------------------------------- */
export function Field({ f, value, error, onChange, readOnly }) {
  const id = 'f-' + f.name;
  const cls = `${error ? 'has-error' : ''}`;

  const label = (
    <label htmlFor={id}>
      {f.label} {f.required && !readOnly && <span className="req">*</span>}
    </label>
  );

  if (f.type === 'multiselect') {
    const opts = normOpciones(f.options);
    const sel = value || [];
    return (
      <div className={`field ${f.full ? 'full' : ''}`}>
        {label}
        <div className="row" style={{ flexWrap: 'wrap', gap: 7, padding: '4px 0' }}>
          {opts.map((o) => {
            const on = sel.some((x) => String(x) === String(o.value));
            return (
              <button
                type="button"
                key={o.value}
                className={`chip ${on ? 'is-on' : ''}`}
                disabled={readOnly}
                onClick={() => onChange(on ? sel.filter((x) => String(x) !== String(o.value)) : [...sel, o.value])}
              >
                {on && <Icon name="check" size={12} />} {o.label}
              </button>
            );
          })}
        </div>
        {f.hint && !error && <span className="caption">{f.hint}</span>}
        {error && <span className="field-error"><Icon name="alert" size={12} /> {error}</span>}
      </div>
    );
  }

  if (f.type === 'switch') {
    return (
      <div className={`field ${f.full ? 'full' : ''}`}>
        {label}
        <label className="switch">
          <input type="checkbox" checked={value === 'Activo'} disabled={readOnly} onChange={(e) => onChange(e.target.checked ? 'Activo' : 'Inactivo')} />
          <span className="track"><span className="thumb" /></span>
          <span style={{ fontSize: 13 }}>{value === 'Activo' ? 'Activo' : 'Inactivo'}</span>
        </label>
      </div>
    );
  }

  if (f.type === 'select') {
    const opts = normOpciones(f.options);
    return (
      <div className={`field ${f.full ? 'full' : ''}`}>
        {label}
        <select
          id={id}
          className={`select ${cls}`}
          value={value ?? ''}
          disabled={readOnly}
          onChange={(e) => onChange(valorDe(opts, e.target.value))}
        >
          <option value="">Seleccione…</option>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {f.hint && !error && <span className="caption">{f.hint}</span>}
        {error && <span className="field-error"><Icon name="alert" size={12} /> {error}</span>}
      </div>
    );
  }

  if (f.type === 'textarea') {
    return (
      <div className={`field ${f.full ? 'full' : ''}`}>
        {label}
        <textarea id={id} className={`textarea ${cls}`} value={value ?? ''} readOnly={readOnly} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
        {f.hint && !error && <span className="caption">{f.hint}</span>}
        {error && <span className="field-error"><Icon name="alert" size={12} /> {error}</span>}
      </div>
    );
  }

  return (
    <div className={`field ${f.full ? 'full' : ''}`}>
      {label}
      <input
        id={id}
        className={`input ${cls}`}
        type={f.type === 'money' || f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'password' ? 'password' : 'text'}
        inputMode={f.type === 'tel' ? 'tel' : undefined}
        step={f.type === 'money' ? '0.01' : f.step}
        value={value ?? ''}
        readOnly={readOnly}
        placeholder={f.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {f.hint && !error && <span className="caption">{f.hint}</span>}
      {error && <span className="field-error"><Icon name="alert" size={12} /> {error}</span>}
    </div>
  );
}

/* --------------------------------------------------------------
   Editor de lineas: detalle_compra_insumo, detalle_compra_producto
   y detalle_pedido. `itemKey` es la llave foranea de cada linea.
   -------------------------------------------------------------- */
export function ItemsEditor({ f, value = [], onChange, error, readOnly }) {
  const opts = normOpciones(f.options);
  const vacio = { [f.itemKey]: '', cantidad: '', precio_unitario: '' };
  const [draft, setDraft] = useState(vacio);

  const etiqueta = (v) => opts.find((o) => String(o.value) === String(v))?.label ?? v;
  const total = value.reduce((s, it) => s + Number(it.cantidad) * Number(it.precio_unitario), 0);

  const add = () => {
    if (draft[f.itemKey] === '' || !draft.cantidad || !draft.precio_unitario) return;
    onChange([...value, {
      [f.itemKey]: draft[f.itemKey],
      cantidad: Number(draft.cantidad),
      precio_unitario: Number(draft.precio_unitario),
    }]);
    setDraft(vacio);
  };

  return (
    <div className="field full">
      <label>{f.label} {f.required && !readOnly && <span className="req">*</span>}</label>
      <div className="items-box">
        <div className="items-row head">
          <span>{f.itemLabel}</span><span>Cantidad</span><span>Precio unit.</span><span style={{ width: 34 }} />
        </div>
        {value.length === 0 && <div style={{ padding: '14px 12px' }} className="caption">Sin líneas registradas.</div>}
        {value.map((it, i) => (
          <div className="items-row" key={i}>
            <span style={{ fontSize: 13 }}>{etiqueta(it[f.itemKey])}</span>
            <span style={{ fontSize: 13 }}>{it.cantidad}</span>
            <span className="money" style={{ fontSize: 13 }}>{money(it.precio_unitario)}</span>
            {!readOnly ? (
              <button type="button" className="icon-btn is-delete" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Quitar línea">
                <Icon name="trash" size={15} />
              </button>
            ) : <span style={{ width: 34 }} />}
          </div>
        ))}
        {!readOnly && (
          <div className="items-row">
            <select className="select" value={draft[f.itemKey]} onChange={(e) => setDraft({ ...draft, [f.itemKey]: valorDe(opts, e.target.value) })}>
              <option value="">Seleccione…</option>
              {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input className="input" type="number" min="1" placeholder="Cant." value={draft.cantidad} onChange={(e) => setDraft({ ...draft, cantidad: e.target.value })} />
            <input className="input" type="number" min="0" step="0.01" placeholder="Precio" value={draft.precio_unitario} onChange={(e) => setDraft({ ...draft, precio_unitario: e.target.value })} />
            <button type="button" className="icon-btn" style={{ color: 'var(--success)' }} onClick={add} aria-label="Agregar línea">
              <Icon name="plus" size={17} />
            </button>
          </div>
        )}
        <div className="items-foot">
          <span className="caption">{value.length} línea(s)</span>
          <span className="money" style={{ fontSize: 15 }}>Total: {money(total)}</span>
        </div>
      </div>
      {f.hint && !error && <span className="caption">{f.hint}</span>}
      {error && <span className="field-error"><Icon name="alert" size={12} /> {error}</span>}
    </div>
  );
}

/** Vista de solo lectura de un detalle, para el modal "ver". */
export function ItemsView({ lineas = [], opciones = [], itemKey, itemLabel = 'Ítem' }) {
  const opts = normOpciones(opciones);
  const etiqueta = (v) => opts.find((o) => String(o.value) === String(v))?.label ?? v;
  const total = lineas.reduce((s, it) => s + Number(it.cantidad) * Number(it.precio_unitario), 0);

  return (
    <div className="items-box">
      <div className="items-row head">
        <span>{itemLabel}</span><span>Cantidad</span><span>Precio unit.</span><span style={{ width: 34 }} />
      </div>
      {lineas.length === 0 && <div style={{ padding: '14px 12px' }} className="caption">Sin líneas registradas.</div>}
      {lineas.map((it, i) => (
        <div className="items-row" key={i}>
          <span style={{ fontSize: 13 }}>{etiqueta(it[itemKey])}</span>
          <span style={{ fontSize: 13 }}>{it.cantidad}</span>
          <span className="money" style={{ fontSize: 13 }}>{money(it.precio_unitario)}</span>
          <span style={{ width: 34 }} />
        </div>
      ))}
      <div className="items-foot">
        <span className="caption">{lineas.length} línea(s)</span>
        <span className="money" style={{ fontSize: 15 }}>Subtotal: {money(total)}</span>
      </div>
    </div>
  );
}
