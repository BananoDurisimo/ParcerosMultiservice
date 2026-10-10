import { useState } from 'react';
import Icon from '@shared/components/Icon.jsx';
import { normTexto } from '@shared/components/ui/Form.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money } from '@shared/data/mock.js';

const unidadDe = (i) => i?.calc_abreviatura || i?.calc_unidad || '';
const cantidadValida = (l) => l.cantidad !== '' && Number(l.cantidad) > 0;

/** Costo de la receta con el precio actual de cada insumo. */
export const costoReceta = (receta = [], insumos = []) =>
  Math.round(receta.reduce((s, l) => {
    const i = insumos.find((x) => String(x.id) === String(l.id_insumo));
    return s + Number(l.cantidad || 0) * Number(i?.precio_unitario || 0);
  }, 0) * 100) / 100;

/**
 * Receta del producto (tabla receta_producto): los insumos que gasta UNA
 * unidad. Arriba el catalogo de insumos con su buscador; abajo los insumos
 * agregados con la cantidad por unidad. La tela del producto se agrega sola
 * al elegirla y no se puede quitar de la receta mientras sea su tela.
 */
export default function RecetaProducto({ value = [], onChange, error, idTela, readOnly }) {
  const { db } = useData();
  const [q, setQ] = useState('');

  const texto = normTexto(q.trim());
  const catalogo = db.insumos.filter((i) => !texto || normTexto(`${i.nombre} ${i.calc_tipo} ${i.calc_unidad}`).includes(texto));
  const insumo = (id) => db.insumos.find((i) => String(i.id) === String(id));
  const agregado = (id) => value.some((l) => String(l.id_insumo) === String(id));

  const agregar = (i) => onChange([...value, { id_insumo: i.id, cantidad: '' }]);
  const cambiar = (idx, v) => onChange(value.map((l, j) => (j === idx ? { ...l, cantidad: v } : l)));
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
                  className="input" value={q} aria-label="Buscar insumo"
                  placeholder="Buscar insumo por nombre, tipo o unidad…"
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
                      <div className="caption">{i.calc_tipo} · {money(i.precio_unitario)} / {unidadDe(i)}</div>
                    </div>
                    <button
                      type="button" className={`btn btn-sm ${ya ? '' : 'btn-primary'}`} disabled={baja || ya} onClick={() => agregar(i)}
                      title={baja ? 'Insumo inactivo' : ya ? 'Ya está en la receta: edite su cantidad abajo' : 'Agregar a la receta'}
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
        <label>Receta: insumos por unidad {!readOnly && <span className="req">*</span>}</label>
        <div className="ins-agregados">
          <div className="ins-linea head receta">
            <span>Insumo</span><span>Cantidad por unidad</span><span className="right">Costo</span><span />
          </div>
          {value.length === 0 && (
            <div className="caption" style={{ padding: '14px 12px' }}>Elija la tela del producto o agregue insumos desde el catálogo.</div>
          )}
          {value.map((l, idx) => {
            const i = insumo(l.id_insumo);
            const esTela = String(l.id_insumo) === String(idTela);
            return (
              <div className="ins-linea receta" key={l.id_insumo}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {i?.nombre || `#${l.id_insumo}`} {esTela && <span className="badge badge-info" style={{ marginLeft: 4 }}>Tela</span>}
                  </div>
                  <div className="caption">{i?.calc_tipo} · {money(i?.precio_unitario)} / {unidadDe(i)}</div>
                </div>
                <div className="input-unidad">
                  <input
                    className={`input ${cantidadValida(l) ? '' : 'has-error'}`}
                    type="number" min="0" step="any" placeholder="Ej.: 1.2" aria-label={`Cantidad de ${i?.nombre} por unidad`}
                    value={l.cantidad} readOnly={readOnly}
                    onChange={(e) => cambiar(idx, e.target.value)}
                  />
                  <span className="unidad">{unidadDe(i)}</span>
                </div>
                <span className="money right" style={{ fontSize: 13 }}>{money(Number(l.cantidad || 0) * Number(i?.precio_unitario || 0))}</span>
                {!readOnly && !esTela ? (
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
          : <span className="caption">Indique cuánto se gasta para hacer UNA unidad (admite decimales). Al pedir 10 unidades el sistema multiplica por 10.</span>}
      </div>
    </div>
  );
}
