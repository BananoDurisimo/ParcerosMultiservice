import Icon from '@shared/components/Icon.jsx';
import Modal from '@shared/components/ui/Modal.jsx';
import MiniTabla from '@shared/components/ui/MiniTabla.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';
import { abrirArchivo, descargarArchivo } from '@shared/data/archivos.js';
import { money, fecha } from '@shared/data/mock.js';

/** Descargas con su aviso de error. El nombre del archivo lleva el codigo
 *  del registro (PED-0004-diseno.png, AB-0012-comprobante.pdf). */
export function useDescargas() {
  const toast = useToast();
  return {
    descargarDiseno: async (r) => {
      const ok = await descargarArchivo(r.imagen_diseno, `${r.calc_codigo}-diseno`);
      if (!ok) toast.error('No fue posible descargar el diseño. Intente nuevamente.', 'Error de descarga');
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
      title={r ? `Diseño ${r.calc_codigo}` : ''}
      subtitle={r?.calc_cliente}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cerrar</button>
          {puedeDescargar && r?.imagen_diseno && (
            <button className="btn btn-primary" onClick={() => descargarDiseno(r)}>
              <Icon name="download" size={16} /> Descargar diseño
            </button>
          )}
        </>
      }
    >
      {r && (
        <div>
          {r.imagen_diseno
            ? <img className="diseno-full" src={r.imagen_diseno} alt={`Diseño de ${r.calc_codigo}`} />
            : <p className="caption">El registro no tiene imagen del diseño.</p>}
          <h3 className="det-section">Descripción de la personalización</h3>
          <div className="pedido-desc">{r.descripcion || '—'}</div>
        </div>
      )}
    </Modal>
  );
}

/** Abonos de un registro con las opciones de ver y descargar su comprobante. */
export function TablaAbonos({ idPedido, puedeVer, puedeDescargar }) {
  const { db } = useData();
  const { descargarComprobante } = useDescargas();
  const abonos = db.abonos.filter((a) => a.id_pedido === idPedido).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const conComprobante = puedeVer || puedeDescargar;

  return (
    <MiniTabla
      filas={abonos}
      vacio="Todavía no hay abonos registrados."
      columnas={[
        { label: 'Abono', render: (a) => a.calc_codigo },
        { label: 'Fecha', render: (a) => fecha(a.fecha) },
        { label: 'Método de pago', render: (a) => a.metodo_pago },
        { label: 'Monto', align: 'right', render: (a) => <span className="money">{money(a.monto)}</span> },
        ...(conComprobante ? [{
          label: 'Comprobante',
          render: (a) => !a.url_comprobante ? <span className="caption">—</span> : (
            <span className="row" style={{ gap: 10 }}>
              {puedeVer && (
                <button type="button" className="link-btn row" style={{ gap: 4 }} onClick={() => abrirArchivo(a.url_comprobante)}>
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
