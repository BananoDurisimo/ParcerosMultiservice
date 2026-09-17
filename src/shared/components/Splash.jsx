import { useEffect } from 'react';

const MIN_MS = 1500;   // tiempo minimo visible
const SALIDA_MS = 520; // debe coincidir con la transicion de #pm-splash

/**
 * Pantalla de bienvenida (splash).
 *
 * El contenido se pinta desde `index.html`, antes de que cargue React, para
 * que no se vea la pantalla en blanco. Este componente solo se encarga de
 * retirarla cuando la aplicacion ya esta montada, respetando un tiempo
 * minimo para que la marca alcance a leerse.
 */
export default function Splash({ min = MIN_MS }) {
  useEffect(() => {
    const el = document.getElementById('pm-splash');
    if (!el) return undefined;

    const inicio = window.__pmSplash || Date.now();
    const restante = Math.max(0, min - (Date.now() - inicio));
    let quitar;

    const salir = setTimeout(() => {
      el.classList.add('is-out');
      quitar = setTimeout(() => el.remove(), SALIDA_MS);
    }, restante);

    return () => { clearTimeout(salir); clearTimeout(quitar); };
  }, [min]);

  return null;
}
