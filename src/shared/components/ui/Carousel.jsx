import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '@shared/components/Icon.jsx';

/**
 * Carrusel reutilizable: avance automatico, flechas, indicadores,
 * arrastre tactil y soporte para mostrar varias tarjetas a la vez.
 */
export default function Carousel({
  items,
  render,
  perView = 1,
  perViewSm = 1,
  auto = 5500,
  className = '',
  ariaLabel = 'Carrusel',
}) {
  const [pv, setPv] = useState(perView);
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(false);
  const drag = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 780px)');
    const aplicar = () => setPv(mq.matches ? perViewSm : perView);
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, [perView, perViewSm]);

  const max = Math.max(0, items.length - pv);
  useEffect(() => { setI((v) => Math.min(v, max)); }, [max]);

  const ir = useCallback((n) => setI(n < 0 ? max : n > max ? 0 : n), [max]);

  useEffect(() => {
    if (!auto || pausa || max === 0) return undefined;
    const t = setTimeout(() => ir(i + 1), auto);
    return () => clearTimeout(t);
  }, [auto, pausa, i, max, ir]);

  const inicioDrag = (x) => { drag.current = x; };
  const finDrag = (x) => {
    if (drag.current == null) return;
    const d = x - drag.current;
    drag.current = null;
    if (Math.abs(d) > 45) ir(i + (d < 0 ? 1 : -1));
  };

  return (
    <div
      className={`carousel ${className}`}
      role="region"
      aria-label={ariaLabel}
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
      onFocus={() => setPausa(true)}
      onBlur={() => setPausa(false)}
      onTouchStart={(e) => inicioDrag(e.touches[0].clientX)}
      onTouchEnd={(e) => finDrag(e.changedTouches[0].clientX)}
    >
      <div className="c-viewport">
        <div className="c-track" style={{ transform: `translateX(-${i * (100 / pv)}%)` }}>
          {items.map((it, n) => (
            <div className="c-slide" key={it.id ?? n} style={{ flexBasis: `${100 / pv}%` }} aria-hidden={n < i || n >= i + pv}>
              {render(it, n)}
            </div>
          ))}
        </div>
      </div>

      {max > 0 && (
        <>
          <button className="c-arrow prev" onClick={() => ir(i - 1)} aria-label="Anterior">
            <Icon name="chevL" size={18} />
          </button>
          <button className="c-arrow next" onClick={() => ir(i + 1)} aria-label="Siguiente">
            <Icon name="chevR" size={18} />
          </button>
          <div className="c-dots">
            {Array.from({ length: max + 1 }).map((_, n) => (
              <button
                key={n}
                className={`c-dot ${n === i ? 'on' : ''}`}
                onClick={() => ir(n)}
                aria-label={`Ir a la posición ${n + 1}`}
                aria-current={n === i}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
