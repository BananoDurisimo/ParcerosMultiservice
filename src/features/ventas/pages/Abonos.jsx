import CrudPage from '@shared/components/CrudPage.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import Icon from '@shared/components/Icon.jsx';
import { abrirComprobante, esImagenAdjunta } from '@shared/components/ui/Form.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, fecha, hoyISO, METODOS_PAGO, PEDIDO_ANULADO } from '@shared/data/mock.js';

/** Tabla `abono`: id_pedido, monto, fecha, metodo_pago, url_comprobante.
 *  El cliente y el saldo se obtienen del pedido asociado. */
export default function Abonos() {
  const { db, stats, getStats, opciones } = useData();
  const tendencia = getStats('Mes').tendencias.recaudado;
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
        <KpiCard key="a" label="Total recaudado" value={stats.recaudado} prefix="C$ " icon="coin" tono="success" trend={tendencia} trendLabel="recaudo vs. mes anterior" />,
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
            ? <button type="button" className="link-btn row" style={{ gap: 5, fontSize: 12.5 }} onClick={() => abrirComprobante(r.url_comprobante)}><Icon name="download" size={14} /> Ver</button>
            : <span className="caption">—</span>,
        },
      ]}
      campos={[
        { name: 'id_pedido', label: 'Pedido asociado', type: 'select', options: pedidos, required: true },
        { name: 'fecha', label: 'Fecha del pago', type: 'date', required: true },
        { name: 'monto', label: 'Monto abonado (C$)', type: 'money', required: true, min: 0 },
        { name: 'metodo_pago', label: 'Método de pago', type: 'select', options: METODOS_PAGO, required: true },
        { name: 'url_comprobante', label: 'Comprobante', type: 'comprobante', full: true, placeholder: 'https://…', hint: 'Opcional: pegue el enlace o suba la imagen del soporte (JPG, PNG, WEBP o GIF, máx. 5 MB).' },
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
                {!r.url_comprobante ? 'Sin comprobante adjunto'
                  : esImagenAdjunta(r.url_comprobante)
                    ? (
                      <button type="button" className="link-btn" onClick={() => abrirComprobante(r.url_comprobante)}>
                        <img className="file-preview" src={r.url_comprobante} alt="Comprobante del abono" />
                      </button>
                    )
                    : <a href={r.url_comprobante} target="_blank" rel="noreferrer">{r.url_comprobante}</a>}
              </div>
            </div>
          </div>
          <div className="alert alert-info" style={{ marginTop: 16 }}>
            El saldo se calcula restando todos los abonos del pedido a su total; la tabla <strong>abono</strong> solo guarda el monto de cada pago.
          </div>
        </div>
      )}
      /* Un abono solo tiene sentido si es dinero real sobre un pedido vigente:
         no puede ser de cero, no puede exceder el saldo, no se cobra un pedido
         anulado y no puede cobrarse antes de que el pedido exista. */
      validarExtra={(v, modo, actual) => {
        const p = db.pedidos.find((x) => x.id === Number(v.id_pedido));
        if (Number(v.monto) <= 0) return { monto: 'El monto abonado debe ser mayor que cero.' };
        if (!p) return null;

        if (p.estado === PEDIDO_ANULADO) {
          return { id_pedido: `El pedido PED-${String(p.id).padStart(4, '0')} está anulado: no admite abonos.` };
        }
        if (v.fecha && v.fecha < p.fecha_inicio) {
          return { fecha: `El pedido inició el ${fecha(p.fecha_inicio)}: el abono no puede ser anterior.` };
        }

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
