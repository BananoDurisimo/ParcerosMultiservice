import { useEffect, useRef, useState } from 'react';
import Icon from '@shared/components/Icon.jsx';
import video from '@features/home/assets/taller-video.mp4';

/**
 * Video vertical del taller (360x640, H.264, ~700 KB).
 *
 * Optimizacion:
 * - `preload="metadata"`: solo descarga el encabezado hasta que se reproduce.
 * - `#t=0.1`: el navegador usa ese cuadro como portada, sin archivo extra.
 * - Se reproduce solo mientras esta en pantalla y la pestaña esta visible.
 * - No arranca solo si el usuario pide menos movimiento o ahorro de datos.
 */
export default function HeroVideo() {
  const ref = useRef(null);
  const visible = useRef(false);
  const detenido = useRef(false); // pausa pedida por el usuario (o por sus preferencias)
  const [enPausa, setEnPausa] = useState(true);

  const sincronizar = () => {
    const v = ref.current;
    if (!v) return;
    if (visible.current && !document.hidden && !detenido.current) v.play().catch(() => {});
    else v.pause();
  };

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData) {
      detenido.current = true;
    }
    const obs = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      sincronizar();
    }, { threshold: 0.25 });
    obs.observe(ref.current);
    document.addEventListener('visibilitychange', sincronizar);
    return () => {
      obs.disconnect();
      document.removeEventListener('visibilitychange', sincronizar);
    };
  }, []);

  const alternar = () => {
    detenido.current = !enPausa;
    sincronizar();
  };

  return (
    <figure className="lp-video">
      <video
        ref={ref}
        src={`${video}#t=0.1`}
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        onPlay={() => setEnPausa(false)}
        onPause={() => setEnPausa(true)}
        aria-label="Video del taller de Parceros Multiservice"
      />
      <figcaption className="lp-video-tag"><Icon name="sparkle" size={13} /> Hecho en Nicaragua</figcaption>
      <button type="button" className="lp-video-btn" onClick={alternar} aria-label={enPausa ? 'Reproducir video' : 'Pausar video'}>
        <Icon name={enPausa ? 'play' : 'pause'} size={16} />
      </button>
    </figure>
  );
}
