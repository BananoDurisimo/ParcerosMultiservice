import Icon from '@shared/components/Icon.jsx';
import Badge from '@shared/components/ui/Badge.jsx';
import HistorialRegistro from '@shared/components/ui/HistorialRegistro.jsx';
import { ItemsView } from '@shared/components/ui/Form.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { TablaAbonos, useDescargas } from './Archivos.jsx';
import { money, fecha, ESTADOS_PEDIDO, FALTA_PAGO } from '@shared/data/mock.js';

/**
 * Detalle de una cotizacion, un pedido o una venta: es el mismo registro, asi
 * que se muestra igual en las tres pestañas. `acciones` dice que puede hacer
 * el usuario con el diseño y los comprobantes en la pestaña desde la que abre.
 */
export default function DetalleRegistro({ r, onVerDiseno, acciones }) {
  const { db, opciones } = useData();
  const { descargarDiseno } = useDescargas();
  const insumos = opciones('insumos');
  const unidad = (id) => db.insumos.find((i) => i.id === id)?.calc_abreviatura || '';
  const idx = ESTADOS_PEDIDO.indexOf(r.estado);
  const fechaEtapa = (e) => (r.historial_estados || []).find((h) => h.estado === e)?.fecha;

  return (
    <div>
      <div className="detail-grid">
        <div className="detail-item"><div className="dl">Código</div><div className="dv">{r.calc_codigo}</div></div>
        <div className="detail-item"><div className="dl">Cliente</div><div className="dv">{r.calc_cliente}</div></div>
        <div className="detail-item"><div className="dl">Fecha de creación</div><div className="dv">{fecha(r.fecha_creacion)}</div></div>
        <div className="detail-item"><div className="dl">Fecha de inicio</div><div className="dv">{fecha(r.fecha_inicio)}</div></div>
        <div className="detail-item"><div className="dl">Fecha de entrega</div><div className="dv">{fecha(r.fecha_entrega)}</div></div>
        <div className="detail-item"><div className="dl">Estado</div><div className="dv"><Badge>{r.estado}</Badge></div></div>
      </div>

      <h3 className="det-section">Descripción de la personalización</h3>
      <div className="pedido-desc">{r.descripcion || '—'}</div>

      <h3 className="det-section">Insumos</h3>
      <ItemsView lineas={r.insumos || []} opciones={insumos} itemKey="id_insumo" itemLabel="Insumo" totalLabel="Total" vacio="No se registraron insumos." unidad={unidad} />

      <h3 className="det-section">Diseño aprobado por el cliente</h3>
      {r.imagen_diseno ? (
        <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <img className="diseno-thumb" src={r.imagen_diseno} alt={`Diseño de ${r.calc_codigo}`} />
          <div className="stack" style={{ gap: 8 }}>
            {acciones.verDiseno && (
              <button className="btn btn-sm" onClick={() => onVerDiseno(r)}><Icon name="image" size={15} /> Ver diseño</button>
            )}
            {acciones.descargarDiseno && (
              <button className="btn btn-sm" onClick={() => descargarDiseno(r)}><Icon name="download" size={15} /> Descargar diseño</button>
            )}
          </div>
        </div>
      ) : <p className="caption">El registro no tiene imagen del diseño.</p>}

      <h3 className="det-section">Estado financiero</h3>
      <div className="grow" style={{ minWidth: 190, marginBottom: 12 }}>
        <div className="between caption" style={{ marginBottom: 5 }}>
          <span>Abonado: <strong className="strong">{money(r.calc_abonado)}</strong> de {money(r.calc_total)}</span>
          <span>{r.calc_pct}%</span>
        </div>
        <div className={`bar ${r.calc_saldo === 0 ? 'ok' : 'warn'}`}><i style={{ width: Math.min(100, r.calc_pct) + '%' }} /></div>
        <div className="caption" style={{ marginTop: 5 }}>Saldo pendiente: <strong className="strong">{money(r.calc_saldo)}</strong></div>
      </div>
      <TablaAbonos idPedido={r.id} puedeVer={acciones.verComprobante} puedeDescargar={acciones.descargarComprobante} />

      <h3 className="det-section">Trazabilidad</h3>
      <div className="timeline">
        {ESTADOS_PEDIDO.map((e, i) => (
          <div className={`tl-item ${i < idx ? 'done' : i > idx ? 'pend' : ''}`} key={e}>
            <div style={{ fontWeight: i === idx ? 600 : 400, fontSize: 13.5, color: i > idx ? 'var(--text-sec)' : 'var(--text)' }}>{e}</div>
            <div className="caption">
              {i > idx
                ? 'Pendiente'
                : e === FALTA_PAGO && i < idx && !fechaEtapa(e)
                  /* Un pedido pagado en su totalidad pasa directo a completado. */
                  ? 'No aplicó: el pedido ya estaba pagado'
                  : `${i === idx ? 'Etapa actual' : 'Etapa completada'}${fechaEtapa(e) ? ` · ${fecha(fechaEtapa(e))}` : ''}`}
            </div>
          </div>
        ))}
      </div>

      <h3 className="det-section">Historial de cambios</h3>
      <HistorialRegistro tabla="pedido" id={r.id} />
    </div>
  );
}
