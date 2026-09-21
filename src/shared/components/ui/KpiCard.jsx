import { useEffect, useState } from 'react';
import Icon from '@shared/components/Icon.jsx';

/**
 * Tarjeta de KPI (punto 12) con contador animado.
 *
 * Cuando el indicador no es una cifra sino un nombre (por ejemplo el producto
 * mas vendido) se pasa `texto` en lugar de `value`, y `nota` para la linea de
 * apoyo que va debajo.
 */
export default function KpiCard({ label, value, texto, nota, prefix = '', suffix = '', trend, trendLabel, icon, tono = 'primary', decimals = 0 }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const dur = 900, t0 = performance.now();
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      setN(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const colores = {
    primary: ['var(--primary-soft)', 'var(--primary)'],
    success: ['var(--success-bg)', 'var(--success-fg)'],
    warning: ['var(--warning-bg)', 'var(--warning-fg)'],
    error:   ['var(--error-bg)', 'var(--error-fg)'],
    info:    ['var(--info-bg)', 'var(--info-fg)'],
  }[tono];

  return (
    <div className="card card-hover kpi">
      <div className="k-label">{label}</div>
      {texto !== undefined ? (
        <div className="k-value is-text" title={texto}>{texto}</div>
      ) : (
        <div className="k-value">
          {prefix}{n.toLocaleString('es-NI', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
        </div>
      )}
      {nota && <div className="k-nota">{nota}</div>}
      {trend !== undefined && (
        <div className={`k-trend ${trend >= 0 ? 'up' : 'down'}`}>
          <Icon name={trend >= 0 ? 'arrowUp' : 'arrowDn'} size={13} />
          {Math.abs(trend)}% <span className="muted" style={{ fontWeight: 400 }}>{trendLabel || 'vs. mes anterior'}</span>
        </div>
      )}
      {icon && (
        <div className="k-ico" style={{ background: colores[0], color: colores[1] }}>
          <Icon name={icon} size={18} />
        </div>
      )}
    </div>
  );
}
