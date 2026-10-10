import { useState, useMemo, useEffect, useRef } from 'react';
import Icon from '@shared/components/Icon.jsx';
import Pagination from './Pagination.jsx';
import { normOpciones, normTexto } from './Form.jsx';

/**
 * Tabla estandar del sistema: busqueda, filtros, orden, paginacion,
 * acciones por fila (punto 1) y version movil en lista.
 * Las acciones de cada fila son ver detalle, editar, las propias del modulo
 * y eliminar (siempre al final, para no pulsarla por error).
 *
 * Un filtro es un desplegable `{ key, label, options }` o un rango de fechas
 * `{ key, label, type: 'rango' }` (desde / hasta).
 *
 * `onExportar(formato, filas, filtros)`: muestra «Exportar» (PDF o Excel) y
 * «Reporte». Recibe las filas que la tabla tiene en ese momento -con la
 * busqueda, los filtros y el orden aplicados, de todas las paginas- y la
 * descripcion de lo aplicado ([['Estado', 'Recibida'], …]).
 */
export default function DataTable({
  columns,
  rows,
  searchKeys = [],
  filters = [],
  entidad = 'registros',
  pageSize = 8,
  compacta = false,
  onCreate,
  createLabel = 'Agregar',
  onView,
  onEdit,
  /* Eliminar: el modulo pide la confirmacion antes de borrar. */
  onDelete,
  /* Si la fila admite edicion (p. ej. una compra anulada no). */
  puedeEditarFila = () => true,
  /* Botones propios del modulo junto a "Ver detalle" y "Editar". */
  accionesExtra,
  onExportar,
  emptyText = 'No hay registros que coincidan con la búsqueda.',
}) {
  const [q, setQ] = useState('');
  const [fv, setFv] = useState({});
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);
  const [openFilters, setOpenFilters] = useState(false);
  const [menuExportar, setMenuExportar] = useState(false);
  const refExportar = useRef(null);

  /* Un clic fuera cierra el menu de exportacion. */
  useEffect(() => {
    if (!menuExportar) return undefined;
    const fuera = (e) => { if (!refExportar.current?.contains(e.target)) setMenuExportar(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [menuExportar]);

  /* Un rango con la fecha final antes de la inicial no se aplica. */
  const rangoInvalido = (v) => !!v?.desde && !!v?.hasta && v.hasta < v.desde;

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim()) {
      /* Sin distinguir mayusculas ni tildes: «cotizacion» encuentra «Cotización». */
      const t = normTexto(q.trim());
      out = out.filter((r) =>
        (searchKeys.length ? searchKeys : Object.keys(r)).some((k) => normTexto(r[k]).includes(t))
      );
    }
    filters.forEach((f) => {
      const v = fv[f.key];
      if (!v) return;
      if (f.type === 'rango') {
        if (rangoInvalido(v)) return;
        if (v.desde) out = out.filter((r) => !!r[f.key] && r[f.key] >= v.desde);
        if (v.hasta) out = out.filter((r) => !!r[f.key] && r[f.key] <= v.hasta);
        return;
      }
      /* Un filtro compara contra el valor de la columna, salvo cuando la fila
         guarda una lista -los insumos de una compra, por ejemplo-: ahi basta
         con que uno de sus elementos coincida. */
      out = out.filter((r) =>
        Array.isArray(r[f.key]) ? r[f.key].some((x) => String(x) === v) : String(r[f.key]) === v
      );
    });
    if (sort.key) {
      out = [...out].sort((a, b) => {
        const A = a[sort.key], B = b[sort.key];
        const n = typeof A === 'number' && typeof B === 'number' ? A - B : String(A).localeCompare(String(B), 'es');
        return sort.dir === 'asc' ? n : -n;
      });
    }
    return out;
  }, [rows, q, fv, sort, searchKeys, filters]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { setPage(1); }, [q, fv, rows.length]);
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * pageSize, current * pageSize);

  const activos = Object.values(fv).filter((v) => (typeof v === 'object' ? v.desde || v.hasta : v)).length;

  /** Lo aplicado en la tabla, en palabras, para el encabezado de lo exportado. */
  const descripcionFiltros = () => {
    const out = [];
    if (q.trim()) out.push(['Búsqueda', `«${q.trim()}»`]);
    filters.forEach((f) => {
      const v = fv[f.key];
      if (!v) return;
      if (f.type === 'rango') {
        if (rangoInvalido(v) || (!v.desde && !v.hasta)) return;
        const d = (iso) => iso.split('-').reverse().join('/');
        out.push([f.label, v.desde && v.hasta ? `${d(v.desde)} a ${d(v.hasta)}` : v.desde ? `desde ${d(v.desde)}` : `hasta ${d(v.hasta)}`]);
        return;
      }
      out.push([f.label, normOpciones(f.options).find((o) => String(o.value) === v)?.label ?? v]);
    });
    return out;
  };
  const exportar = (formato) => { setMenuExportar(false); onExportar(formato, filtered, descripcionFiltros()); };

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const mTitle = columns.find((c) => c.mobile === 'title') || columns[0];
  const mMeta  = columns.filter((c) => c.mobile === 'meta');
  const mValue = columns.find((c) => c.mobile === 'value');

  const hayAcciones = !!(onView || onEdit || onDelete || accionesExtra);
  const acciones = (r) => (
    <>
      {onView && <button className="icon-btn is-view" onClick={() => onView(r)} title="Ver detalle"><Icon name="eye" size={16} /></button>}
      {onEdit && puedeEditarFila(r) && <button className="icon-btn is-edit" onClick={() => onEdit(r)} title="Editar"><Icon name="edit" size={16} /></button>}
      {accionesExtra && accionesExtra(r)}
      {onDelete && <button className="icon-btn is-delete" onClick={() => onDelete(r)} title="Eliminar"><Icon name="trash" size={16} /></button>}
    </>
  );

  return (
    <div className="card">
      <div className="toolbar">
        <div className="search-wrap">
          <span className="ico"><Icon name="search" size={16} /></span>
          <input className="input" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        </div>

        {filters.length > 0 && (
          <button className={`btn btn-sm ${activos ? 'btn-info' : ''}`} onClick={() => setOpenFilters((v) => !v)}>
            <Icon name="filter" size={15} /> Filtrar {activos > 0 && <span className="badge badge-primary" style={{ padding: '0 6px' }}>{activos}</span>}
          </button>
        )}

        <div className="grow" />

        {onExportar && (
          <>
            <div className="dropdown" ref={refExportar}>
              <button className="btn btn-sm" onClick={() => setMenuExportar((v) => !v)} aria-haspopup="menu" aria-expanded={menuExportar} title="Descargar lo que muestra la tabla">
                <Icon name="download" size={15} /> Exportar <Icon name="chevD" size={13} />
              </button>
              {menuExportar && (
                <div className="dropdown-menu" role="menu">
                  <div className="caption" style={{ padding: '6px 11px 8px' }}>
                    {filtered.length} {entidad}{activos || q.trim() ? ' (con los filtros aplicados)' : ''}
                  </div>
                  <button className="dropdown-item" role="menuitem" onClick={() => exportar('pdf')}><Icon name="receipt" size={16} /> Exportar a PDF</button>
                  <button className="dropdown-item" role="menuitem" onClick={() => exportar('excel')}><Icon name="chart" size={16} /> Exportar a Excel</button>
                </div>
              )}
            </div>
            <button className="btn btn-sm btn-info" onClick={() => exportar('reporte')} title="Reporte en PDF con indicadores, resumen y detalle">
              <Icon name="chart" size={15} /> Reporte
            </button>
          </>
        )}

        {onCreate && (
          <button className="btn btn-primary btn-sm" onClick={onCreate}>
            <Icon name="plus" size={16} /> {createLabel}
          </button>
        )}
      </div>

      {openFilters && filters.length > 0 && (
        <div className="toolbar anim-in" style={{ background: 'var(--surface-2)' }}>
          {filters.map((f) => f.type === 'rango' ? (
            <div className="field" key={f.key} style={{ minWidth: 290 }}>
              <label style={{ fontSize: 11.5 }}>{f.label}</label>
              <div className="row" style={{ gap: 6 }}>
                <input
                  className="input" type="date" style={{ minHeight: 34 }} aria-label={`${f.label}: desde`}
                  value={fv[f.key]?.desde || ''}
                  onChange={(e) => setFv({ ...fv, [f.key]: { ...fv[f.key], desde: e.target.value } })}
                />
                <span className="caption">a</span>
                <input
                  className={`input ${rangoInvalido(fv[f.key]) ? 'has-error' : ''}`} type="date" style={{ minHeight: 34 }} aria-label={`${f.label}: hasta`}
                  value={fv[f.key]?.hasta || ''}
                  onChange={(e) => setFv({ ...fv, [f.key]: { ...fv[f.key], hasta: e.target.value } })}
                />
              </div>
              {rangoInvalido(fv[f.key]) && (
                <span className="field-error"><Icon name="alert" size={12} /> La fecha final no puede ser anterior a la inicial.</span>
              )}
            </div>
          ) : (
            <div className="field" key={f.key} style={{ minWidth: 170 }}>
              <label style={{ fontSize: 11.5 }}>{f.label}</label>
              <select className="select" style={{ minHeight: 34 }} value={fv[f.key] || ''} onChange={(e) => setFv({ ...fv, [f.key]: e.target.value })}>
                <option value="">Todos</option>
                {normOpciones(f.options).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
          <div className="grow" />
          <button className="btn btn-sm btn-ghost" onClick={() => setFv({})}><Icon name="refresh" size={15} /> Limpiar</button>
        </div>
      )}

      {slice.length === 0 ? (
        <div className="empty">
          <div className="ico-wrap"><Icon name="search" size={22} /></div>
          <div style={{ fontWeight: 500, color: 'var(--text)' }}>{rows.length ? 'Sin resultados' : `Aún no hay ${entidad}`}</div>
          <p className="caption" style={{ marginTop: 4 }}>
            {rows.length ? emptyText : onCreate ? `Registre el primero con el botón «${createLabel}».` : 'Cuando se registren aparecerán aquí.'}
          </p>
          {!rows.length && onCreate && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={onCreate}>
              <Icon name="plus" size={16} /> {createLabel}
            </button>
          )}
          {rows.length > 0 && (q.trim() || activos > 0) && (
            <button className="btn btn-sm btn-ghost" style={{ marginTop: 12 }} onClick={() => { setQ(''); setFv({}); }}>
              <Icon name="refresh" size={15} /> Limpiar búsqueda y filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {/* --- Vista escritorio --- */}
          <div className="table-scroll">
            <table className={`tbl ${compacta ? 'tbl-compacta' : ''}`}>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={c.sortable !== false ? 'sortable' : ''}
                      style={{ textAlign: c.align || 'left' }}
                      onClick={() => c.sortable !== false && toggleSort(c.key)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {c.label}
                        {sort.key === c.key && <Icon name={sort.dir === 'asc' ? 'chevU' : 'chevD'} size={12} />}
                      </span>
                    </th>
                  ))}
                  {hayAcciones && <th style={{ textAlign: 'right' }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {slice.map((r, i) => (
                  <tr key={r.id} style={{ animationDelay: i * 25 + 'ms' }}>
                    {columns.map((c) => (
                      <td key={c.key} style={{ textAlign: c.align || 'left' }}>
                        {c.render ? c.render(r) : r[c.key]}
                      </td>
                    ))}
                    {hayAcciones && <td><div className="cell-actions">{acciones(r)}</div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- Vista movil --- */}
          <div className={`mlist ${compacta ? 'tbl-compacta' : ''}`}>
            {slice.map((r, i) => (
              <div className="mrow" key={r.id} style={{ animationDelay: i * 30 + 'ms' }}>
                <div className="m-body">
                  <div className="m-title">{mTitle.render ? mTitle.render(r) : r[mTitle.key]}</div>
                  <div className="m-meta">
                    {mMeta.map((c) => (
                      <span key={c.key}>{c.render ? c.render(r) : r[c.key]}</span>
                    ))}
                  </div>
                </div>
                {mValue && <div style={{ textAlign: 'right' }}>{mValue.render ? mValue.render(r) : r[mValue.key]}</div>}
                {hayAcciones && <div className="cell-actions">{acciones(r)}</div>}
              </div>
            ))}
          </div>

          <Pagination
            page={current}
            pages={pages}
            total={filtered.length}
            from={(current - 1) * pageSize + 1}
            to={Math.min(current * pageSize, filtered.length)}
            entidad={entidad}
            onChange={(p) => setPage(Math.min(Math.max(1, p), pages))}
          />
        </>
      )}
    </div>
  );
}
