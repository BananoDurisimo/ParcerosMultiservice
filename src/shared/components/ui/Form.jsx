import { useRef, useState } from 'react';
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
   Comprobante: URL externa o imagen subida desde el equipo.
   El archivo se guarda como data URL (no hay backend); cuando llegue
   la API, basta con subirlo y guardar la URL que devuelva.
   -------------------------------------------------------------- */
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGEN_MB = 5;

export const esImagenAdjunta = (v) => typeof v === 'string' && v.startsWith('data:image/');

/** Abre en otra pestaña una URL o una imagen adjunta (los navegadores
    bloquean abrir data URLs directamente, por eso se convierte a blob). */
export async function abrirComprobante(v) {
  if (!esImagenAdjunta(v)) { window.open(v, '_blank', 'noopener'); return; }
  const blob = await (await fetch(v)).blob();
  window.open(URL.createObjectURL(blob), '_blank', 'noopener');
}

/** Valida tipo, tamaño y contenido real (que el navegador pueda decodificarla). */
function leerImagen(file) {
  return new Promise((resolve, reject) => {
    if (!TIPOS_IMAGEN.includes(file.type)) {
      reject(new Error('El archivo debe ser una imagen JPG, PNG, WEBP o GIF.'));
      return;
    }
    if (file.size > MAX_IMAGEN_MB * 1024 * 1024) {
      reject(new Error(`La imagen no puede superar ${MAX_IMAGEN_MB} MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(reader.result);
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function ComprobanteField({ f, value, error, onChange, id, label }) {
  const inputFile = useRef(null);
  const [errArchivo, setErrArchivo] = useState('');
  const [nombre, setNombre] = useState('');
  const adjunta = esImagenAdjunta(value);
  const msg = errArchivo || error;

  const subir = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      onChange(await leerImagen(file));
      setNombre(file.name);
      setErrArchivo('');
    } catch (err) {
      setErrArchivo(err.message);
    }
  };

  const quitar = () => { onChange(''); setNombre(''); setErrArchivo(''); };

  return (
    <div className={`field ${f.full ? 'full' : ''}`}>
      {label}
      <div className="file-row">
        <input
          id={id}
          className={`input ${msg ? 'has-error' : ''}`}
          type="text"
          value={adjunta ? (nombre || 'Imagen adjunta') : (value ?? '')}
          readOnly={adjunta}
          placeholder={f.placeholder}
          onChange={(e) => { setErrArchivo(''); onChange(e.target.value); }}
        />
        <input ref={inputFile} type="file" accept={TIPOS_IMAGEN.join(',')} hidden onChange={subir} />
        {adjunta ? (
          <button type="button" className="btn" onClick={quitar}><Icon name="x" size={15} /> Quitar</button>
        ) : (
          <button type="button" className="btn" onClick={() => inputFile.current?.click()}><Icon name="download" size={15} /> Subir imagen</button>
        )}
      </div>
      {adjunta && <img className="file-preview" src={value} alt="Vista previa del comprobante" />}
      {f.hint && !msg && <span className="caption">{f.hint}</span>}
      {msg && <span className="field-error"><Icon name="alert" size={12} /> {msg}</span>}
    </div>
  );
}

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
    if (f.type === 'file' && !/^(https?:\/\/|blob:|data:)/i.test(v)) errs[f.name] = 'Adjunte un archivo o ingrese un enlace válido (http:// o https://).';
    if (f.type === 'comprobante' && !esImagenAdjunta(v) && !/^https?:\/\/\S+$/i.test(v)) errs[f.name] = 'Ingrese una URL válida o suba una imagen.';
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

  if (f.type === 'file') return <FileField f={f} value={value} error={error} onChange={onChange} readOnly={readOnly} />;

  if (f.type === 'multiselect') {
    return <MultiSelectField f={f} value={value} error={error} onChange={onChange} readOnly={readOnly} />;
  }

  if (f.type === 'comprobante') {
    return <ComprobanteField f={f} value={value} error={error} onChange={onChange} id={id} label={label} />;
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
        {f.hint && <span className="caption">{f.hint}</span>}
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
   Seleccion multiple (tabla puente: rolxpermiso)

   Con `buscable` se antepone un buscador que filtra las opciones por
   nombre, para listas largas como la de permisos. Lo marcado no se pierde
   al filtrar: el contador siempre indica cuantas opciones estan elegidas.
   -------------------------------------------------------------- */
function MultiSelectField({ f, value, error, onChange, readOnly }) {
  const opts = normOpciones(f.options);
  const sel = value || [];
  const [q, setQ] = useState('');

  const buscar = !readOnly && f.buscable;
  const texto = buscar ? q.trim().toLowerCase() : '';
  const visibles = texto
    ? opts.filter((o) => String(o.label).toLowerCase().includes(texto))
    : opts;

  const marcado = (o) => sel.some((x) => String(x) === String(o.value));
  const alternar = (o) =>
    onChange(marcado(o) ? sel.filter((x) => String(x) !== String(o.value)) : [...sel, o.value]);

  return (
    <div className={`field ${f.full ? 'full' : ''}`}>
      <label>{f.label} {f.required && !readOnly && <span className="req">*</span>}</label>

      {buscar && (
        <div className="search-wrap ms-search">
          <span className="ico"><Icon name="search" size={15} /></span>
          <input
            className="input"
            type="text"
            value={q}
            placeholder={f.buscarPlaceholder || 'Buscar…'}
            aria-label={`Buscar en ${f.label}`}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button type="button" className="icon-btn ms-limpiar" onClick={() => setQ('')} aria-label="Limpiar la búsqueda">
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      )}

      <div className="row" style={{ flexWrap: 'wrap', gap: 7, padding: '4px 0' }}>
        {visibles.map((o) => (
          <button
            type="button"
            key={o.value}
            className={`chip ${marcado(o) ? 'is-on' : ''}`}
            disabled={readOnly}
            onClick={() => alternar(o)}
          >
            {marcado(o) && <Icon name="check" size={12} />} {o.label}
          </button>
        ))}
        {visibles.length === 0 && (
          <span className="caption">No hay coincidencias para «{q.trim()}».</span>
        )}
      </div>

      {error && <span className="field-error"><Icon name="alert" size={12} /> {error}</span>}
      {!error && (buscar || f.hint) && (
        <span className="caption">
          {buscar && `${sel.length} de ${opts.length} seleccionado(s)`}
          {buscar && f.hint && ' · '}
          {f.hint}
        </span>
      )}
    </div>
  );
}

/* --------------------------------------------------------------
   Campo de archivo adjunto (comprobantes, soportes de pago)

   Se admite un enlace externo o un archivo del propio equipo. Como el
   prototipo no tiene servidor de almacenamiento, el archivo elegido se
   referencia con un object URL del navegador, que sirve para abrirlo desde
   el listado y el detalle durante la sesion.
   -------------------------------------------------------------- */
const MAX_ARCHIVO_MB = 5;

function FileField({ f, value, error, onChange, readOnly }) {
  const id = 'f-' + f.name;
  const selector = useRef(null);
  const [nombre, setNombre] = useState('');
  const [aviso, setAviso] = useState('');

  const esLocal = typeof value === 'string' && value.startsWith('blob:');

  const elegir = (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (archivo.size > MAX_ARCHIVO_MB * 1024 * 1024) {
      setAviso(`El archivo supera el máximo permitido de ${MAX_ARCHIVO_MB} MB.`);
      return;
    }
    setAviso('');
    setNombre(archivo.name);
    onChange(URL.createObjectURL(archivo));
  };

  const quitar = () => { setNombre(''); setAviso(''); onChange(''); };

  return (
    <div className={`field ${f.full ? 'full' : ''}`}>
      <label htmlFor={id}>
        {f.label} {f.required && !readOnly && <span className="req">*</span>}
      </label>

      <div className="file-field">
        <input
          id={id}
          className={`input ${error ? 'has-error' : ''}`}
          type="text"
          value={esLocal ? (nombre || 'Archivo adjunto') : (value ?? '')}
          readOnly={readOnly || esLocal}
          placeholder={f.placeholder || 'https://…'}
          onChange={(e) => onChange(e.target.value)}
        />
        {!readOnly && (esLocal ? (
          <button type="button" className="btn btn-sm" onClick={quitar}>
            <Icon name="x" size={15} /> Quitar
          </button>
        ) : (
          <button type="button" className="btn btn-sm" onClick={() => selector.current?.click()}>
            <Icon name="upload" size={15} /> Subir archivo
          </button>
        ))}
        <input
          ref={selector}
          type="file"
          accept={f.accept || 'image/*,application/pdf'}
          hidden
          onChange={elegir}
        />
      </div>

      {aviso && <span className="field-error"><Icon name="alert" size={12} /> {aviso}</span>}
      {error && !aviso && <span className="field-error"><Icon name="alert" size={12} /> {error}</span>}
      {!aviso && !error && esLocal && (
        <span className="caption">
          Archivo tomado de este equipo. <a href={value} target="_blank" rel="noreferrer">Abrir</a>
        </span>
      )}
      {!aviso && !error && !esLocal && f.hint && <span className="caption">{f.hint}</span>}
    </div>
  );
}

/* --------------------------------------------------------------
   Editor de lineas: detalle_compra_insumo, detalle_compra_producto,
   detalle_pedido y detalle_pedido_insumo. `itemKey` es la llave foranea
   de cada linea.

   Opcionales del campo:
   - precioSugerido(id): precio con que se llena la linea al elegir el item
     (sigue siendo editable).
   - decimales: admite cantidades fraccionarias (1.5 litros, 0.75 metros).
   - totalLabel: texto del pie ("Total", "Subtotal de insumos"…).
   -------------------------------------------------------------- */
export function ItemsEditor({ f, value = [], onChange, error, readOnly }) {
  const opts = normOpciones(f.options);
  const vacio = { [f.itemKey]: '', cantidad: '', precio_unitario: '' };
  const [draft, setDraft] = useState(vacio);
  const [errLinea, setErrLinea] = useState('');
  const msg = errLinea || error;

  const etiqueta = (v) => opts.find((o) => String(o.value) === String(v))?.label ?? v;
  const total = value.reduce((s, it) => s + Number(it.cantidad) * Number(it.precio_unitario), 0);

  const elegir = (texto) => {
    const id = valorDe(opts, texto);
    const sugerido = id !== '' && f.precioSugerido ? f.precioSugerido(id) : undefined;
    setDraft({
      ...draft,
      [f.itemKey]: id,
      precio_unitario: sugerido !== undefined && sugerido !== null ? String(sugerido) : draft.precio_unitario,
    });
  };

  const add = () => {
    const cantidad = Number(draft.cantidad);
    const precio = Number(draft.precio_unitario);
    if (draft[f.itemKey] === '' || draft.cantidad === '' || draft.precio_unitario === '') {
      setErrLinea(`Seleccione ${f.itemLabel.toLowerCase()} e ingrese la cantidad y el precio.`);
      return;
    }
    if (!(cantidad > 0)) { setErrLinea('La cantidad debe ser mayor que cero.'); return; }
    if (!(precio >= 0)) { setErrLinea('El precio unitario no puede ser negativo.'); return; }
    onChange([...value, { [f.itemKey]: draft[f.itemKey], cantidad, precio_unitario: precio }]);
    setDraft(vacio);
    setErrLinea('');
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
            <select className="select" value={draft[f.itemKey]} onChange={(e) => elegir(e.target.value)} aria-label={f.itemLabel}>
              <option value="">Seleccione…</option>
              {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input className="input" type="number" min={f.decimales ? '0' : '1'} step={f.decimales ? 'any' : '1'} placeholder="Cant." aria-label="Cantidad" value={draft.cantidad} onChange={(e) => setDraft({ ...draft, cantidad: e.target.value })} />
            <input className="input" type="number" min="0" step="0.01" placeholder="Precio" aria-label="Precio unitario" value={draft.precio_unitario} onChange={(e) => setDraft({ ...draft, precio_unitario: e.target.value })} />
            <button type="button" className="icon-btn" style={{ color: 'var(--success)' }} onClick={add} aria-label="Agregar línea">
              <Icon name="plus" size={17} />
            </button>
          </div>
        )}
        <div className="items-foot">
          <span className="caption">{value.length} línea(s)</span>
          <span className="money" style={{ fontSize: 15 }}>{f.totalLabel || 'Total'}: {money(total)}</span>
        </div>
      </div>
      {f.hint && !msg && <span className="caption">{f.hint}</span>}
      {msg && <span className="field-error"><Icon name="alert" size={12} /> {msg}</span>}
    </div>
  );
}

/** Vista de solo lectura de un detalle, para el modal "ver". */
export function ItemsView({ lineas = [], opciones = [], itemKey, itemLabel = 'Ítem', totalLabel = 'Subtotal', vacio = 'Sin líneas registradas.' }) {
  const opts = normOpciones(opciones);
  const etiqueta = (v) => opts.find((o) => String(o.value) === String(v))?.label ?? v;
  const total = lineas.reduce((s, it) => s + Number(it.cantidad) * Number(it.precio_unitario), 0);

  return (
    <div className="items-box">
      <div className="items-row head">
        <span>{itemLabel}</span><span>Cantidad</span><span>Precio unit.</span><span style={{ width: 34 }} />
      </div>
      {lineas.length === 0 && <div style={{ padding: '14px 12px' }} className="caption">{vacio}</div>}
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
        <span className="money" style={{ fontSize: 15 }}>{totalLabel}: {money(total)}</span>
      </div>
    </div>
  );
}
