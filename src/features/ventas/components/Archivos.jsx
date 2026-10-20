import { useEffect, useState } from 'react';
import Icon from '@shared/components/Icon.jsx';
import Modal from '@shared/components/ui/Modal.jsx';
import MiniTabla from '@shared/components/ui/MiniTabla.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';
import { descargarArchivo, esImagen, esPdf } from '@shared/data/archivos.js';
import { money, fecha } from '@shared/data/mock.js';

/** Descargas con su aviso de error. El nombre del archivo lleva el codigo
 *  del registro (PED-0004-diseno.png, AB-0012-comprobante.pdf). */
export function useDescargas() {
  const toast = useToast();
  return {
    descargarDiseno: async (r) => {
      const ok = await descargarArchivo(r.imagen_diseno, `${r.calc_codigo}-mockup`);
      if (!ok) toast.error('No fue posible descargar el mockup. Intente nuevamente.', 'Error de descarga');
    },
    descargarComprobante: async (a) => {
      const ok = await descargarArchivo(a.url_comprobante, `${a.calc_codigo}-comprobante`);
      if (!ok) toast.error('No fue posible descargar el comprobante. Intente nuevamente.', 'Error de descarga');
    },
  };
}

/** Vista ampliada del diseño aprobado por el cliente. */
export function DisenoModal({ registro: r, onClose, puedeDescargar }) {
  const { descargarDiseno } = useDescargas();
  return (
    <Modal
      open={!!r}
      onClose={onClose}
      size="lg"
      title={r ? `Mockup ${r.calc_codigo}` : ''}
      subtitle={r?.calc_cliente}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cerrar</button>
          {puedeDescargar && r?.imagen_diseno && (
            <button className="btn btn-primary" onClick={() => descargarDiseno(r)}>
              <Icon name="download" size={16} /> Descargar mockup
            </button>
          )}
        </>
      }
    >
      {r && (
        <div>
          {r.imagen_diseno
            ? <img className="diseno-full" src={r.imagen_diseno} alt={`Mockup de ${r.calc_codigo}`} />
            : <p className="caption">El registro no tiene imagen del mockup.</p>}
          <h3 className="det-section">Descripción de la personalización</h3>
          <div className="pedido-desc">{r.descripcion || '—'}</div>
        </div>
      )}
    </Modal>
  );
}

/**
 * Comprobante de pago de un abono, dentro de la misma pantalla: la imagen (o
 * el PDF) con los datos del abono y, si el rol puede, el boton para
 * descargarlo. Puede abrirse encima de otro modal (el detalle del pedido):
 * al cerrarlo se vuelve a el.
 */
export function ComprobanteModal({ abono: a, onClose, puedeDescargar }) {
  const { descargarComprobante } = useDescargas();
  const archivo = a?.url_comprobante || '';
  /* Los navegadores no muestran un PDF guardado como data URL dentro de la
     pagina: se convierte en blob mientras el modal esta abierto. */
  const [pdf, setPdf] = useState('');
  useEffect(() => {
    if (!esPdf(archivo)) return undefined;
    let url = '';
    let vigente = true;
    fetch(archivo).then((r) => r.blob()).then((b) => {
      if (!vigente) return;
      url = URL.createObjectURL(b);
      setPdf(url);
    });
    return () => { vigente = false; setPdf(''); if (url) URL.revokeObjectURL(url); };
  }, [archivo]);

  return (
    <Modal
      open={!!a}
      onClose={onClose}
      size="lg"
      title={a ? `Comprobante ${a.calc_codigo}` : ''}
      subtitle={a ? `${a.calc_pedido} · ${a.calc_cliente}` : ''}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cerrar</button>
          {puedeDescargar && archivo && (
            <button className="btn btn-primary" onClick={() => descargarComprobante(a)}>
              <Icon name="download" size={16} /> Descargar comprobante
            </button>
          )}
        </>
      }
    >
      {a && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="comprobante-datos">
            <div><span className="caption">Fecha del pago</span><strong>{fecha(a.fecha)}</strong></div>
            <div><span className="caption">Método de pago</span><strong>{a.metodo_pago}</strong></div>
            <div><span className="caption">Monto abonado</span><strong className="money">{money(a.monto)}</strong></div>
          </div>
          {esImagen(archivo) && <img className="diseno-full" src={archivo} alt={`Comprobante del abono ${a.calc_codigo}`} />}
          {esPdf(archivo) && (pdf
            ? <iframe className="comprobante-pdf" src={pdf} title={`Comprobante del abono ${a.calc_codigo}`} />
            : <p className="caption">Cargando el documento…</p>)}
          {!archivo && <p className="caption">El abono no tiene comprobante adjunto.</p>}
        </div>
      )}
    </Modal>
  );
}

/** Abonos de un registro con las opciones de ver y descargar su comprobante. */
export function TablaAbonos({ idPedido, puedeVer, puedeDescargar }) {
  const { db } = useData();
  const { descargarComprobante } = useDescargas();
  const [ver, setVer] = useState(null);
  const abonos = db.abonos.filter((a) => a.id_pedido === idPedido).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const conComprobante = puedeVer || puedeDescargar;

  return (
    <>
    <MiniTabla
      filas={abonos}
      vacio="Todavía no hay abonos registrados."
      columnas={[
        { label: 'Abono', render: (a) => a.calc_codigo },
        { label: 'Fecha', render: (a) => fecha(a.fecha) },
        { label: 'Método de pago', render: (a) => a.metodo_pago },
        {
          label: 'Monto', align: 'right',
          render: (a) => (a.estado === 'Anulado'
            ? <span title={`Anulado: ${a.motivo_anulacion}`}><span className="money" style={{ textDecoration: 'line-through', color: 'var(--text-sec)' }}>{money(a.monto)}</span> <span className="badge badge-error">Anulado</span></span>
            : <span className="money">{money(a.monto)}</span>),
        },
        ...(conComprobante ? [{
          label: 'Comprobante',
          render: (a) => !a.url_comprobante ? <span className="caption">—</span> : (
            <span className="row" style={{ gap: 10 }}>
              {puedeVer && (
                <button type="button" className="link-btn row" style={{ gap: 4 }} onClick={() => setVer(a)}>
                  <Icon name="eye" size={14} /> Ver
                </button>
              )}
              {puedeDescargar && (
                <button type="button" className="link-btn row" style={{ gap: 4 }} onClick={() => descargarComprobante(a)}>
                  <Icon name="download" size={14} /> Descargar
                </button>
              )}
            </span>
          ),
        }] : []),
      ]}
    />
    <ComprobanteModal abono={ver} onClose={() => setVer(null)} puedeDescargar={puedeDescargar} />
    </>
  );
}

/** Comprobantes de pago de una venta (uno por cada abono). */
export function ComprobantesModal({ registro: r, onClose, puedeVer, puedeDescargar }) {
  return (
    <Modal
      open={!!r}
      onClose={onClose}
      size="lg"
      title={r ? `Comprobantes de ${r.calc_codigo}` : ''}
      subtitle={r?.calc_cliente}
      footer={<button className="btn" onClick={onClose}>Cerrar</button>}
    >
      {r && <TablaAbonos idPedido={r.id} puedeVer={puedeVer} puedeDescargar={puedeDescargar} />}
    </Modal>
  );
}
