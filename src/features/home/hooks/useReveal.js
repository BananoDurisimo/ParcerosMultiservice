import { useEffect } from 'react';

/**
 * Anima la entrada de los elementos `.reveal` la primera vez que aparecen en
 * pantalla. El retraso de cada uno se controla con la variable CSS `--d`.
 * Con movimiento reducido el CSS los deja visibles desde el inicio.
 */
export default function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) =>
        entradas.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          obs.unobserve(e.target);
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}
