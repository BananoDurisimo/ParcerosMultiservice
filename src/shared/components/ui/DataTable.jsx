import { useState, useMemo, useEffect } from 'react';
import Icon from '@shared/components/Icon.jsx';
import Pagination from './Pagination.jsx';
import { normOpciones } from './Form.jsx';

/**
 * Tabla estandar del sistema: busqueda, filtros, orden, paginacion,
 * acciones CRUD (punto 1) y version movil en lista.
 */
export default function DataTable({
  columns,
  rows,
  searchKeys = [],
  filters = [],
  entidad = 'registros',
  pageSize = 8,
  onCreate,
  createLabel = 'Agregar',
  onView,
  onEdit,
  onDelete,
  onExport,
  emptyText = 'No hay registros que coincidan con la búsqueda.',
}) {
  const [q, setQ] = useState('');
  const [fv, setFv] = useState({});
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);
  const [openFilters, setOpenFilters] = useState(false);

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim()) {
      const t = q.toLowerCase();
      out = out.filter((r) =>
        (searchKeys.length ? searchKeys : Object.keys(r)).some((k) => String(r[k] ?? '').toLowerCase().includes(t))
      );
    }
    Object.entries(fv).forEach(([k, v]) => {
      if (v) out = out.filter((r) => String(r[k]) === v);
    });
    if (sort.key) {
      out = [...out].sort((a, b) => {
        const A = a[sort.key], B = b[sort.key];
        const n = typeof A === 'number' && typeof B === 'number' ? A - B : String(A).localeCompare(String(B), 'es');
        return sort.dir === 'asc' ? n : -n;
      });
    }
    return out;
  }, [rows, q, fv, sort, searchKeys]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { setPage(1); }, [q, fv, rows.length]);
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * pageSize, current * pageSize);

  const activos = Object.values(fv).filter(Boolean).length;

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const mTitle = columns.find((c) => c.mobile === 'title') || columns[0];
  const mMeta  = columns.filter((c) => c.mobile === 'meta');
  const mValue = columns.find((c) => c.mobile === 'value');

  const acciones = (r) => (
    <>
      {onView && <button className="icon-btn is-view" onClick={() => onView(r)} title="Ver detalle"><Icon name="eye" size={16} /></button>}
      {onEdit && <button className="icon-btn is-edit" onClick={() => onEdit(r)} title="Editar"><Icon name="edit" size={16} /></button>}
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

        {onExport && (
          <button className="btn btn-sm" onClick={onExport} title="Exportar listado">
            <Icon name="download" size={15} /> Exportar
          </button>
        )}
        {onCreate && (
          <button className="btn btn-primary btn-sm" onClick={onCreate}>
            <Icon name="plus" size={16} /> {createLabel}
          </button>
        )}
      </div>

      {openFilters && filters.length > 0 && (
        <div className="toolbar anim-in" style={{ background: 'var(--surface-2)' }}>
          {filters.map((f) => (
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
          <div style={{ fontWeight: 500, color: 'var(--text)' }}>Sin resultados</div>
          <p className="caption" style={{ marginTop: 4 }}>{emptyText}</p>
        </div>
      ) : (
        <>
          {/* --- Vista escritorio --- */}
          <div className="table-scroll">
            <table className="tbl">
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
                  {(onView || onEdit || onDelete) && <th style={{ textAlign: 'right' }}>Acciones</th>}
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
                    {(onView || onEdit || onDelete) && <td><div className="cell-actions">{acciones(r)}</div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* --- Vista movil --- */}
          <div className="mlist">
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
                <div className="cell-actions">{acciones(r)}</div>
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
