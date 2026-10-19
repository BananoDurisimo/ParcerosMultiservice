import { useState } from 'react';
import Icon from '@shared/components/Icon.jsx';
import { normTexto } from '@shared/components/ui/Form.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money } from '@shared/data/mock.js';

const unidadDe = (i) => i?.calc_abreviatura || i?.calc_unidad || '';
const subtotal = (l) => Number(l.cantidad || 0) * Number(l.precio_unitario || 0);
const cantidadValida = (l, entero) => l.cantidad !== '' && Number(l.cantidad) > 0 && (!entero || Number.isInteger(Number(l.cantidad)));
/* Prendas defectuosas: entero de cero en adelante (vacio cuenta como 0). */
const defectosValidos = (l) => l.defectuosas === undefined || l.defectuosas === '' || (Number.isInteger(Number(l.defectuosas)) && Number(l.defectuosas) >= 0);
const precioValido = (l) => l.precio_unitario !== '' && !isNaN(Number(l.precio_unitario)) && Number(l.precio_unitario) >= 0;
const redondear = (n) => Math.round(n * 100) / 100;

/** Total que se cobra: productos + insumos de personalizacion. */
export const totalLineas = (productos = [], insumos = []) =>
  redondear([...productos, ...insumos].reduce((s, l) => s + subtotal(l), 0));

