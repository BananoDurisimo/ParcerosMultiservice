import { useState, useId } from 'react';
import { shortMoney, money } from '@shared/data/mock.js';

/** Linea de area: tendencia de un valor numerico en el tiempo. */
export default function AreaChart({ series = [], height = 220 }) {
  const uid = useId().replace(/:/g, '');
  const [hover, setHover] = useState(null);
  const W = 620, H = height, pad = { t: 14, r: 12, b: 26, l: 46 };
  const pts = series[0]?.data || [];
  if (!pts.length) return null;

  const max = Math.max(...series.flatMap((s) => s.data.map((d) => d.v))) * 1.15 || 1;
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const x = (i) => pad.l + (pts.length === 1 ? iw / 2 : (i * iw) / (pts.length - 1));
  const y = (v) => pad.t + ih - (v / max) * ih;

  const gridY = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} role="img" aria-label="Gráfico de línea de área">
        <defs>
          {series.map((s, si) => (
            <linearGradient key={si} id={`g-${uid}-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {gridY.map((g, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih * g} y2={pad.t + ih * g} stroke="var(--border-soft)" strokeWidth="1" />
            <text x={pad.l - 8} y={pad.t + ih * g + 4} textAnchor="end" fontSize="10" fill="var(--text-sec)">
              {shortMoney(max * (1 - g))}
            </text>
          </g>
        ))}

        {series.map((s, si) => {
          const line = s.data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.v)}`).join(' ');
          const area = `${line} L${x(s.data.length - 1)},${pad.t + ih} L${x(0)},${pad.t + ih} Z`;
          return (
            <g key={si}>
              <path d={area} fill={`url(#g-${uid}-${si})`} style={{ animation: 'fadeIn .9s .35s var(--ease) both' }} />
              <path
                d={line}
                fill="none"
                stroke={s.color}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ strokeDasharray: 2200, strokeDashoffset: 2200, animation: 'drawLine 1.25s var(--ease) forwards' }}
              />
              {s.data.map((d, i) => (
                <circle
                  key={i}
                  cx={x(i)}
                  cy={y(d.v)}
                  r={hover === i ? 5 : 3}
                  fill="var(--surface)"
                  stroke={s.color}
                  strokeWidth="2.2"
                  style={{ animation: 'fadeIn .3s ' + (0.8 + i * 0.05) + 's both', transition: 'r .15s' }}
                />
              ))}
            </g>
          );
        })}

        {pts.map((d, i) => (
          <g key={i}>
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--text-sec)">{d.l}</text>
            <rect
              x={x(i) - iw / pts.length / 2} y={pad.t} width={iw / pts.length} height={ih}
              fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--border)" strokeDasharray="4 4" />}
      </svg>

      {hover !== null && (
        <div className="card" style={{ position: 'absolute', top: 6, left: `${(x(hover) / W) * 100}%`, transform: 'translateX(-50%)', padding: '8px 11px', pointerEvents: 'none', boxShadow: 'var(--shadow-lg)', minWidth: 132, zIndex: 3 }}>
          <div className="caption" style={{ fontWeight: 600, color: 'var(--text)' }}>{pts[hover].l}</div>
          {series.map((s, si) => (
            <div key={si} className="row" style={{ gap: 6, fontSize: 12 }}>
              <i style={{ width: 8, height: 8, borderRadius: 99, background: s.color, flex: 'none' }} />
              <span className="muted">{s.name}</span>
              <span className="grow" />
              <strong>{money(s.data[hover].v)}</strong>
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ gap: 16, justifyContent: 'center', marginTop: 6 }}>
        {series.map((s, i) => (
          <span key={i} className="caption row" style={{ gap: 6 }}>
            <i style={{ width: 9, height: 9, borderRadius: 99, background: s.color }} /> {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
