import { useState } from 'react';
import { shortMoney } from '@shared/data/mock.js';

/** Dona: proporcion de un total dividido en pocas categorias (max 5-6). */
export default function DonutChart({ data = [], size = 190, thickness = 22 }) {
  const [hover, setHover] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="row" style={{ gap: 22, flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} role="img" aria-label="Gráfico de dona">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = `${c * frac} ${c * (1 - frac)}`;
            const off = -c * acc;
            acc += frac;
            return (
              <circle
                key={i}
                cx={size / 2} cy={size / 2} r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={hover === i ? thickness + 5 : thickness}
                strokeDasharray={dash}
                strokeDashoffset={off}
                style={{ transition: 'stroke-width .2s', animation: `fadeIn .55s ${i * 0.1}s both`, cursor: 'default' }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <div className="caption">{hover === null ? 'Total' : data[hover].label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.5px' }}>
              {shortMoney(hover === null ? total : data[hover].value)}
            </div>
            {hover !== null && <div className="caption">{Math.round((data[hover].value / total) * 100)}%</div>}
          </div>
        </div>
      </div>

      <div className="stack" style={{ gap: 9, minWidth: 168 }}>
        {data.map((d, i) => (
          <div
            key={i}
            className="row"
            style={{ fontSize: 12.5, opacity: hover === null || hover === i ? 1 : .5, transition: 'opacity .2s' }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <i style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flex: 'none' }} />
            <span className="grow">{d.label}</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round((d.value / total) * 100)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
