import Icon from '@shared/components/Icon.jsx';

/** Punto 3 de la guia: barra de navegacion en listados. */
export default function Pagination({ page, pages, total, from, to, entidad = 'registros', onChange }) {
  const nums = [];
  const start = Math.max(1, Math.min(page - 1, pages - 2));
  for (let i = start; i <= Math.min(pages, start + 2); i++) nums.push(i);

  return (
    <div className="pagination">
      <span className="caption">
        Mostrando <strong>{total === 0 ? 0 : from}-{to}</strong> de <strong>{total}</strong> {entidad}
      </span>
      <div className="pager">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Página anterior">
          <Icon name="chevL" size={14} />
        </button>
        {start > 1 && <span className="caption" style={{ padding: '0 2px' }}>…</span>}
        {nums.map((n) => (
          <button key={n} className={n === page ? 'active' : ''} onClick={() => onChange(n)}>{n}</button>
        ))}
        {start + 2 < pages && <span className="caption" style={{ padding: '0 2px' }}>…</span>}
        <button onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Página siguiente">
          <Icon name="chevR" size={14} />
        </button>
      </div>
    </div>
  );
}
