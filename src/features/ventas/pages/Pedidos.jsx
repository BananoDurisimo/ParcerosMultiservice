import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import { ItemsView } from '@shared/components/ui/Form.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, fecha, hoyISO, ESTADOS_PEDIDO } from '@shared/data/mock.js';

/** Tabla `pedido` (id_cliente, estado, fecha_inicio) + detalle_pedido
 *  (id_varianteproducto, cantidad, precio_unitario, subtotal).
 *  El total y lo abonado no son columnas: se derivan de detalle_pedido y abono. */
export default function Pedidos() {
  const { db, getStats, opciones } = useData();
  const stats = getStats('Mes');
  const clientes = opciones('clientes');
  const variantes = opciones('variantes', (v) => v.calc_etiqueta);

  const codigo = (r) => `PED-${String(r.id).padStart(4, '0')}`;

  const detalle = (r) => {
    const pct = r.calc_total ? Math.round((r.calc_abonado / r.calc_total) * 100) : 0;
    const idx = ESTADOS_PEDIDO.indexOf(r.estado);

    return (
      <div>
        <div className="detail-grid">
          <div className="detail-item"><div className="dl">Pedido</div><div className="dv">{codigo(r)}</div></div>
          <div className="detail-item"><div className="dl">Cliente</div><div className="dv">{r.calc_cliente}</div></div>
          <div className="detail-item"><div className="dl">Fecha de inicio</div><div className="dv">{fecha(r.fecha_inicio)}</div></div>
          <div className="detail-item"><div className="dl">Estado</div><div className="dv">{r.estado}</div></div>
        </div>

        <h3 style={{ margin: '18px 0 10px' }}>Productos solicitados</h3>
        <ItemsView lineas={r.detalles || []} opciones={variantes} itemKey="id_varianteproducto" itemLabel="Variante de producto" />

        <h3 style={{ margin: '18px 0 10px' }}>Estado financiero</h3>
        <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
          <div className="grow" style={{ minWidth: 190 }}>
            <div className="between caption" style={{ marginBottom: 5 }}>
              <span>Abonado: <strong className="strong">{money(r.calc_abonado)}</strong> de {money(r.calc_total)}</span>
              <span>{pct}%</span>
            </div>
            <div className={`bar ${r.calc_saldo === 0 ? 'ok' : 'warn'}`}><i style={{ width: pct + '%' }} /></div>
            <div className="caption" style={{ marginTop: 5 }}>Saldo pendiente: <strong className="strong">{money(r.calc_saldo)}</strong></div>
          </div>
        </div>

        <h3 style={{ margin: '18px 0 10px' }}>Abonos registrados</h3>
        <div className="items-box">
          <div className="items-row head"><span>Fecha</span><span>Método</span><span>Monto</span><span style={{ width: 34 }} /></div>
          {db.abonos.filter((a) => a.id_pedido === r.id).length === 0 && (
            <div style={{ padding: '14px 12px' }} className="caption">Este pedido aún no tiene abonos.</div>
          )}
          {db.abonos.filter((a) => a.id_pedido === r.id).map((a) => (
            <div className="items-row" key={a.id}>
              <span style={{ fontSize: 13 }}>{fecha(a.fecha)}</span>
              <span style={{ fontSize: 13 }}>{a.metodo_pago}</span>
              <span className="money" style={{ fontSize: 13 }}>{money(a.monto)}</span>
              <span style={{ width: 34 }} />
            </div>
          ))}
        </div>

        <h3 style={{ margin: '18px 0 10px' }}>Trazabilidad del pedido</h3>
        <div className="timeline">
          {ESTADOS_PEDIDO.map((e, i) => (
            <div className={`tl-item ${i < idx ? 'done' : i > idx ? 'pend' : ''}`} key={e}>
              <div style={{ fontWeight: i === idx ? 600 : 400, fontSize: 13.5, color: i > idx ? 'var(--text-sec)' : 'var(--text)' }}>{e}</div>
              <div className="caption">{i < idx ? 'Etapa completada' : i === idx ? 'Etapa actual' : 'Pendiente'}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <CrudPage
      titulo="Pedidos"
      subtitulo="Trazabilidad completa desde la cotización aprobada hasta la entrega del pedido."
      icono="clipboard"
      coleccion="pedidos"
      entidad="pedidos"
      singular="pedido"
      searchKeys={['calc_cliente', 'estado', 'fecha_inicio']}
      filtros={[
        { key: 'estado', label: 'Estado del pedido', options: ESTADOS_PEDIDO },
        { key: 'id_cliente', label: 'Cliente', options: clientes },
      ]}
      defaults={{ detalles: [], estado: 'Cotización aprobada', fecha_inicio: hoyISO() }}
      etiquetaRegistro={codigo}
      resumen={[
        <KpiCard key="a" label="Ventas del mes" value={stats.ventasMes} prefix="C$ " icon="coin" tono="success" trend={stats.tendencias.ventas} />,
        <KpiCard key="b" label="Pedidos activos" value={stats.pedidosActivos} icon="clipboard" tono="primary" />,
        <KpiCard key="c" label="Por cobrar" value={stats.porCobrar} prefix="C$ " icon="alert" tono="warning" />,
      ]}
      renderDetalle={detalle}
      columnas={[
        { key: 'id', label: 'Pedido', mobile: 'title', render: (r) => <span className="cell-main">{codigo(r)}</span> },
        { key: 'calc_cliente', label: 'Cliente', mobile: 'meta', render: (r) => r.calc_cliente },
        { key: 'fecha_inicio', label: 'Fecha de inicio', mobile: 'meta', render: (r) => <span className="caption">{fecha(r.fecha_inicio)}</span> },
        { key: 'calc_total', label: 'Total', align: 'right', mobile: 'value', render: (r) => <span className="money">{money(r.calc_total)}</span> },
        {
          key: 'calc_abonado', label: 'Abonado', align: 'right',
          render: (r) => {
            const pct = r.calc_total ? Math.round((r.calc_abonado / r.calc_total) * 100) : 0;
            return (
              <div style={{ minWidth: 96 }}>
                <div className="caption right">{pct}%</div>
                <div className={`bar ${pct === 100 ? 'ok' : pct === 0 ? 'bad' : 'warn'}`}><i style={{ width: pct + '%' }} /></div>
              </div>
            );
          },
        },
        { key: 'estado', label: 'Estado', mobile: 'meta', render: (r) => <EstadoCell row={r} coleccion="pedidos" etiqueta="estado del pedido" options={ESTADOS_PEDIDO} /> },
      ]}
      campos={[
        { name: 'id_cliente', label: 'Cliente', type: 'select', options: clientes, required: true },
        { name: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true },
        { name: 'estado', label: 'Estado del pedido', type: 'select', options: ESTADOS_PEDIDO, required: true },
        { name: 'detalles', label: 'Productos solicitados', type: 'items', itemKey: 'id_varianteproducto', itemLabel: 'Variante de producto', options: variantes, required: true },
      ]}
      beforeSave={(d) => ({
        ...d,
        // detalle_pedido.subtotal si se almacena en la base de datos.
        detalles: (d.detalles || []).map((l) => ({ ...l, subtotal: l.cantidad * l.precio_unitario })),
      })}
    />
  );
}
