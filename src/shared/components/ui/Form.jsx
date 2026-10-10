import { useEffect, useRef, useState } from 'react';
import Icon from '@shared/components/Icon.jsx';
import { money, fecha, hoyISO } from '@shared/data/mock.js';
import { leerArchivo, esImagen, esPdf } from '@shared/data/archivos.js';

/**
 * Las opciones de un select, multiselect o editor de líneas se declaran como
 * texto plano (columnas varchar: estado, método de pago…) o como
 * `{ value, label }` cuando el campo es una llave foránea: `value` es el id
 * que se guarda y `label` el nombre que ve el usuario.
 */
export const normOpciones = (options = []) =>
  options.map((o) => (o && typeof o === 'object' ? o : { value: o, label: o }));

/**
 * Opción de un desplegable de llave foránea.
 *
 * Las filas dadas de baja -un insumo inactivo, un producto retirado, un pedido
 * anulado- se siguen listando para que los registros que ya las usan muestren
 * su nombre, pero no se pueden elegir: aparecen en gris y con el motivo. La
 * única excepción es el valor que el registro ya tiene guardado, que se deja
 * intacto para no vaciarle el campo al editar.
 */
function Opcion({ o, actual }) {
  const bloqueada = !!o.baja && String(o.value) !== String(actual ?? '');
  return (
    <option value={o.value} disabled={bloqueada}>
      {o.label}{o.baja ? ` · ${String(o.baja).toLowerCase()}` : ''}
    </option>
  );
}

/** Devuelve el valor original de la opción elegida (conserva el tipo numérico de los ids). */
const valorDe = (opts, texto) => {
  const o = opts.find((x) => String(x.value) === String(texto));
  return o ? o.value : '';
};

/* --------------------------------------------------------------
   Archivo adjunto: imagen del diseño o comprobante de pago.
   El archivo se guarda como data URL (no hay backend); cuando llegue
   la API, basta con subirlo y guardar la URL que devuelva.
   -------------------------------------------------------------- */
function ArchivoField({ f, value, error, onChange, readOnly, label }) {
  const inputFile = useRef(null);
  const [errArchivo, setErrArchivo] = useState('');
  const [nombre, setNombre] = useState('');
  const msg = errArchivo || error;

  const subir = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      onChange(await leerArchivo(file, f.tipos));
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
          className={`input ${msg ? 'has-error' : ''}`}
          type="text"
          readOnly
          value={value ? (nombre || (esPdf(value) ? 'Documento PDF adjunto' : 'Imagen adjunta')) : ''}
          placeholder="Ningún archivo seleccionado"
        />
        <input ref={inputFile} type="file" accept={f.tipos.join(',')} hidden onChange={subir} />
        {!readOnly && (value ? (
          <button type="button" className="btn" onClick={quitar}><Icon name="x" size={15} /> Quitar</button>
        ) : (
          <button type="button" className="btn" onClick={() => inputFile.current?.click()}><Icon name="upload" size={15} /> Subir archivo</button>
        ))}
      </div>
      {esImagen(value) && <img className="file-preview" src={value} alt={f.label} />}
      {f.hint && !msg && <span className="caption">{f.hint}</span>}
      {msg && <span className="field-error"><Icon name="alert" size={12} /> {msg}</span>}
    </div>
  );
}

/* --------------------------------------------------------------
   Desplegable con buscador

   Reemplaza al <select> nativo en todas las listas de los formularios
   (cliente, proveedor, insumo, rol, pedido, estado…): al abrirlo se escribe para filtrar por nombre, sin
   distinguir mayusculas ni tildes, y se elige con el mouse o con las flechas
   y Enter. Las filas dadas de baja se ven pero no se pueden elegir.
   -------------------------------------------------------------- */