/** Buscador de los catalogos del pedido. */
function Buscador({ value, onChange, placeholder }) {
  return (
    <div className="ins-buscar">
      <div className="search-wrap">
        <span className="ico"><Icon name="search" size={15} /></span>
        <input className="input" value={value} placeholder={placeholder} aria-label={placeholder} onChange={(e) => onChange(e.target.value)} />
        {value && (
          <button type="button" className="icon-btn ms-limpiar" onClick={() => onChange('')} aria-label="Limpiar la búsqueda">
            <Icon name="x" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Columna izquierda del formulario de cotizacion / pedido, en tres pestañas.
 * Cada una muestra solo lo suyo, para no mezclar catalogos ni listas:
 *
 * 1. Productos (detalle_pedido_producto): catalogo de productos base -p. ej.
 *    «Jersey XL Drift»-, los agregados con sus unidades y precio, y los
 *    insumos que su receta descuenta (se calculan solos: no se editan ni se
 *    cobran aparte).
 * 2. Personalización (detalle_pedido_insumo): catalogo de insumos y los
 *    agregados (estampado, colores, cinta…) con la cantidad que se gasta:
 *    los insumos no tienen precio, lo que se cobra son los productos.
 * 3. Resumen: el desglose completo del total y lo que se descontara del
 *    inventario, para revisar antes de guardar.
 *
 * Cada pestaña muestra cuanto lleva (lineas o total), asi se ve el avance sin
 * abrirlas. El error de las lineas se muestra arriba, visible en cualquiera.
 *
 * `conDefectuosas` (al editar un pedido en elaboracion): cada producto tiene
 * «Defectuosas», las prendas que salieron mal. Su receta se descuenta del
 * inventario ademas de la del pedido; el precio no cambia.
 */
export default function LineasPedido({ productos = [], insumos = [], onProductos, onInsumos, error, readOnly, conDefectuosas = false }) {
  const { db, expandirReceta } = useData();
  const [pestana, setPestana] = useState('productos');
  const [q, setQ] = useState('');
  const texto = normTexto(q.trim());

  const producto = (id) => db.productos.find((p) => String(p.id) === String(id));
  const insumo = (id) => db.insumos.find((i) => String(i.id) === String(id));

  const listaProductos = db.productos.filter((p) => !texto || normTexto(`${p.nombre} ${p.calc_categoria} ${p.calc_talla} ${p.calc_tela}`).includes(texto));
  const listaInsumos = db.insumos.filter((i) => !texto || normTexto(`${i.nombre} ${i.calc_tipo} ${i.calc_unidad}`).includes(texto));

  const agregarProducto = (p) => onProductos([...productos, { id_producto: p.id, cantidad: '1', precio_unitario: String(p.precio_venta) }]);
  /* Los insumos no tienen precio: solo se indica cuanto se va a gastar. */
  const agregarInsumo = (i) => onInsumos([...insumos, { id_insumo: i.id, cantidad: '1', precio_unitario: 0 }]);
  const cambiar = (lineas, set) => (idx, campo, v) => set(lineas.map((l, j) => (j === idx ? { ...l, [campo]: v } : l)));
  const quitar = (lineas, set) => (idx) => set(lineas.filter((_, j) => j !== idx));

  const receta = expandirReceta(productos.filter((l) => cantidadValida(l, true)));
  const conDefecto = productos.filter((l) => defectosValidos(l) && Number(l.defectuosas) > 0);
  const recetaDefectos = expandirReceta(conDefecto.map((l) => ({ ...l, cantidad: Number(l.defectuosas) })));
  const total = totalLineas(productos, insumos);
  const abrir = (p) => { setPestana(p); setQ(''); };

  const PESTANAS = [
    { id: 'productos', icono: 'shirt', label: 'Productos', nota: productos.length },
    { id: 'insumos', icono: 'sparkle', label: 'Personalización', nota: insumos.length },
    { id: 'resumen', icono: 'receipt', label: 'Resumen', nota: money(total) },
  ];

  /* Insumos que la receta descuenta del inventario (solo lectura). */
  const recetaAuto = receta.length > 0 && (
    <div className="field">
      <label><Icon name="lock" size={13} /> Insumos de los productos (automático)</label>
      <div className="receta-auto">
        {receta.map((r) => {
          const i = insumo(r.id_insumo);
          const falta = i && r.cantidad > Number(i.stock);
          return (
            <div className="linea" key={r.id_insumo}>
              <span>{i?.nombre || `#${r.id_insumo}`}</span>
              <span className={falta ? 'falta' : 'caption'}>
                {r.cantidad} {unidadDe(i)}{falta ? ` · hay ${i.stock}` : ''}
              </span>
            </div>
          );
        })}
      </div>
      <span className="caption">Sale de la receta de cada producto por las unidades pedidas. Descuenta inventario; no se cobra aparte.</span>
    </div>
  );

  /* Insumos extra que se gastaron en las prendas defectuosas (solo lectura). */
  const defectosAuto = recetaDefectos.length > 0 && (
    <div className="field">
      <label><Icon name="alert" size={13} /> Insumos de las prendas defectuosas (automático)</label>
      <div className="receta-auto defectos">
        {recetaDefectos.map((r) => {
          const i = insumo(r.id_insumo);
          return (
            <div className="linea" key={r.id_insumo}>
              <span>{i?.nombre || `#${r.id_insumo}`}</span>
              <span className="caption">+{r.cantidad} {unidadDe(i)}</span>
            </div>
          );
        })}
      </div>
      <span className="caption">
        {conDefecto.map((l) => `${producto(l.id_producto)?.nombre}: ${l.defectuosas}`).join(' · ')}. Se descuentan del inventario; el precio no cambia.
      </span>
    </div>
  );

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="lp-tabs" role="tablist" aria-label="Contenido del registro">
        {PESTANAS.map((p) => (
          <button
            key={p.id} type="button" role="tab" aria-selected={pestana === p.id}
            className={`lp-tab ${pestana === p.id ? 'is-on' : ''}`} onClick={() => abrir(p.id)}
          >
            <Icon name={p.icono} size={15} />
            <span>{p.label}</span>
            <span className="lp-nota">{p.nota}</span>
          </button>
        ))}
      </div>

      {error && <div className="field-error"><Icon name="alert" size={12} /> {error}</div>}

      {/* ---------------- Productos ---------------- */}
      {pestana === 'productos' && (
        <>
          {!readOnly && (
            <div className="field">
              <label>Catálogo de productos</label>
              <div className="ins-catalogo">
                <Buscador value={q} onChange={setQ} placeholder="Buscar producto por nombre, prenda, talla o tela…" />
                <div className="ins-lista">
                  {listaProductos.map((p) => {
                    const baja = p.estado !== 'Activo';
                    const ya = productos.some((l) => String(l.id_producto) === String(p.id));
                    return (
                      <div className={`ins-item ${baja ? 'is-baja' : ''}`} key={p.id}>
                        <div className="grow" style={{ minWidth: 0 }}>
                          <div className="ins-nombre">{p.nombre}</div>
                          <div className="caption">{p.calc_categoria} · Talla {p.calc_talla} · {p.calc_tela} · <strong>{money(p.precio_venta)}</strong></div>
                        </div>
                        <button
                          type="button" className={`btn btn-sm ${ya ? '' : 'btn-primary'}`} disabled={baja || ya} onClick={() => agregarProducto(p)}
                          title={baja ? 'Producto inactivo' : ya ? 'Ya está en el pedido: edite su cantidad abajo' : 'Agregar al pedido'}
                        >
                          <Icon name={ya ? 'check' : 'plus'} size={14} /> {baja ? 'Inactivo' : ya ? 'Agregado' : 'Agregar'}
                        </button>
                      </div>
                    );
                  })}
                  {listaProductos.length === 0 && (
                    <div className="caption" style={{ padding: 14 }}>
                      {db.productos.length ? `No hay productos que coincidan con «${q.trim()}».` : 'Todavía no hay productos: regístrelos en el módulo Productos.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="field">
            <label>Productos agregados</label>
            <div className="ins-agregados">
              <div className={`ins-linea head ${conDefectuosas ? 'con-defectos' : ''}`}>
                <span>Producto</span><span>Unidades</span><span>Precio unit. (C$)</span>{conDefectuosas && <span>Defectuosas</span>}<span />
              </div>
              {productos.length === 0 && (
                <div className="caption" style={{ padding: '14px 12px' }}>Todavía no hay productos: agréguelos desde el catálogo.</div>
              )}
              {productos.map((l, idx) => {
                const p = producto(l.id_producto);
                return (
                  <div className={`ins-linea ${conDefectuosas ? 'con-defectos' : ''}`} key={l.id_producto}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p?.nombre || `#${l.id_producto}`}</div>
                      <div className="caption">{p?.calc_categoria} · Talla {p?.calc_talla} · {money(subtotal(l))}</div>
                    </div>
                    <input
                      className={`input ${cantidadValida(l, true) ? '' : 'has-error'}`}
                      type="number" min="1" step="1" aria-label={`Unidades de ${p?.nombre}`}
                      value={l.cantidad} readOnly={readOnly}
                      onChange={(e) => cambiar(productos, onProductos)(idx, 'cantidad', e.target.value)}
                    />
                    <input
                      className={`input ${precioValido(l) ? '' : 'has-error'}`}
                      type="number" min="0" step="0.01" aria-label={`Precio unitario de ${p?.nombre}`}
                      value={l.precio_unitario} readOnly={readOnly}
                      onChange={(e) => cambiar(productos, onProductos)(idx, 'precio_unitario', e.target.value)}
                    />
                    {conDefectuosas && (
                      <input
                        className={`input ${defectosValidos(l) ? '' : 'has-error'}`}
                        type="number" min="0" step="1" placeholder="0" aria-label={`Prendas defectuosas de ${p?.nombre}`}
                        title="Prendas que salieron mal: su receta se descuenta del inventario"
                        value={l.defectuosas ?? ''} readOnly={readOnly}
                        onChange={(e) => cambiar(productos, onProductos)(idx, 'defectuosas', e.target.value)}
                      />
                    )}
                    {!readOnly ? (
                      <button type="button" className="icon-btn is-delete" onClick={() => quitar(productos, onProductos)(idx)} aria-label={`Quitar ${p?.nombre}`} title="Quitar">
                        <Icon name="trash" size={15} />
                      </button>
                    ) : <span />}
                  </div>
                );
              })}
            </div>
          </div>

          {recetaAuto}
          {defectosAuto}

          {!readOnly && (
            <button type="button" className="btn btn-sm lp-siguiente" onClick={() => abrir('insumos')}>
              Siguiente: personalización <Icon name="chevR" size={14} />
            </button>
          )}
        </>
      )}

      {/* ---------------- Personalizacion ---------------- */}
      {pestana === 'insumos' && (
        <>
          {!readOnly && (
            <div className="field">
              <label>Catálogo de insumos de personalización</label>
              <div className="ins-catalogo">
                <Buscador value={q} onChange={setQ} placeholder="Buscar insumo por nombre, tipo o unidad…" />
                <div className="ins-lista">
                  {listaInsumos.map((i) => {
                    const baja = i.estado !== 'Activo';
                    const ya = insumos.some((l) => String(l.id_insumo) === String(i.id));
                    return (
                      <div className={`ins-item ${baja ? 'is-baja' : ''}`} key={i.id}>
                        <div className="grow" style={{ minWidth: 0 }}>
                          <div className="ins-nombre">{i.nombre}</div>
                          <div className="caption">
                            {i.calc_tipo} · {unidadDe(i)} ·{' '}
                            <span style={{ color: i.stock === 0 ? 'var(--error-fg)' : i.stock <= i.calc_minimo ? 'var(--warning-fg, var(--warning))' : undefined }}>
                              {i.stock === 0 ? 'agotado' : `${i.stock} ${unidadDe(i)} disponibles`}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button" className={`btn btn-sm ${ya ? '' : 'btn-primary'}`} disabled={baja || ya} onClick={() => agregarInsumo(i)}
                          title={baja ? 'Insumo inactivo' : ya ? 'Ya está en el pedido: edite su cantidad abajo' : 'Agregar al pedido'}
                        >
                          <Icon name={ya ? 'check' : 'plus'} size={14} /> {baja ? 'Inactivo' : ya ? 'Agregado' : 'Agregar'}
                        </button>
                      </div>
                    );
                  })}
                  {listaInsumos.length === 0 && <div className="caption" style={{ padding: 14 }}>No hay insumos que coincidan con «{q.trim()}».</div>}
                </div>
              </div>
            </div>
          )}

          <div className="field">
            <label>Insumos de personalización agregados</label>
            <div className="ins-agregados">
              <div className="ins-linea head sin-precio">
                <span>Insumo</span><span>Cantidad a gastar</span><span />
              </div>
              {insumos.length === 0 && (
                <div className="caption" style={{ padding: '14px 12px' }}>Opcional: estampados, colores o accesorios desde el catálogo.</div>
              )}
              {insumos.map((l, idx) => {
                const i = insumo(l.id_insumo);
                return (
                  <div className="ins-linea sin-precio" key={l.id_insumo}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{i?.nombre || `#${l.id_insumo}`}</div>
                      <div className="caption">{i?.calc_tipo} · Unidad: {i?.calc_unidad} ({unidadDe(i)})</div>
                    </div>
                    <div className="input-unidad">
                      <input
                        className={`input ${cantidadValida(l) ? '' : 'has-error'}`}
                        type="number" min="0" step="any" aria-label={`Cantidad de ${i?.nombre}`}
                        value={l.cantidad} readOnly={readOnly}
                        onChange={(e) => cambiar(insumos, onInsumos)(idx, 'cantidad', e.target.value)}
                      />
                      <span className="unidad">{unidadDe(i)}</span>
                    </div>
                    {!readOnly ? (
                      <button type="button" className="icon-btn is-delete" onClick={() => quitar(insumos, onInsumos)(idx)} aria-label={`Quitar ${i?.nombre}`} title="Quitar">
                        <Icon name="trash" size={15} />
                      </button>
                    ) : <span />}
                  </div>
                );
              })}
            </div>
            <span className="caption">Indique cuánto se va a gastar de cada insumo: los insumos no se cobran, el precio está en los productos.</span>
          </div>

          {!readOnly && (
            <button type="button" className="btn btn-sm lp-siguiente" onClick={() => abrir('resumen')}>
              Siguiente: resumen <Icon name="chevR" size={14} />
            </button>
          )}
        </>
      )}

      {/* ---------------- Resumen ---------------- */}
      {pestana === 'resumen' && (
        <>
          <DesglosePedido productos={productos} insumos={insumos} />
          {recetaAuto}
          {defectosAuto}
        </>
      )}
    </div>
  );
}

/** Total del registro para la columna derecha; el detalle esta en la pestaña Resumen. */
export function TotalPedido({ productos = [], insumos = [] }) {
  const unidades = productos.reduce((s, l) => s + Number(l.cantidad || 0), 0);
  return (
    <div className="pedido-total">
      <div><span>Productos</span><strong>{productos.length} ({unidades} und)</strong></div>
      <div><span>Insumos de personalización</span><strong>{insumos.length}</strong></div>
      <div className="is-total"><span>Total</span><strong className="money">{money(totalLineas(productos, insumos))}</strong></div>
    </div>
  );
}

/** Desglose del total en vivo: productos y personalizacion con su subtotal. */
export function DesglosePedido({ productos = [], insumos = [], children }) {
  const { db } = useData();
  const producto = (id) => db.productos.find((p) => String(p.id) === String(id));
  const insumo = (id) => db.insumos.find((i) => String(i.id) === String(id));
  const tp = totalLineas(productos, []);
  const ti = totalLineas([], insumos);

  return (
    <div className="field full">
      <label>Desglose del precio</label>
      <div className="pedido-total desglose">
        {productos.length === 0 && insumos.length === 0 && (
          <div className="linea"><span className="caption">Agregue productos o insumos para calcular el total.</span></div>
        )}
        {productos.map((l) => (
          <div className="linea" key={`p${l.id_producto}`}>
            <span>
              {producto(l.id_producto)?.nombre || `#${l.id_producto}`}
              <span className="caption">{Number(l.cantidad || 0)} und × {money(l.precio_unitario || 0)}</span>
            </span>
            <strong className="money">{money(subtotal(l))}</strong>
          </div>
        ))}
        {productos.length > 0 && insumos.length > 0 && (
          <div className="linea sub"><span>Subtotal productos</span><strong className="money">{money(tp)}</strong></div>
        )}
        {insumos.length > 0 && <div className="linea sub"><span>Insumos de personalización (no se cobran)</span><span /></div>}
        {insumos.map((l) => {
          const i = insumo(l.id_insumo);
          return (
            <div className="linea" key={`i${l.id_insumo}`}>
              <span>
                {i?.nombre || `#${l.id_insumo}`}
                <span className="caption">{Number(l.cantidad || 0)} {unidadDe(i)}</span>
              </span>
              {subtotal(l) > 0 ? <strong className="money">{money(subtotal(l))}</strong> : <span className="caption">sin costo</span>}
            </div>
          );
        })}
        {productos.length > 0 && ti > 0 && (
          <div className="linea sub"><span>Subtotal personalización (registro anterior)</span><strong className="money">{money(ti)}</strong></div>
        )}
        <div className="is-total"><span>Total</span><strong className="money">{money(tp + ti)}</strong></div>
        {children}
      </div>
    </div>
  );
}
