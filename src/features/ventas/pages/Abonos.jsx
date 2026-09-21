import CrudPage from '@shared/components/CrudPage.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import Icon from '@shared/components/Icon.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, fecha, hoyISO, METODOS_PAGO } from '@shared/data/mock.js';

/** Tabla `abono`: id_pedido, monto, fecha, metodo_pago, url_comprobante.
 *  El cliente y el saldo se obtienen del pedido asociado. */
export default function Abonos() {
  const { db, stats, opciones } = useData();
  const pedidos = opciones('pedidos', (p) => `PED-${String(p.id).padStart(4, '0')} · ${p.calc_cliente}`);

  const codigo = (r) => `AB-${String(r.id).padStart(4, '0')}`;

  return (
    <CrudPage
      titulo="Abonos"
      subtitulo="Pagos parciales de los clientes, saldos pendientes y seguimiento financiero por pedido."
      icono="coin"
      coleccion="abonos"
      entidad="abonos"
      singular="abono"
      searchKeys={['calc_pedido', 'calc_cliente', 'metodo_pago', 'fecha']}
      filtros={[
        { key: 'metodo_pago', label: 'Método de pago', options: METODOS_PAGO },
        { key: 'id_pedido', label: 'Pedido', options: pedidos },
      ]}
      defaults={{ metodo_pago: 'Efectivo', fecha: hoyISO(), url_comprobante: '' }}
      etiquetaRegistro={codigo}
      resumen={[
        <KpiCard key="a" label="Total recaudado" value={stats.recaudado} prefix="C$ " icon="coin" tono="success" trend={9} />,
        <KpiCard key="b" label="Saldo por cobrar" value={stats.porCobrar} prefix="C$ " icon="alert" tono="warning" />,
        <KpiCard key="c" label="Abonos registrados" value={db.abonos.length} icon="clipboard" tono="primary" />,
      ]}
      columnas={[
        { key: 'id', label: 'Abono', mobile: 'title', render: (r) => <span className="cell-main">{codigo(r)}</span> },
        { key: 'calc_pedido', label: 'Pedido', mobile: 'meta', render: (r) => <span className="badge badge-neutral">{r.calc_pedido}</span> },
        { key: 'calc_cliente', label: 'Cliente', mobile: 'meta' },
        { key: 'fecha', label: 'Fecha', render: (r) => <span className="caption">{fecha(r.fecha)}</span> },
        { key: 'metodo_pago', label: 'Método', mobile: 'meta', render: (r) => <span className="badge badge-info">{r.metodo_pago}</span> },
        { key: 'monto', label: 'Monto', align: 'right', mobile: 'value', render: (r) => <span className="money">{money(r.monto)}</span> },
        { key: 'calc_saldo', label: 'Saldo del pedido', align: 'right', render: (r) => <span style={{ color: r.calc_saldo > 0 ? 'var(--error-fg)' : 'var(--success-fg)', fontWeight: 600 }}>{money(r.calc_saldo)}</span> },
        {
          key: 'url_comprobante', label: 'Comprobante', sortable: false,
          render: (r) => r.url_comprobante
            ? <a className="row" style={{ gap: 5, fontSize: 12.5 }} href={r.url_comprobante} target="_blank" rel="noreferrer"><Icon name="download" size={14} /> Ver</a>
            : <span className="caption">—</span>,
        },
      ]}
      campos={[
        { name: 'id_pedido', label: 'Pedido asociado', type: 'select', options: pedidos, required: true },
        { name: 'fecha', label: 'Fecha del pago', type: 'date', required: true },
        { name: 'monto', label: 'Monto abonado (C$)', type: 'money', required: true, min: 0 },
        { name: 'metodo_pago', label: 'Método de pago', type: 'select', options: METODOS_PAGO, required: true },
        {
          name: 'url_comprobante', label: 'Comprobante del pago', type: 'file', full: true,
          placeholder: 'Pegue un enlace o suba el archivo…',
          hint: 'Opcional: suba la imagen o el PDF del soporte desde su computador, o pegue un enlace.',
        },
      ]}
      renderDetalle={(r) => (
        <div>
          <div className="detail-grid">
            <div className="detail-item"><div className="dl">Abono</div><div className="dv">{codigo(r)}</div></div>
            <div className="detail-item"><div className="dl">Pedido</div><div className="dv">{r.calc_pedido}</div></div>
            <div className="detail-item"><div className="dl">Cliente</div><div className="dv">{r.calc_cliente}</div></div>
            <div className="detail-item"><div className="dl">Fecha</div><div className="dv">{fecha(r.fecha)}</div></div>
            <div className="detail-item"><div className="dl">Monto abonado</div><div className="dv money">{money(r.monto)}</div></div>
            <div className="detail-item"><div className="dl">Método de pago</div><div className="dv">{r.metodo_pago}</div></div>
            <div className="detail-item"><div className="dl">Total del pedido</div><div className="dv money">{money(r.calc_total_pedido)}</div></div>
            <div className="detail-item"><div className="dl">Saldo del pedido</div><div className="dv money">{money(r.calc_saldo)}</div></div>
            <div className="detail-item full">
              <div className="dl">Comprobante</div>
              <div className="dv">
                {r.url_comprobante
                  ? (
                    <a className="row" style={{ gap: 5 }} href={r.url_comprobante} target="_blank" rel="noreferrer">
                      <Icon name="download" size={14} /> Ver el comprobante adjunto
                    </a>
                  )
                  : 'Sin comprobante adjunto'}
              </div>
            </div>
          </div>
          <div className="alert alert-info" style={{ marginTop: 16 }}>
            El saldo se calcula restando todos los abonos del pedido a su total; la tabla <strong>abono</strong> solo guarda el monto de cada pago.
          </div>
        </div>
      )}
      validarExtra={(v, modo, actual) => {
        const p = db.pedidos.find((x) => x.id === Number(v.id_pedido));
        if (!p) return null;
        const otros = db.abonos
          .filter((a) => a.id_pedido === p.id && a.id !== actual?.id)
          .reduce((s, a) => s + a.monto, 0);
        return Number(v.monto) > p.calc_total - otros + 0.001
          ? { monto: `El abono supera el saldo del pedido (${money(p.calc_total - otros)}).` }
          : null;
      }}
    />
  );
}
