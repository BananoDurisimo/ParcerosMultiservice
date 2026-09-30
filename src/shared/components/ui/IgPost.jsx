import { useEffect, useRef, useState } from 'react';
import Icon from '@shared/components/Icon.jsx';

const ESPERA_MS = 9000;

/**
 * Marco con el reproductor oficial de Instagram.
 *
 * Solo se monta cuando entra en pantalla, para no pedir doce publicaciones al
 * abrir la pagina. Si Instagram no responde (sin conexion o red que lo
 * bloquea) queda una tarjeta de respaldo que sigue llevando a la publicacion.
 */
export function IgFrame({ post, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [falla, setFalla] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return undefined;
    if (typeof IntersectionObserver !== 'function') {
      setVisible(true);
      return undefined;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || cargado) return undefined;
    const t = setTimeout(() => setFalla(true), ESPERA_MS);
    return () => clearTimeout(t);
  }, [visible, cargado]);

  return (
    <div className={`ig-frame ${className}`} ref={ref}>
      {visible && (
        <iframe
          src={post.embed}
          title="Publicación de Instagram de Parceros Multiservice"
          loading="lazy"
          scrolling="no"
          allowTransparency="true"
          onLoad={() => setCargado(true)}
        />
      )}

      {/* Respaldo: se ve mientras carga y queda fijo si Instagram falla. */}
      {!cargado && (
        <a
          className="ig-fallback"
          href={post.url}
          target="_blank"
          rel="noreferrer"
          style={{ background: post.grad }}
        >
          <Icon name="instagram" size={26} />
          <div className="ig-cap">
            <span>{falla ? 'Ver la publicación en Instagram' : 'Cargando publicación…'}</span>
          </div>
        </a>
      )}
    </div>
  );
}

/** Publicacion de Instagram dentro del carrusel de la seccion "Redes".
 *  El titulo, la descripcion y la fecha las muestra el propio reproductor. */
export default function IgPost({ post }) {
  return (
    <article className="card ig-card">
      <IgFrame post={post} />
    </article>
  );
}
