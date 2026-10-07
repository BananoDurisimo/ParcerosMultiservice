import { useState } from 'react';
import Icon from '@shared/components/Icon.jsx';
import { normTexto } from '@shared/components/ui/Form.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money } from '@shared/data/mock.js';

const unidadDe = (i) => i?.calc_abreviatura || i?.calc_unidad || '';
const subtotal = (l) => Number(l.cantidad || 0) * Number(l.precio_unitario || 0);
const cantidadValida = (l) => l.cantidad !== '' && Number(l.cantidad) > 0;
const precioValido = (l) => l.precio_unitario !== '' && !isNaN(Number(l.precio_unitario)) && Number(l.precio_unitario) >= 0;

/**
 * Columna izquierda del formulario de cotizacion / pedido: el catalogo de
 * insumos con su buscador y, debajo, los insumos agregados (detalle_pedido_insumo).
 *
 * Al agregar un insumo entra con cantidad 1 y su precio unitario; la cantidad
 * y el precio de cada linea se editan ahi mismo, con la unidad de medida al
 * lado. Un insumo inactivo se ve en el catalogo pero no se puede agregar.
 */
export default function InsumosPedido({ value = [], onChange, error, readOnly }) {
  const { db } = useData();
  const [q, setQ] = useState('');

  const texto = normTexto(q.trim());
  const catalogo = db.insumos.filter((i) => !texto || normTexto(`${i.nombre} ${i.calc_tipo} ${i.calc_unidad}`).includes(texto));
  const insumo = (id) => db.insumos.find((i) => String(i.id) === String(id));
  const agregado = (id) => value.some((l) => String(l.id_insumo) === String(id));

  const agregar = (i) => onChange([...value, { id_insumo: i.id, cantidad: '1', precio_unitario: String(i.precio_unitario) }]);
  const cambiar = (idx, campo, v) => onChange(value.map((l, j) => (j === idx ? { ...l, [campo]: v } : l)));
  const quitar = (idx) => onChange(value.filter((_, j) => j !== idx));

  return (
    <div className="stack" style={{ gap: 14 }}>
      {!readOnly && (
        <div className="field">
          <label>Catálogo de insumos</label>
          <div className="ins-catalogo">
            <div className="ins-buscar">
              <div className="search-wrap">
                <span className="ico"><Icon name="search" size={15} /></span>
                <input
                  className="input"
                  value={q}
                  placeholder="Buscar insumo por nombre, tipo o unidad…"
                  aria-label="Buscar insumo"
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
            <div className="ins-lista">
              {catalogo.map((i) => {
                const baja = i.estado !== 'Activo';
                const ya = agregado(i.id);
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
                      type="button"
                      className={`btn btn-sm ${ya ? '' : 'btn-primary'}`}
                      disabled={baja || ya}
                      onClick={() => agregar(i)}
                      title={baja ? 'Insumo inactivo' : ya ? 'Ya está en el pedido: edite su cantidad abajo' : 'Agregar al pedido'}
                    >
                      <Icon name={ya ? 'check' : 'plus'} size={14} /> {baja ? 'Inactivo' : ya ? 'Agregado' : 'Agregar'}
                    </button>
                  </div>
                );
              })}
              {catalogo.length === 0 && <div className="caption" style={{ padding: 14 }}>No hay insumos que coincidan con «{q.trim()}».</div>}
            </div>
          </div>
        </div>
      )}

      <div className="field">
        <label>Insumos a utilizar {!readOnly && <span className="req">*</span>}</label>
        <div className="ins-agregados">
          <div className="ins-linea head">
            <span>Insumo</span><span>Cantidad</span><span>Precio unit. (C$)</span><span />
          </div>
          {value.length === 0 && (
            <div className="caption" style={{ padding: '14px 12px' }}>Todavía no hay insumos: agréguelos desde el catálogo.</div>
          )}
          {value.map((l, idx) => {
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
                    onChange={(e) => cambiar(idx, 'cantidad', e.target.value)}
                  />
                  <span className="unidad">{unidadDe(i)}</span>
                </div>
                <input
                  className={`input ${precioValido(l) ? '' : 'has-error'}`}
                  type="number" min="0" step="0.01" aria-label={`Precio unitario de ${i?.nombre}`}
                  value={l.precio_unitario} readOnly={readOnly}
                  onChange={(e) => cambiar(idx, 'precio_unitario', e.target.value)}
                />
                {!readOnly ? (
                  <button type="button" className="icon-btn is-delete" onClick={() => quitar(idx)} aria-label={`Quitar ${i?.nombre}`} title="Quitar">
                    <Icon name="trash" size={15} />
                  </button>
                ) : <span />}
              </div>
            );
          })}
        </div>
        {error
          ? <span className="field-error"><Icon name="alert" size={12} /> {error}</span>
          : <span className="caption">Edite la cantidad (admite decimales) y el precio de cada insumo directamente en su línea.</span>}
      </div>
    </div>
  );
}

/** Desglose del total en vivo: cada insumo con su cantidad, unidad, precio y subtotal. */
export function DesglosePedido({ lineas = [], children }) {
  const { db } = useData();
  const insumo = (id) => db.insumos.find((i) => String(i.id) === String(id));
  const total = Math.round(lineas.reduce((s, l) => s + subtotal(l), 0) * 100) / 100;

  return (
    <div className="field full">
      <label>Desglose del precio</label>
      <div className="pedido-total desglose">
        {lineas.length === 0 && <div className="linea"><span className="caption">Agregue insumos para calcular el total.</span></div>}
        {lineas.map((l) => {
          const i = insumo(l.id_insumo);
          return (
            <div className="linea" key={l.id_insumo}>
              <span>
                {i?.nombre || `#${l.id_insumo}`}
                <span className="caption">{Number(l.cantidad || 0)} {unidadDe(i)} × {money(l.precio_unitario || 0)}</span>
              </span>
              <strong className="money">{money(subtotal(l))}</strong>
            </div>
          );
        })}
        <div className="is-total"><span>Total</span><strong className="money">{money(total)}</strong></div>
        {children}
      </div>
    </div>
  );
}
