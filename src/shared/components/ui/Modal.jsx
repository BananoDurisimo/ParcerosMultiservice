import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@shared/components/Icon.jsx';

/* Modales abiertos, del primero al ultimo. Un modal puede abrirse encima de
   otro (el comprobante de un abono sobre el detalle del pedido): Escape y el
   clic en el fondo cierran solo el de arriba, y la pagina vuelve a desplazarse
   cuando se cierra el ultimo. */
const abiertos = [];

export default function Modal({ open, onClose, title, subtitle, size = '', children, footer }) {
  const id = useRef(Symbol('modal'));
  const cerrar = useRef(onClose);
  cerrar.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const yo = id.current;
    abiertos.push(yo);
    const onKey = (e) => {
      if (e.key === 'Escape' && abiertos[abiertos.length - 1] === yo) cerrar.current?.();
    };
    document.addEventListener('keydown', onKey);
    if (abiertos.length === 1) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      abiertos.splice(abiertos.indexOf(yo), 1);
      if (!abiertos.length) document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600 }}>{title}</h2>
            {subtitle && <p className="caption" style={{ marginTop: 3 }}>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
