import { useState } from 'react';

/**
 * Barras horizontales: comparar un ranking de pocas categorias cuando las
 * etiquetas son largas (nombres de producto, de insumo o de cliente) y no
 * caben debajo de una barra vertical.
 *
 * data:    [{ l, v, nota?, color? }]
 * formato: como se escribe el valor a la derecha (money, unidades, etc.)
 * umbral:  si se indica, dibuja la linea de referencia (p. ej. stock minimo)
 */
export default function HBarChart({
  data = [],
  color = 'var(--primary)',
  formato = (v) => v,
  umbral,
  etiquetaUmbral = 'Mínimo',
  vacio = 'No hay datos en el período seleccionado.',
}) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...data.map((d) => d.v), umbral || 0, 1);

  if (!data.length) {
    return <p className="caption" style={{ padding: '26px 0', textAlign: 'center' }}>{vacio}</p>;
  }

  return (
    <div className="hbar">
      {data.map((d, i) => (
        <div
          key={d.l + i}
          className="hbar-row"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          style={{ opacity: hover === null || hover === i ? 1 : 0.6 }}
        >
          <div className="hbar-label" title={d.l}>
            {d.l}
            {d.nota && <span className="caption"> · {d.nota}</span>}
          </div>
          <div className="hbar-track">
            <i
              style={{
                width: `${Math.max((d.v / max) * 100, d.v > 0 ? 3 : 0)}%`,
                background: d.color || color,
                animationDelay: `${i * 0.08}s`,
              }}
            />
            {umbral !== undefined && (
              <span className="hbar-umbral" style={{ left: `${(umbral / max) * 100}%` }} title={`${etiquetaUmbral}: ${umbral}`} />
            )}
          </div>
          <strong className="hbar-value">{formato(d.v)}</strong>
        </div>
      ))}

      {umbral !== undefined && (
        <p className="caption" style={{ marginTop: 10, textAlign: 'right' }}>
          <i className="hbar-umbral-key" /> {etiquetaUmbral}: {umbral}
        </p>
      )}
    </div>
  );
}
