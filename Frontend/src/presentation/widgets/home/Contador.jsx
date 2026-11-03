import { useEffect, useRef, useState } from 'react';

/** Cifra que cuenta desde cero la primera vez que entra en pantalla. */
export default function Contador({ valor, prefijo = '', sufijo = '', etiqueta }) {
  const ref = useRef(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(valor);
      return undefined;
    }
    let raf;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now();
      const paso = (t) => {
        const p = Math.min(1, (t - t0) / 1200);
        setN(Math.round(valor * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(paso);
      };
      raf = requestAnimationFrame(paso);
    }, { threshold: 0.5 });
    obs.observe(ref.current);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [valor]);

  return (
    <div className="lp-stat" ref={ref}>
      <strong>{prefijo}{n}{sufijo}</strong>
      <span>{etiqueta}</span>
    </div>
  );
}
