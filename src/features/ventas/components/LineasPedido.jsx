import { useState } from 'react';
import Icon from '@shared/components/Icon.jsx';
import { normTexto } from '@shared/components/ui/Form.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money } from '@shared/data/mock.js';

const unidadDe = (i) => i?.calc_abreviatura || i?.calc_unidad || '';
const subtotal = (l) => Number(l.cantidad || 0) * Number(l.precio_unitario || 0);
const cantidadValida = (l, entero) => l.cantidad !== '' && Number(l.cantidad) > 0 && (!entero || Number.isInteger(Number(l.cantidad)));
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
 * Columna izquierda del formulario de cotizacion / pedido.
 *
 * 1. Productos (detalle_pedido_producto): el producto base -p. ej. «Jersey
 *    XL Drift»- se cobra a su precio de venta. Su receta se calcula sola:
 *    10 jerseys descuentan 10 veces la tela de uno. Esa receta se ve, pero no
 *    se edita, y no se cobra aparte.
 * 2. Personalizacion (detalle_pedido_insumo): estampado, colores, diseño…
 *    cada insumo con su cantidad y su precio, que si se cobran.
 *
 * Un solo catalogo con buscador y dos pestañas (Productos / Personalización)
 * para no recorrer dos listas largas; debajo, lo agregado al pedido.
 */
