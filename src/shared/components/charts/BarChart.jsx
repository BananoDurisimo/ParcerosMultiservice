import { useState } from 'react';

/** Barras: comparar cantidades discretas entre categorias. */
export default function BarChart({ data = [], height = 220, color = 'var(--success)' }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...data.map((d) => d.v), 1);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height, padding: '10px 2px 0' }}>
        {data.map((d, i) => (
          <div
            key={i}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end', cursor: 'default' }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span style={{ fontSize: 12, fontWeight: 600, opacity: hover === i ? 1 : .75, transition: 'opacity .2s' }}>{d.v}</span>
            <div
              title={`${d.l}: ${d.v}`}
              style={{
                width: '100%', maxWidth: 46,
                height: `${(d.v / max) * 100}%`,
                minHeight: 4,
                background: d.color || color,
                borderRadius: '7px 7px 3px 3px',
                transformOrigin: 'bottom',
                animation: `growBar .75s var(--ease) ${i * 0.07}s both`,
                filter: hover === i ? 'brightness(1.12)' : 'none',
                transition: 'filter .2s',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, color: 'var(--text-sec)', lineHeight: 1.25 }}>{d.l}</div>
        ))}
      </div>
    </div>
  );
}
