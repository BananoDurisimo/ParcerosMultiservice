import Icon from '@core/widgets/Icon.jsx';
import Badge from '@core/widgets/ui/Badge.jsx';
import MiniTabla from '@core/widgets/ui/MiniTabla.jsx';
import { ItemsView } from '@core/widgets/ui/Form.jsx';
import { useData } from '@presentation/blocs/DataContext.jsx';
import { TablaAbonos, useDescargas } from '@presentation/widgets/ventas/Archivos.jsx';
import { gastoInsumos, defectosInsumos, sumarLineas } from '@domain/usecases/pedidos.js';
import { ESTADOS_PEDIDO, FALTA_PAGO } from '@core/constants/catalogos.js';
import { money, fecha } from '@core/utils/formato.js';

/**
 * Detalle de una cotizacion, un pedido o una venta: es el mismo registro, asi
 * que se muestra igual en las tres pestañas. `acciones` dice que puede hacer
 * el usuario con el diseño y los comprobantes en la pestaña desde la que abre.
 */
export default function DetalleRegistro({ r, onVerDiseno, acciones }) {
  const { db, opciones, expandirReceta } = useData();
  const { descargarDiseno } = useDescargas();
  const insumos = opciones('insumos');
  const productos = opciones('productos');
  const insumo = (id) => db.insumos.find((i) => String(i.id) === String(id));
  const unidad = (id) => insumo(id)?.calc_abreviatura || '';
  /* Lo que se gasto de mas: receta de las prendas defectuosas e insumos de
     personalizacion echados a perder. */
  const insumosDefecto = (r.insumos || []).filter((l) => l.defectuosas > 0);
  const defectos = sumarLineas(
    expandirReceta((r.productos || []).filter((l) => l.defectuosas > 0).map((l) => ({ ...l, cantidad: l.defectuosas }))),
    defectosInsumos(r.insumos),
  );
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

      <h3 className="det-section">Productos</h3>
      <ItemsView lineas={r.productos || []} opciones={productos} itemKey="id_producto" itemLabel="Producto" totalLabel="Subtotal productos" vacio="No se registraron productos." unidad={() => 'und'} />
      {r.calc_defectuosas > 0 && (
        <div className="alert alert-warning" style={{ marginTop: 10 }}>
          <Icon name="alert" size={18} />
          <div>
            <strong>{r.calc_defectuosas} prenda(s) defectuosa(s):</strong>{' '}
            {(r.productos || []).filter((l) => l.defectuosas > 0).map((l) => `${db.productos.find((p) => p.id === l.id_producto)?.nombre || `#${l.id_producto}`} (${l.defectuosas})`).join(' · ')}.
            {' '}Sus insumos se descontaron del inventario; no cambian el total.
          </div>
        </div>
      )}
      {defectos.length > 0 && (
        <>
          <h3 className="det-section">Gasto en insumos por defectuosos</h3>
          {insumosDefecto.length > 0 && (
            <p className="caption" style={{ marginBottom: 8 }}>
              Personalización echada a perder: {insumosDefecto.map((l) => `${insumo(l.id_insumo)?.nombre || `#${l.id_insumo}`} (${l.defectuosas} ${unidad(l.id_insumo)})`).join(' · ')}.
            </p>
          )}
          <MiniTabla
            filas={defectos}
            columnas={[
              { label: 'Insumo', render: (l) => insumo(l.id_insumo)?.nombre || '—' },
              { label: 'Cantidad', align: 'right', render: (l) => `${l.cantidad} ${unidad(l.id_insumo)}` },
              { label: 'Costo unit.', align: 'right', render: (l) => <span className="money">{money(insumo(l.id_insumo)?.calc_costo || 0)}</span> },
              { label: 'Gasto', align: 'right', render: (l) => <span className="money">{money(l.cantidad * (insumo(l.id_insumo)?.calc_costo || 0))}</span> },
            ]}
          />
          <div className="pedido-total" style={{ marginTop: 10 }}>
            <div className="is-total"><span>Gasto total por defectuosos</span><strong className="money">{money(gastoInsumos(defectos, insumo))}</strong></div>
          </div>
          <p className="caption" style={{ marginTop: 6 }}>Calculado con el precio de la última compra de cada insumo.</p>
        </>
      )}

      <h3 className="det-section">Insumos de personalización</h3>
      {/* Los insumos no se cobran: solo cuanto se gasta. Un registro anterior
          con precio en la personalizacion lo conserva en su total. */}
      <MiniTabla
        filas={r.insumos || []}
        vacio="Sin insumos de personalización."
        columnas={[
          { label: 'Insumo', render: (l) => db.insumos.find((i) => i.id === l.id_insumo)?.nombre || '—' },
          { label: 'Cantidad a gastar', align: 'right', render: (l) => `${l.cantidad} ${unidad(l.id_insumo)}` },
          ...((r.insumos || []).some((l) => l.precio_unitario > 0)
            ? [{ label: 'Cobrado (registro anterior)', align: 'right', render: (l) => <span className="money">{money(l.cantidad * l.precio_unitario)}</span> }]
            : []),
        ]}
      />
      <div className="pedido-total" style={{ marginTop: 10 }}>
        <div className="is-total"><span>Total del registro</span><strong className="money">{money(r.calc_total)}</strong></div>
      </div>

      {(r.insumos_receta || []).length > 0 && (
        <>
          <h3 className="det-section">Insumos de los productos (receta)</h3>
          <MiniTabla
            filas={r.insumos_receta}
            columnas={[
              { label: 'Insumo', render: (l) => db.insumos.find((i) => i.id === l.id_insumo)?.nombre || '—' },
              { label: 'Cantidad', align: 'right', render: (l) => `${l.cantidad} ${unidad(l.id_insumo)}` },
            ]}
          />
          <p className="caption" style={{ marginTop: 6 }}>Copia de la receta al guardar el registro, más lo gastado en defectuosos: descuenta inventario y no se cobra aparte.</p>
        </>
      )}

      <h3 className="det-section">Mockup</h3>
      {r.imagen_diseno ? (
        /* La imagen centrada y sus botones debajo. */
        <div className="mockup-detalle">
          <img className="diseno-thumb" src={r.imagen_diseno} alt={`Diseño de ${r.calc_codigo}`} />
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {acciones.verDiseno && (
              <button className="btn btn-sm" onClick={() => onVerDiseno(r)}><Icon name="image" size={15} /> Ver mockup</button>
            )}
            {acciones.descargarDiseno && (
              <button className="btn btn-sm" onClick={() => descargarDiseno(r)}><Icon name="download" size={15} /> Descargar mockup</button>
            )}
          </div>
        </div>
      ) : <p className="caption">El registro no tiene imagen del mockup.</p>}

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
    </div>
  );
}
