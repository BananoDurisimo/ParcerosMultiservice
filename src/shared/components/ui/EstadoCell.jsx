import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@shared/components/Icon.jsx';
import { ESTADO_TONO, etiquetaFila } from '@shared/data/mock.js';
import { useData } from '@shared/context/DataContext.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';

export default function EstadoCell({
  row,
  coleccion,
  options,
  field = 'estado',
  etiqueta = 'estado',
  /* Como se llama la fila en el aviso de confirmacion. Por defecto se toma su
     nombre, pero las tablas que no tienen esa columna -variante, compra,
     pedido- pasan aqui su etiqueta ("PED-0004", "Camiseta · M"). */
  nombre: nombreFila,
  patch,
  /* Permite rechazar un cambio: devuelve el motivo y el estado no se toca.
     Lo usa el pedido, que no puede entrar en produccion sin existencias. */
  validarCambio,
  /* Fuerza la lista desplegable aunque queden dos opciones. Lo usa la compra:
     sus estados son etapas por las que avanza -y tiene una tercera, la
     anulacion, que se aplica desde el formulario-, no dos valores opuestos. */
  comoLista = false,
  disabled = false,
}) {
  const { update } = useData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const valor = row?.[field] ?? '—';
  const tono = ESTADO_TONO[valor] || 'neutral';
  const nombre = nombreFila || etiquetaFila(row);

  // Con solo dos estados opuestos el desplegable sobra: se muestra un switch.
  const esSwitch = field === 'estado' && options.length === 2 && !comoLista;

  const abrir = () => {
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left, width: r.width });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const cerrar = () => setOpen(false);
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onClickFuera = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    document.addEventListener('mousedown', onClickFuera);
    document.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
      document.removeEventListener('mousedown', onClickFuera);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const cambiar = (nuevo) => {
    setOpen(false);
    if (nuevo === valor) return;
    const motivo = validarCambio?.(nuevo, row);
    if (motivo) {
      toast.error(motivo, `No fue posible cambiar el ${etiqueta}`);
      return;
    }
    update(coleccion, row.id, patch ? patch(nuevo, row) : { [field]: nuevo });
    toast.success(`${nombre}: ${etiqueta} actualizado a "${nuevo}".`, 'Cambio guardado');
  };

  if (esSwitch) {
    // El estado "encendido" es el positivo (tono success) o, si no lo hay, el primero.
    const on = options.find((o) => ESTADO_TONO[o] === 'success') || options[0];
    const off = options.find((o) => o !== on);
    const activo = valor === on;

    return (
      <label
        className={`switch estado-switch ${activo ? 'is-on' : 'is-off'} ${disabled ? 'is-disabled' : ''}`}
        title={disabled ? valor : `Cambiar ${etiqueta} de ${nombre}`}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={activo}
          disabled={disabled}
          aria-label={`${etiqueta} de ${nombre}: ${valor}`}
          onChange={(e) => cambiar(e.target.checked ? on : off)}
        />
        <span className="track"><span className="thumb" /></span>
        <span className="estado-switch-txt">{valor}</span>
      </label>
    );
  }

  if (disabled) {
    return <span className={`badge badge-${tono}`}><i className="dot" />{valor}</span>;
  }

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        className={`badge badge-${tono} estado-cell`}
        title={`Cambiar ${etiqueta} de ${nombre}`}
        onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : abrir(); }}
      >
        <i className="dot" />
        {valor}
        <Icon name="chevD" size={11} className="chev" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="estado-dd-menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: Math.max(pos.width, 200) }}
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((o) => {
            const t = ESTADO_TONO[o] || 'neutral';
            return (
              <button
                key={o}
                type="button"
                className={`estado-dd-item ${o === valor ? 'is-active' : ''}`}
                onClick={() => cambiar(o)}
              >
                <i className={`dot dot-${t}`} />
                <span>{o}</span>
                {o === valor && <Icon name="check" size={13} className="chk" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