export const normTexto = (x) => String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function SearchSelect({ id, options, value, onChange, disabled, error, placeholder = 'Seleccione…', buscarPlaceholder = 'Escriba para buscar…', ariaLabel }) {
  const opts = normOpciones(options);
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const [activo, setActivo] = useState(0);
  const caja = useRef(null);
  const lista = useRef(null);

  const elegida = opts.find((o) => String(o.value) === String(value ?? ''));
  const texto = normTexto(q.trim());
  const visibles = texto ? opts.filter((o) => normTexto(o.label).includes(texto)) : opts;
  const bloqueada = (o) => !!o.baja && String(o.value) !== String(value ?? '');

  const cerrar = () => { setAbierto(false); setQ(''); };
  const abrir = () => {
    if (disabled) return;
    setAbierto(true);
    setActivo(Math.max(0, opts.findIndex((o) => o === elegida)));
  };
  const elegir = (o) => {
    if (!o || bloqueada(o)) return;
    onChange(o.value);
    cerrar();
  };

  /* Un clic fuera del control lo cierra. */
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => { if (!caja.current?.contains(e.target)) cerrar(); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  /* La opcion resaltada siempre queda a la vista al moverse con las flechas. */
  useEffect(() => {
    if (abierto) lista.current?.children[activo]?.scrollIntoView?.({ block: 'nearest' });
  }, [activo, abierto]);

  const teclado = (e) => {
    if (e.key === 'Escape' && abierto) {
      /* Cierra solo el desplegable, no el modal que lo contiene. */
      e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopPropagation();
      cerrar();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!abierto) { abrir(); return; }
      const paso = e.key === 'ArrowDown' ? 1 : -1;
      setActivo((a) => Math.min(Math.max(0, a + paso), Math.max(0, visibles.length - 1)));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (abierto) elegir(visibles[activo]); else abrir();
    }
  };

  return (
    <div className={`ss ${abierto ? 'is-open' : ''}`} ref={caja} onKeyDown={teclado}>
      <button
        id={id}
        type="button"
        className={`select ss-trigger ${error ? 'has-error' : ''}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={ariaLabel}
        onClick={() => (abierto ? cerrar() : abrir())}
      >
        <span className={elegida ? 'ss-valor' : 'ss-valor ss-placeholder'}>
          {elegida ? `${elegida.label}${elegida.baja ? ` · ${String(elegida.baja).toLowerCase()}` : ''}` : placeholder}
        </span>
      </button>

      {abierto && (
        <div className="ss-panel">
          <div className="search-wrap ss-search">
            <span className="ico"><Icon name="search" size={15} /></span>
            <input
              className="input"
              autoFocus
              value={q}
              placeholder={buscarPlaceholder}
              aria-label="Buscar opción"
              onChange={(e) => { setQ(e.target.value); setActivo(0); }}
            />
          </div>
          <ul className="ss-list" role="listbox" ref={lista}>
            {visibles.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o === elegida}
                aria-disabled={bloqueada(o)}
                className={`ss-opt ${i === activo ? 'is-active' : ''} ${o === elegida ? 'is-selected' : ''} ${bloqueada(o) ? 'is-disabled' : ''}`}
                onMouseEnter={() => setActivo(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(o)}
              >
                <span className="grow">{o.label}</span>
                {o.baja && <span className="caption">{String(o.baja).toLowerCase()}</span>}
                {o === elegida && <Icon name="check" size={14} />}
              </li>
            ))}
            {visibles.length === 0 && <li className="ss-empty caption">No hay coincidencias para «{q.trim()}».</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Todas las listas de los formularios usan el desplegable con buscador, sean
 *  llaves foraneas o listas fijas (estado, metodo de pago…): el usuario
 *  siempre encuentra la opcion escribiendo. `buscable: false` vuelve al
 *  select nativo. */
const esForanea = (f) => f.buscable ?? true;

/* --------------------------------------------------------------
   Validaciones (punto 7: notificacion de validacion de campos)

   Se ejecutan en vivo y, sobre todo, al confirmar el formulario: ningun
   registro se guarda mientras quede un campo con error. Reglas opcionales
   de cada campo:
   - required, min, max, minLength, maxLength (por defecto segun el tipo).
   - noSpecial: sin <>{}[]$%^*.  soloLetras: nombres de personas.
   - alfanumerico: documentos y NIT (letras, numeros y guiones).
   - sinEspacios: nombres de usuario.  entero: cantidades sin decimales.
   - maxHoy: fechas que no pueden ser posteriores a hoy.
   -------------------------------------------------------------- */
const MAX_POR_TIPO = { text: 100, email: 100, tel: 20, password: 60, textarea: 600 };
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ .'-]+$/;
const ALFANUMERICO = /^[A-Za-z0-9-]+$/;

/** Errores de las lineas de un detalle: cantidad, precio y lineas repetidas. */
export function validarLineas(lineas = [], itemKey) {
  const vistos = new Set();
  for (const l of lineas) {
    if (l[itemKey] === '' || l[itemKey] === undefined) return 'Hay una línea sin seleccionar.';
    if (vistos.has(String(l[itemKey]))) return 'Hay líneas repetidas: agrupe la cantidad en una sola línea.';
    vistos.add(String(l[itemKey]));
    if (l.cantidad === '' || !(Number(l.cantidad) > 0)) return 'Todas las cantidades deben ser mayores que cero.';
    if (l.precio_unitario === '' || isNaN(Number(l.precio_unitario)) || Number(l.precio_unitario) < 0) return 'Todos los precios deben ser valores de cero en adelante.';
  }
  return null;
}

export function validar(fields, values) {
  const errs = {};
  fields.forEach((f) => {
    if (f.type === 'custom') return;
    if (f.type === 'items') {
      const lineas = values[f.name] || [];
      if (f.required && lineas.length === 0) { errs[f.name] = 'Agregue al menos una línea.'; return; }
      const e = validarLineas(lineas, f.itemKey);
      if (e) errs[f.name] = e;
      return;
    }
    const v = values[f.name];
    const t = typeof v === 'string' ? v.trim() : v;
    const vacio = t === undefined || t === null || t === '' || (Array.isArray(t) && t.length === 0);
    if (f.required && vacio) { errs[f.name] = 'Este campo no puede estar vacío.'; return; }
    if (vacio || f.type === 'component' || f.type === 'archivo' || f.type === 'switch') return;

    const err = (m) => { if (!errs[f.name]) errs[f.name] = m; };
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(t)) err('Ingrese un correo electrónico válido.');
    if (f.type === 'tel') {
      const digitos = String(t).replace(/\D/g, '').length;
      if (!/^[\d\s()+-]+$/.test(t) || digitos < 7) err('Ingrese un teléfono válido (mínimo 7 dígitos).');
      else if (digitos > 15) err('El teléfono no puede tener más de 15 dígitos.');
    }
    if (f.type === 'number' || f.type === 'money') {
      const n = Number(t);
      if (isNaN(n) || n < 0) err('Ingrese un valor numérico válido.');
      else if (f.entero && !Number.isInteger(n)) err('Ingrese un número entero.');
      else if (f.min !== undefined && n < f.min) err(`El valor mínimo permitido es ${f.min}.`);
      else if (f.max !== undefined && n > f.max) err(`El valor máximo permitido es ${f.max}.`);
    }
    if (f.type === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) err('Ingrese una fecha válida.');
      else if (f.maxHoy && t > hoyISO()) err(`La fecha no puede ser posterior a hoy (${fecha(hoyISO())}).`);
    }
    if (f.type === 'text') {
      if (f.noSpecial && /[<>{}[\]$%^*]/.test(t)) err('Este campo no puede contener caracteres especiales.');
      if (f.soloLetras && !SOLO_LETRAS.test(t)) err('Este campo solo admite letras y espacios.');
      if (f.alfanumerico && !ALFANUMERICO.test(t)) err('Solo se admiten letras, números y guiones, sin espacios.');
      if (f.sinEspacios && /\s/.test(t)) err('Este campo no puede contener espacios.');
    }
    const max = f.maxLength ?? MAX_POR_TIPO[f.type];
    if (max && String(t).length > max) err(`Máximo ${max} caracteres.`);
    if (f.minLength && String(t).length < f.minLength) err(`Mínimo ${f.minLength} caracteres.`);
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
    return <MultiSelectField f={f} value={value} error={error} onChange={onChange} readOnly={readOnly} />;
  }

  if (f.type === 'archivo') {
    return <ArchivoField f={f} value={value} error={error} onChange={onChange} readOnly={readOnly} label={label} />;
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

  if (f.type === 'select' && esForanea(f)) {
    return (
      <div className={`field ${f.full ? 'full' : ''}`}>
        {label}
        <SearchSelect
          id={id}
          options={f.options}
          value={value}
          error={error}
          disabled={readOnly}
          onChange={onChange}
          buscarPlaceholder={f.buscarPlaceholder || `Buscar ${String(f.label).toLowerCase()}…`}
        />
        {f.hint && !error && <span className="caption">{f.hint}</span>}
        {error && <span className="field-error"><Icon name="alert" size={12} /> {error}</span>}
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
          {opts.map((o) => <Opcion key={o.value} o={o} actual={value} />)}
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
        <textarea id={id} className={`textarea ${cls}`} value={value ?? ''} readOnly={readOnly} placeholder={f.placeholder} maxLength={f.maxLength ?? MAX_POR_TIPO.textarea} onChange={(e) => onChange(e.target.value)} />
        <span className="caption row" style={{ justifyContent: 'space-between', gap: 10 }}>
          <span>{!error && f.hint}</span>
          <span style={{ flex: 'none' }}>{String(value ?? '').length}/{f.maxLength ?? MAX_POR_TIPO.textarea}</span>
        </span>
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
        max={f.type === 'date' && f.maxHoy ? hoyISO() : undefined}
        maxLength={MAX_POR_TIPO[f.type] ? (f.maxLength ?? MAX_POR_TIPO[f.type]) : undefined}
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
   Editor de lineas: detalle_compra_insumo y detalle_pedido_insumo.
   `itemKey` es la llave foranea de cada linea.

   Cada linea agregada se puede editar (lapiz): pasa a modo edicion en su
   propio renglon con el insumo, la cantidad y el precio, y se confirma o se
   descarta. Un mismo item no se puede agregar dos veces: se edita su linea.

   Opcionales del campo:
   - precioSugerido(id): precio con que se llena la linea al elegir el item
     (sigue siendo editable).
   - unidad(id): unidad de medida del item ("yd", "m"…), que se muestra junto
     a la cantidad.
   - decimales: admite cantidades fraccionarias (1.5 litros, 0.75 metros).
   - totalLabel: texto del pie ("Total", "Subtotal de insumos"…).
   -------------------------------------------------------------- */
const subtotal = (l) => Number(l.cantidad || 0) * Number(l.precio_unitario || 0);

export function ItemsEditor({ f, value = [], onChange, error, readOnly }) {
  const opts = normOpciones(f.options);
  const vacio = { [f.itemKey]: '', cantidad: '', precio_unitario: '' };
  const [draft, setDraft] = useState(vacio);
  /* Indice de la linea en edicion; null mientras se agrega una nueva. */
  const [editando, setEditando] = useState(null);
  const [errLinea, setErrLinea] = useState('');
  const msg = errLinea || error;

  const etiqueta = (v) => opts.find((o) => String(o.value) === String(v))?.label ?? v;
  const unidad = (id) => (id !== '' && f.unidad ? f.unidad(id) : '');
  const total = value.reduce((s, it) => s + subtotal(it), 0);

  const elegir = (id) => {
    const sugerido = id !== '' && f.precioSugerido ? f.precioSugerido(id) : undefined;
    setDraft({
      ...draft,
      [f.itemKey]: id,
      precio_unitario: sugerido !== undefined && sugerido !== null ? String(sugerido) : draft.precio_unitario,
    });
    setErrLinea('');
  };

  const confirmar = () => {
    const cantidad = Number(draft.cantidad);
    const precio = Number(draft.precio_unitario);
    if (draft[f.itemKey] === '' || draft.cantidad === '' || draft.precio_unitario === '') {
      setErrLinea(`Seleccione ${f.itemLabel.toLowerCase()} e ingrese la cantidad y el precio.`);
      return;
    }
    if (value.some((l, j) => j !== editando && String(l[f.itemKey]) === String(draft[f.itemKey]))) {
      setErrLinea(`${etiqueta(draft[f.itemKey])} ya está en la lista: edite su línea en lugar de agregarlo otra vez.`);
      return;
    }
    if (!(cantidad > 0)) { setErrLinea('La cantidad debe ser mayor que cero.'); return; }
    if (!f.decimales && !Number.isInteger(cantidad)) { setErrLinea('La cantidad debe ser un número entero.'); return; }
    if (isNaN(precio) || precio < 0) { setErrLinea('El precio unitario no puede ser negativo.'); return; }
    const linea = { [f.itemKey]: draft[f.itemKey], cantidad, precio_unitario: precio };
    onChange(editando === null ? [...value, linea] : value.map((l, j) => (j === editando ? { ...l, ...linea } : l)));
    cancelar();
  };

  const editar = (i) => {
    const l = value[i];
    setDraft({ [f.itemKey]: l[f.itemKey], cantidad: String(l.cantidad), precio_unitario: String(l.precio_unitario) });
    setEditando(i);
    setErrLinea('');
  };

  const cancelar = () => { setDraft(vacio); setEditando(null); setErrLinea(''); };

  /* Enter en cantidad o precio confirma la linea sin enviar el formulario. */
  const enter = (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmar(); } };

  const filaDraft = (key) => (
    <div className={`items-row ${editando !== null ? 'is-editing' : ''}`} key={key}>
      <SearchSelect
        options={f.options}
        value={draft[f.itemKey]}
        onChange={elegir}
        ariaLabel={f.itemLabel}
        buscarPlaceholder={`Buscar ${f.itemLabel.toLowerCase()}…`}
      />
      <div className="input-unidad">
        <input className="input" type="number" min={f.decimales ? '0' : '1'} step={f.decimales ? 'any' : '1'} placeholder="Cant." aria-label="Cantidad" value={draft.cantidad} onKeyDown={enter} onChange={(e) => setDraft({ ...draft, cantidad: e.target.value })} />
        {unidad(draft[f.itemKey]) && <span className="unidad">{unidad(draft[f.itemKey])}</span>}
      </div>
      <input className="input" type="number" min="0" step="0.01" placeholder="Precio" aria-label="Precio unitario" value={draft.precio_unitario} onKeyDown={enter} onChange={(e) => setDraft({ ...draft, precio_unitario: e.target.value })} />
      <span className="money items-sub">{money(subtotal(draft))}</span>
      <span className="items-acc">
        <button type="button" className="icon-btn" style={{ color: 'var(--success)' }} onClick={confirmar} aria-label={editando === null ? 'Agregar línea' : 'Guardar cambios de la línea'} title={editando === null ? 'Agregar' : 'Guardar cambios'}>
          <Icon name={editando === null ? 'plus' : 'check'} size={17} />
        </button>
        {editando !== null && (
          <button type="button" className="icon-btn" onClick={cancelar} aria-label="Descartar cambios" title="Descartar cambios">
            <Icon name="x" size={16} />
          </button>
        )}
      </span>
    </div>
  );

  return (
    <div className="field full">
      <label>{f.label} {f.required && !readOnly && <span className="req">*</span>}</label>
      <div className="items-box">
        <div className="items-row head">
          <span>{f.itemLabel}</span><span>Cantidad</span><span>Precio unit.</span><span className="items-sub">Subtotal</span><span className="items-acc" />
        </div>
        {value.length === 0 && <div style={{ padding: '14px 12px' }} className="caption">Sin líneas registradas.</div>}
        {value.map((it, i) => (editando === i ? filaDraft(`e${i}`) : (
          <div className="items-row" key={i}>
            <span style={{ fontSize: 13 }}>{etiqueta(it[f.itemKey])}</span>
            <span style={{ fontSize: 13 }}>{it.cantidad} {unidad(it[f.itemKey])}</span>
            <span className="money" style={{ fontSize: 13 }}>{money(it.precio_unitario)}</span>
            <span className="money items-sub" style={{ fontSize: 13 }}>{money(subtotal(it))}</span>
            <span className="items-acc">
              {!readOnly && editando === null && (
                <>
                  <button type="button" className="icon-btn is-edit" onClick={() => editar(i)} aria-label="Editar línea" title="Editar">
                    <Icon name="edit" size={15} />
                  </button>
                  <button type="button" className="icon-btn is-delete" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Quitar línea" title="Quitar">
                    <Icon name="trash" size={15} />
                  </button>
                </>
              )}
            </span>
          </div>
        )))}
        {!readOnly && editando === null && filaDraft('nueva')}
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
export function ItemsView({ lineas = [], opciones = [], itemKey, itemLabel = 'Ítem', totalLabel = 'Subtotal', vacio = 'Sin líneas registradas.', unidad }) {
  const opts = normOpciones(opciones);
  const etiqueta = (v) => opts.find((o) => String(o.value) === String(v))?.label ?? v;
  const total = lineas.reduce((s, it) => s + subtotal(it), 0);

  return (
    <div className="items-box">
      <div className="items-row head">
        <span>{itemLabel}</span><span>Cantidad</span><span>Precio unit.</span><span className="items-sub">Subtotal</span><span className="items-acc" />
      </div>
      {lineas.length === 0 && <div style={{ padding: '14px 12px' }} className="caption">{vacio}</div>}
      {lineas.map((it, i) => (
        <div className="items-row" key={i}>
          <span style={{ fontSize: 13 }}>{etiqueta(it[itemKey])}</span>
          <span style={{ fontSize: 13 }}>{it.cantidad} {unidad ? unidad(it[itemKey]) : ''}</span>
          <span className="money" style={{ fontSize: 13 }}>{money(it.precio_unitario)}</span>
          <span className="money items-sub" style={{ fontSize: 13 }}>{money(subtotal(it))}</span>
          <span className="items-acc" />
        </div>
      ))}
      <div className="items-foot">
        <span className="caption">{lineas.length} línea(s)</span>
        <span className="money" style={{ fontSize: 15 }}>{totalLabel}: {money(total)}</span>
      </div>
    </div>
  );
}
