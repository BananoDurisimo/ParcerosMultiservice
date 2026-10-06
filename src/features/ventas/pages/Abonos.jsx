import CrudPage from '@shared/components/CrudPage.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import Icon from '@shared/components/Icon.jsx';
import { useDescargas } from '@features/ventas/components/Archivos.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';
import { abrirArchivo, esImagen, esPdf } from '@shared/data/archivos.js';
import {
  money, fecha, hoyISO, METODOS_PAGO,
  COTIZACION, EN_PROCESO, FALTA_PAGO, COMPLETADO, ENTREGADO,
  VER_COMPROBANTE, DESCARGAR_COMPROBANTE,
} from '@shared/data/mock.js';

const TIPOS_COMPROBANTE = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_ABONOS = 2;

/** Tabla `abono`: id_pedido, monto, fecha, metodo_pago, url_comprobante.
 *  El cliente y el saldo se obtienen del pedido asociado.
 *
 *  Cada pedido admite como maximo dos abonos: el primero es el 50% del total
 *  o el pago completo, y el segundo el saldo pendiente. El abono mueve el
 *  estado del registro: el primero pasa la cotizacion a «Pedido en proceso»
 *  y el que salda un pedido en «falta pago» lo deja en «Pedido completado». */
export default function Abonos() {
  const { db, stats, getStats, opciones, create, update, faltantes } = useData();
  const { puedeAccion } = useAuth();
  const toast = useToast();
  const { descargarComprobante } = useDescargas();
  const tendencia = getStats('Mes').tendencias.recaudado;

  const verComp = puedeAccion('Abonos', VER_COMPROBANTE);
  const descComp = puedeAccion('Abonos', DESCARGAR_COMPROBANTE);

  /* Se pueden abonar las cotizaciones y los pedidos con saldo; los pagados
     en su totalidad y los ya entregados se listan, pero no se pueden elegir. */
  const pedidos = opciones(
    'pedidos',
    (p) => `${p.calc_codigo} · ${p.calc_cliente}`,
    (p) => (p.estado === ENTREGADO ? 'Entregado' : p.calc_saldo <= 0 ? 'Pagado' : p.calc_abonos >= MAX_ABONOS ? 'Con dos abonos' : undefined)
  );
  const pedidoDe = (id) => db.pedidos.find((x) => x.id === Number(id));

  /** Montos validos para el siguiente abono del pedido. */
  const montosPermitidos = (p) =>
    p.calc_abonos === 0 ? [p.calc_total / 2, p.calc_total] : [p.calc_saldo];

  const AyudaPedido = ({ v, modo }) => {
    const p = pedidoDe(v.id_pedido);
    if (!p) return <span className="caption">Seleccione el pedido para ver el cliente y el saldo.</span>;
    return (
      <div className="pedido-total">
        <div><span>Cliente</span><strong>{p.calc_cliente}</strong></div>
        <div><span>Estado del pedido</span><strong>{p.estado}</strong></div>
        <div><span>Total del pedido</span><strong className="money">{money(p.calc_total)}</strong></div>
        <div><span>Saldo pendiente</span><strong className="money">{money(p.calc_saldo)}</strong></div>
        {modo === 'crear' && p.calc_abonos < MAX_ABONOS && (
          <div className="is-total">
            <span>{p.calc_abonos === 0 ? 'Primer abono' : 'Segundo abono'}</span>
            <strong className="money">
              {p.calc_abonos === 0 ? `${money(p.calc_total / 2)} (50%) o ${money(p.calc_total)} (total)` : `${money(p.calc_saldo)} (saldo)`}
            </strong>
          </div>
        )}
      </div>
    );
  };

  const BotonesComprobante = ({ r }) => (
    <span className="row" style={{ gap: 10 }}>
      {verComp && (
        <button type="button" className="link-btn row" style={{ gap: 4, fontSize: 12.5 }} onClick={() => abrirArchivo(r.url_comprobante)}>
          <Icon name="eye" size={14} /> Ver
        </button>
      )}
      {descComp && (
        <button type="button" className="link-btn row" style={{ gap: 4, fontSize: 12.5 }} onClick={() => descargarComprobante(r)}>
          <Icon name="download" size={14} /> Descargar
        </button>
      )}
    </span>
  );

  /* Un abono solo tiene sentido si es dinero real sobre un pedido vigente. */
  const validarExtra = (v, modo, actual) => {
    const p = pedidoDe(v.id_pedido);
    if (!p) return null;
    if (v.fecha && v.fecha < p.fecha_creacion) {
      return { fecha: `La cotización se creó el ${fecha(p.fecha_creacion)}: el abono no puede ser anterior.` };
    }
    if (modo === 'editar') return null;
    if (p.calc_abonos >= MAX_ABONOS) return { id_pedido: 'Este pedido ya tiene registrados los dos abonos permitidos.' };
    if (p.calc_saldo <= 0) return { id_pedido: 'Este pedido ya está pagado en su totalidad.' };
    const m = Number(v.monto);
    if (v.monto !== '' && v.monto !== undefined && !montosPermitidos(p).some((x) => Math.abs(x - m) <= 0.01)) {
      return { monto: 'El abono debe ser el 50% del total o el saldo completo.' };
    }
    return null;
  };

  const alGuardar = (d, modo, actual) => {
    if (modo === 'editar') {
      update('abonos', actual.id, { fecha: d.fecha, metodo_pago: d.metodo_pago, url_comprobante: d.url_comprobante || '' });
      toast.success('El registro de abono se actualizó correctamente.');
      return;
    }
    const p = pedidoDe(d.id_pedido);
    create('abonos', { ...d, id_pedido: p.id, url_comprobante: d.url_comprobante || '' });
    toast.success('El registro de abono se guardó correctamente.');

    const saldo = Math.round((p.calc_saldo - Number(d.monto)) * 100) / 100;
    const etapa = (estado) => [...(p.historial_estados || []), { estado, fecha: d.fecha }];

    /* Primer abono de una cotizacion: inicia el pedido si hay existencias. */
    if (p.estado === COTIZACION) {
      const faltan = faltantes(p.insumos, p);
      if (faltan.length) {
        toast.warning(
          `${p.calc_codigo} sigue como cotización: no hay existencias suficientes de ${faltan.map((f) => `${f.nombre} (se piden ${f.pide} y hay ${f.hay})`).join('; ')}.`,
          'Pedido sin iniciar'
        );
        return;
      }
      update('pedidos', p.id, { estado: EN_PROCESO, fecha_inicio: d.fecha, historial_estados: etapa(EN_PROCESO) });
      toast.info(`${p.calc_codigo} pasó a «${EN_PROCESO}» y sus insumos se descontaron del inventario.`, 'Pedido iniciado');
      return;
    }
    /* Abono que salda un pedido terminado. */
    if (p.estado === FALTA_PAGO && saldo <= 0) {
      update('pedidos', p.id, { estado: COMPLETADO, historial_estados: etapa(COMPLETADO) });
      toast.info(`${p.calc_codigo} quedó pagado y pasó a «${COMPLETADO}».`, 'Pedido completado');
    }
  };

  return (
    <CrudPage
      titulo="Abonos"
      subtitulo="Pagos de los clientes, saldos pendientes y seguimiento financiero de cada pedido."
      icono="coin"
      modulo="Abonos"
      coleccion="abonos"
      entidad="abonos"
      singular="abono"
      searchKeys={['calc_pedido', 'calc_cliente', 'metodo_pago', 'fecha']}
      filtros={[
        { key: 'metodo_pago', label: 'Método de pago', options: METODOS_PAGO },
        { key: 'id_pedido', label: 'Pedido', options: pedidos },
        { key: 'fecha', label: 'Fecha del abono', type: 'rango' },
      ]}
      defaults={{ metodo_pago: 'Efectivo', fecha: hoyISO(), url_comprobante: '' }}
      etiquetaRegistro={(r) => r.calc_codigo}
      validarExtra={validarExtra}
      alGuardar={alGuardar}
      resumen={[
        <KpiCard key="a" label="Total recaudado" value={stats.recaudado} prefix="C$ " icon="coin" tono="success" trend={tendencia} trendLabel="recaudo vs. mes anterior" />,
        <KpiCard key="b" label="Saldo por cobrar" value={stats.porCobrar} prefix="C$ " icon="alert" tono="warning" />,
        <KpiCard key="c" label="Abonos registrados" value={db.abonos.length} icon="clipboard" tono="primary" />,
      ]}
      columnas={[
        { key: 'id', label: 'Abono', mobile: 'title', render: (r) => <span className="cell-main">{r.calc_codigo}</span> },
        { key: 'calc_pedido', label: 'Pedido', mobile: 'meta', render: (r) => <span className="badge badge-neutral">{r.calc_pedido}</span> },
        { key: 'calc_cliente', label: 'Cliente', mobile: 'meta' },
        { key: 'fecha', label: 'Fecha', render: (r) => <span className="caption">{fecha(r.fecha)}</span> },
        { key: 'metodo_pago', label: 'Método', mobile: 'meta', render: (r) => <span className="badge badge-info">{r.metodo_pago}</span> },
        { key: 'monto', label: 'Monto', align: 'right', mobile: 'value', render: (r) => <span className="money">{money(r.monto)}</span> },
        { key: 'calc_saldo', label: 'Saldo del pedido', align: 'right', render: (r) => <span style={{ color: r.calc_saldo > 0 ? 'var(--error-fg)' : 'var(--success-fg)', fontWeight: 600 }}>{money(r.calc_saldo)}</span> },
        {
          key: 'url_comprobante', label: 'Comprobante', sortable: false,
          render: (r) => (r.url_comprobante ? <BotonesComprobante r={r} /> : <span className="caption">—</span>),
        },
      ]}
      campos={[
        { name: 'id_pedido', label: 'Pedido asociado', type: 'select', options: pedidos, required: true, soloCrear: true },
        { name: 'fecha', label: 'Fecha del pago', type: 'date', required: true },
        { name: 'ayuda', type: 'custom', full: true, render: (v, modo) => <AyudaPedido v={v} modo={modo} /> },
        { name: 'monto', label: 'Monto abonado (C$)', type: 'money', required: true, min: 0, soloCrear: true },
        { name: 'metodo_pago', label: 'Método de pago', type: 'select', options: METODOS_PAGO, required: true },
        {
          name: 'url_comprobante', label: 'Comprobante', type: 'archivo', full: true, tipos: TIPOS_COMPROBANTE,
          hint: 'Opcional: JPG, PNG, WEBP o PDF, máx. 5 MB.',
        },
      ]}
      renderDetalle={(r) => (
        <div>
          <div className="detail-grid">
            <div className="detail-item"><div className="dl">Abono</div><div className="dv">{r.calc_codigo}</div></div>
            <div className="detail-item"><div className="dl">Pedido</div><div className="dv">{r.calc_pedido}</div></div>
            <div className="detail-item"><div className="dl">Cliente</div><div className="dv">{r.calc_cliente}</div></div>
            <div className="detail-item"><div className="dl">Fecha</div><div className="dv">{fecha(r.fecha)}</div></div>
            <div className="detail-item"><div className="dl">Monto abonado</div><div className="dv money">{money(r.monto)}</div></div>
            <div className="detail-item"><div className="dl">Método de pago</div><div className="dv">{r.metodo_pago}</div></div>
            <div className="detail-item"><div className="dl">Total del pedido</div><div className="dv money">{money(r.calc_total_pedido)}</div></div>
            <div className="detail-item"><div className="dl">Saldo del pedido</div><div className="dv money">{money(r.calc_saldo)}</div></div>
            <div className="detail-item full">
              <div className="dl">Comprobante</div>
              <div className="dv stack" style={{ gap: 8 }}>
                {!r.url_comprobante ? 'Sin comprobante adjunto' : (
                  <>
                    {esImagen(r.url_comprobante) && <img className="file-preview" src={r.url_comprobante} alt="Comprobante del abono" />}
                    {esPdf(r.url_comprobante) && <span>Documento PDF</span>}
                    <BotonesComprobante r={r} />
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="alert alert-info" style={{ marginTop: 16 }}>
            El saldo se calcula restando todos los abonos del pedido a su total; la tabla <strong>abono</strong> solo guarda el monto de cada pago.
          </div>
        </div>
      )}
    />
  );
}