export default function LineasPedido({ productos = [], insumos = [], onProductos, onInsumos, error, readOnly }) {
  const { db, expandirReceta } = useData();
  const [catalogo, setCatalogo] = useState('productos');
  const [q, setQ] = useState('');
  const texto = normTexto(q.trim());

  const producto = (id) => db.productos.find((p) => String(p.id) === String(id));
  const insumo = (id) => db.insumos.find((i) => String(i.id) === String(id));

  const listaProductos = db.productos.filter((p) => !texto || normTexto(`${p.nombre} ${p.calc_categoria} ${p.calc_talla} ${p.calc_tela}`).includes(texto));
  const listaInsumos = db.insumos.filter((i) => !texto || normTexto(`${i.nombre} ${i.calc_tipo} ${i.calc_unidad}`).includes(texto));

  const agregarProducto = (p) => onProductos([...productos, { id_producto: p.id, cantidad: '1', precio_unitario: String(p.precio_venta) }]);
  const agregarInsumo = (i) => onInsumos([...insumos, { id_insumo: i.id, cantidad: '1', precio_unitario: String(i.precio_unitario) }]);
  const cambiar = (lineas, set) => (idx, campo, v) => set(lineas.map((l, j) => (j === idx ? { ...l, [campo]: v } : l)));
  const quitar = (lineas, set) => (idx) => set(lineas.filter((_, j) => j !== idx));

  const receta = expandirReceta(productos.filter((l) => cantidadValida(l, true)));

  return (
    <div className="stack" style={{ gap: 14 }}>
      {!readOnly && (
        <div className="field">
          <div className="between" style={{ gap: 10, flexWrap: 'wrap' }}>
            <label>Catálogo</label>
            <div className="seg" role="tablist" aria-label="Catálogo a mostrar">
              <button type="button" role="tab" aria-selected={catalogo === 'productos'} className={catalogo === 'productos' ? 'is-on' : ''} onClick={() => setCatalogo('productos')}>
                <Icon name="shirt" size={14} /> Productos
              </button>
              <button type="button" role="tab" aria-selected={catalogo === 'insumos'} className={catalogo === 'insumos' ? 'is-on' : ''} onClick={() => setCatalogo('insumos')}>
                <Icon name="sparkle" size={14} /> Personalización
              </button>
            </div>
          </div>
          <div className="ins-catalogo">
            <Buscador
              value={q} onChange={setQ}
              placeholder={catalogo === 'productos' ? 'Buscar producto por nombre, prenda, talla o tela…' : 'Buscar insumo por nombre, tipo o unidad…'}
            />
            <div className="ins-lista">
              {catalogo === 'productos' ? (
                <>
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
                </>
              ) : (
                <>
                  {listaInsumos.map((i) => {
                    const baja = i.estado !== 'Activo';
                    const ya = insumos.some((l) => String(l.id_insumo) === String(i.id));
                    return (
                      <div className={`ins-item ${baja ? 'is-baja' : ''}`} key={i.id}>
                        <div className="grow" style={{ minWidth: 0 }}>
                          <div className="ins-nombre">{i.nombre}</div>
                          <div className="caption">
                            {i.calc_tipo} · {money(i.precio_unitario)} / {unidadDe(i)} ·{' '}
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
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Productos agregados ---- */}
      <div className="field">
        <label><Icon name="shirt" size={14} /> Productos del pedido</label>
        <div className="ins-agregados">
          <div className="ins-linea head">
            <span>Producto</span><span>Unidades</span><span>Precio unit. (C$)</span><span />
          </div>
          {productos.length === 0 && (
            <div className="caption" style={{ padding: '14px 12px' }}>Agregue productos desde la pestaña «Productos» del catálogo.</div>
          )}
          {productos.map((l, idx) => {
            const p = producto(l.id_producto);
            return (
              <div className="ins-linea" key={l.id_producto}>
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

      {/* ---- Receta calculada (solo lectura) ---- */}
      {receta.length > 0 && (
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
      )}

      {/* ---- Personalizacion ---- */}
      <div className="field">
        <label><Icon name="sparkle" size={14} /> Insumos de personalización</label>
        <div className="ins-agregados">
          <div className="ins-linea head">
            <span>Insumo</span><span>Cantidad</span><span>Precio unit. (C$)</span><span />
          </div>
          {insumos.length === 0 && (
            <div className="caption" style={{ padding: '14px 12px' }}>Opcional: estampados, colores o accesorios desde la pestaña «Personalización».</div>
          )}
          {insumos.map((l, idx) => {
            const i = insumo(l.id_insumo);
            return (
              <div className="ins-linea" key={l.id_insumo}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{i?.nombre || `#${l.id_insumo}`}</div>
                  <div className="caption">Unidad: {i?.calc_unidad} ({unidadDe(i)}) · {money(subtotal(l))}</div>
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
                <input
                  className={`input ${precioValido(l) ? '' : 'has-error'}`}
                  type="number" min="0" step="0.01" aria-label={`Precio unitario de ${i?.nombre}`}
                  value={l.precio_unitario} readOnly={readOnly}
                  onChange={(e) => cambiar(insumos, onInsumos)(idx, 'precio_unitario', e.target.value)}
                />
                {!readOnly ? (
                  <button type="button" className="icon-btn is-delete" onClick={() => quitar(insumos, onInsumos)(idx)} aria-label={`Quitar ${i?.nombre}`} title="Quitar">
                    <Icon name="trash" size={15} />
                  </button>
                ) : <span />}
              </div>
            );
          })}
        </div>
        {error
          ? <span className="field-error"><Icon name="alert" size={12} /> {error}</span>
          : <span className="caption">Edite cantidades y precios directamente en cada línea.</span>}
      </div>
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
        {insumos.map((l) => {
          const i = insumo(l.id_insumo);
          return (
            <div className="linea" key={`i${l.id_insumo}`}>
              <span>
                {i?.nombre || `#${l.id_insumo}`}
                <span className="caption">{Number(l.cantidad || 0)} {unidadDe(i)} × {money(l.precio_unitario || 0)}</span>
              </span>
              <strong className="money">{money(subtotal(l))}</strong>
            </div>
          );
        })}
        {productos.length > 0 && insumos.length > 0 && (
          <div className="linea sub"><span>Subtotal personalización</span><strong className="money">{money(ti)}</strong></div>
        )}
        <div className="is-total"><span>Total</span><strong className="money">{money(tp + ti)}</strong></div>
        {children}
      </div>
    </div>
  );
}
