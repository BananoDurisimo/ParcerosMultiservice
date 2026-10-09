import { useMemo, useState } from 'react';
import DataTable from '@shared/components/ui/DataTable.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import Modal from '@shared/components/ui/Modal.jsx';
import MiniTabla from '@shared/components/ui/MiniTabla.jsx';
import Badge from '@shared/components/ui/Badge.jsx';
import Icon from '@shared/components/Icon.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';
import { money, fecha, hoyISO, METODOS_PAGO, VER_DETALLE, EXPORTAR } from '@shared/data/mock.js';
import {
  ABONO, PAGO_COMPLETO, construirMovimientos, filtrarMovimientos, resumir, pendienteDeCobro, rangoDe,
} from '@features/reportes/lib/ingresos.js';
import { exportarCsv, exportarXlsx, exportarPdf } from '@features/reportes/lib/exportar.js';

const PERIODOS = ['Día', 'Semana', 'Mes', 'Año', 'Personalizado'];
const TIPOS = [{ value: '', label: 'Todos' }, { value: ABONO, label: 'Abonos' }, { value: PAGO_COMPLETO, label: 'Pagos completos' }];
const TONO_TIPO = { [ABONO]: 'info', [PAGO_COMPLETO]: 'success' };

const inicial = () => ({ periodo: 'Mes', ref: hoyISO(), desde: '', hasta: '', tipo: '', metodo: '' });

/**
 * Reportes · ingresos recibidos. Cada abono de la tabla `abono` es un
 * movimiento de dinero real; el calculo vive en lib/ingresos.js y la
 * exportacion en lib/exportar.js (esta pagina solo arma la pantalla).
 *
 * Los filtros se editan en `borrador` y rigen al pulsar «Aplicar»: lo que se
 * ve (indicadores y tabla) y lo que se exporta salen siempre del mismo
 * conjunto filtrado, y la fecha que cuenta es la del pago, no la del pedido.
 */
export default function Reportes() {
  const { db } = useData();
  const { puedeAccion } = useAuth();
  const toast = useToast();
  const [borrador, setBorrador] = useState(inicial);
  const [aplicado, setAplicado] = useState(inicial);
  const [errores, setErrores] = useState({});
  const [detalle, setDetalle] = useState(null);

  const todos = useMemo(() => construirMovimientos(db), [db]);
  const rango = useMemo(() => rangoDe(aplicado.periodo, aplicado.ref, aplicado), [aplicado]);
  const movimientos = useMemo(
    () => filtrarMovimientos(todos, { desde: rango.desde, hasta: rango.hasta, tipo: aplicado.tipo, metodo: aplicado.metodo }),
    [todos, rango, aplicado]
  );
  const resumen = useMemo(() => resumir(movimientos), [movimientos]);
  const pendiente = useMemo(() => pendienteDeCobro(db, rango.hasta), [db, rango]);

  const previa = rangoDe(borrador.periodo, borrador.ref, borrador);
  const cambios = JSON.stringify(borrador) !== JSON.stringify(aplicado);
  const set = (campo, valor) => { setBorrador((b) => ({ ...b, [campo]: valor })); setErrores({}); };

  const aplicar = () => {
    const e = {};
    if (borrador.periodo === 'Personalizado') {
      if (!borrador.desde) e.desde = 'Indique la fecha inicial.';
      if (!borrador.hasta) e.hasta = 'Indique la fecha final.';
      if (borrador.desde && borrador.hasta && borrador.hasta < borrador.desde) e.hasta = 'La fecha final no puede ser anterior a la inicial.';
    } else if (!borrador.ref) {
      e.ref = 'Indique la fecha.';
    }
    setErrores(e);
    if (Object.keys(e).length) { toast.warning('Revise las fechas del período.', 'Filtros incompletos'); return; }
    setAplicado(borrador);
  };
  const restablecer = () => { const i = inicial(); setBorrador(i); setAplicado(i); setErrores({}); };

  const datos = () => ({
    periodo: rango.etiqueta,
    tipo: aplicado.tipo ? TIPOS.find((t) => t.value === aplicado.tipo).label : '',
    metodo: aplicado.metodo,
    generado: new Date(),
    resumen,
    pendiente,
    movimientos,
  });
  const exportar = (formato, fn) => {
    fn(datos());
    toast.success(`Se generó el reporte en ${formato} con ${movimientos.length} movimientos.`, 'Reporte exportado');
  };

  const pagosDelPedido = detalle ? todos.filter((m) => m.id_pedido === detalle.id_pedido).sort((a, b) => a.orden.localeCompare(b.orden) || a.id - b.id) : [];

  const columnas = [
    { key: 'orden', label: 'Fecha y hora', mobile: 'meta', render: (r) => <span className="rep-fecha"><span>{fecha(r.fecha)}</span>{r.hora && <span className="caption">{r.hora}</span>}</span> },
    { key: 'pedido', label: 'Pedido', mobile: 'meta', render: (r) => <span className="badge badge-neutral">{r.pedido}</span> },
    { key: 'cliente', label: 'Cliente', mobile: 'title', render: (r) => <span className="cell-main">{r.cliente}</span> },
    { key: 'tipo', label: 'Tipo de movimiento', mobile: 'meta', render: (r) => <Badge tono={TONO_TIPO[r.tipo]}>{r.tipo}</Badge> },
    { key: 'metodo', label: 'Método de pago', mobile: 'meta', render: (r) => <span className="badge badge-neutral">{r.metodo}</span> },
    { key: 'monto', label: 'Valor recibido', align: 'right', mobile: 'value', render: (r) => <span className="money">{money(r.monto)}</span> },
    { key: 'estado', label: 'Estado del pedido', render: (r) => <Badge>{r.estado}</Badge> },
  ];

  const item = (titulo, valor, extra = '') => (
    <div className={`detail-item ${extra}`}><div className="dl">{titulo}</div><div className="dv">{valor}</div></div>
  );

  return (
    <div className="anim-page">
      <div className="page-head">
        <div>
          <h1 className="row" style={{ gap: 10 }}><Icon name="chart" size={22} /> Reportes</h1>
          <p className="sub">Ingresos reales de la empresa: abonos y pagos completos recibidos de los clientes.</p>
          <div className="hero-rule" />
        </div>
      </div>

      {/* Filtros */}
      <div className="card rep-filtros">
        <div className="seg" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p} type="button" className={borrador.periodo === p ? 'is-on' : ''} aria-pressed={borrador.periodo === p} onClick={() => set('periodo', p)}>
              {p}
            </button>
          ))}
        </div>

        <div className="rep-campos">
          {borrador.periodo === 'Personalizado' ? (
            <>
              <div className="field">
                <label htmlFor="rep-desde">Desde</label>
                <input id="rep-desde" className={`input ${errores.desde ? 'has-error' : ''}`} type="date" value={borrador.desde} onChange={(e) => set('desde', e.target.value)} />
                {errores.desde && <span className="field-error">{errores.desde}</span>}
              </div>
              <div className="field">
                <label htmlFor="rep-hasta">Hasta</label>
                <input id="rep-hasta" className={`input ${errores.hasta ? 'has-error' : ''}`} type="date" value={borrador.hasta} onChange={(e) => set('hasta', e.target.value)} />
                {errores.hasta && <span className="field-error">{errores.hasta}</span>}
              </div>
            </>
          ) : (
            <div className="field">
              <label htmlFor="rep-ref">{{ Día: 'Día', Semana: 'Un día de la semana', Mes: 'Un día del mes', Año: 'Un día del año' }[borrador.periodo]}</label>
              <input id="rep-ref" className={`input ${errores.ref ? 'has-error' : ''}`} type="date" value={borrador.ref} onChange={(e) => set('ref', e.target.value)} />
              {errores.ref ? <span className="field-error">{errores.ref}</span> : <span className="caption">{previa.etiqueta}</span>}
            </div>
          )}
          <div className="field">
            <label htmlFor="rep-tipo">Tipo de pago</label>
            <select id="rep-tipo" className="select" value={borrador.tipo} onChange={(e) => set('tipo', e.target.value)}>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rep-metodo">Método de pago</label>
            <select id="rep-metodo" className="select" value={borrador.metodo} onChange={(e) => set('metodo', e.target.value)}>
              <option value="">Todos</option>
              {METODOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="rep-botones">
            <button type="button" className="btn btn-primary" onClick={aplicar}>
              <Icon name="filter" size={16} /> Aplicar{cambios && <span className="dot-pendiente" title="Hay cambios sin aplicar" />}
            </button>
            <button type="button" className="btn" onClick={restablecer}>
              <Icon name="refresh" size={16} /> Restablecer
            </button>
          </div>
        </div>

        <div className="caption">
          Mostrando: <strong>{rango.etiqueta}</strong> · {aplicado.tipo ? TIPOS.find((t) => t.value === aplicado.tipo).label : 'Todos los pagos'}
          {aplicado.metodo ? ` · ${aplicado.metodo}` : ''}. Cada ingreso se cuenta en la fecha en que se recibió el dinero.
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="kpi-grid rep-kpis stagger" style={{ marginBottom: 8 }}>
        <KpiCard label="Ingresos totales" value={resumen.total} prefix="C$ " decimals={2} icon="dollar" tono="success" nota={`${resumen.transacciones} movimientos en el período`} />
        <KpiCard label="Por abonos" value={resumen.abonos} prefix="C$ " decimals={2} icon="coin" tono="info" nota={`${resumen.nAbonos} abonos recibidos`} />
        <KpiCard label="Por pagos completos" value={resumen.completos} prefix="C$ " decimals={2} icon="checkC" tono="primary" nota={`${resumen.nCompletos} pagos recibidos`} />
        <KpiCard label="Transacciones" value={resumen.transacciones} icon="receipt" tono="primary" nota="movimientos registrados" />
        <KpiCard label="Pendiente de cobro" value={pendiente} prefix="C$ " decimals={2} icon="alert" tono="warning" nota="Saldo de pedidos al cierre del período; no suma a los ingresos" />
      </div>
      <p className="caption" style={{ marginBottom: 16 }}>
        <strong>Pago completo</strong>: el pago que deja el saldo del pedido en cero (de contado o el que liquida lo pendiente).{' '}
        <strong>Abono</strong>: pago que deja saldo por cobrar. Cada pago se suma una sola vez, por lo recibido en esa transacción.
      </p>

      {/* Movimientos */}
      <DataTable
        columns={columnas}
        rows={movimientos}
        searchKeys={['pedido', 'cliente', 'codigo', 'tipo', 'metodo']}
        entidad="movimientos"
        pageSize={10}
        onView={puedeAccion('Reportes', VER_DETALLE) ? setDetalle : undefined}
        emptyText="No hay ingresos recibidos para los filtros seleccionados."
      />

      {/* Exportacion */}
      {puedeAccion('Reportes', EXPORTAR) && (
        <div className="card rep-export">
          <div>
            <div className="strong">Exportar reporte</div>
            <p className="caption">Incluye los {movimientos.length} movimientos de «{rango.etiqueta}» con los filtros aplicados y su resumen.</p>
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn" disabled={!movimientos.length} onClick={() => exportar('PDF', exportarPdf)}><Icon name="download" size={16} /> PDF</button>
            <button type="button" className="btn" disabled={!movimientos.length} onClick={() => exportar('Excel', exportarXlsx)}><Icon name="download" size={16} /> Excel (.xlsx)</button>
            <button type="button" className="btn" disabled={!movimientos.length} onClick={() => exportar('CSV', exportarCsv)}><Icon name="download" size={16} /> CSV</button>
          </div>
        </div>
      )}

      <Modal
        open={!!detalle}
        onClose={() => setDetalle(null)}
        size="lg"
        title="Detalle del movimiento"
        subtitle={detalle && `${detalle.codigo} · ${detalle.pedido}`}
        footer={<button type="button" className="btn" onClick={() => setDetalle(null)}>Cerrar</button>}
      >
        {detalle && (
          <div>
            <div className="detail-grid">
              {item('Movimiento', detalle.codigo)}
              {item('Pedido', detalle.pedido)}
              {item('Cliente', detalle.cliente)}
              {item('Tipo de movimiento', <Badge tono={TONO_TIPO[detalle.tipo]}>{detalle.tipo}</Badge>)}
              {item('Fecha del pago', fecha(detalle.fecha))}
              {item('Hora del registro', detalle.hora || '—')}
              {item('Método de pago', detalle.metodo)}
              {item('Valor recibido', <span className="money">{money(detalle.monto)}</span>)}
              {item('Total del pedido', <span className="money">{money(detalle.totalPedido)}</span>)}
              {item('Saldo tras este pago', <span className="money">{money(detalle.saldoTras)}</span>)}
              {item('Estado del pedido', <Badge>{detalle.estado}</Badge>)}
              {item('Pago n.º', `${detalle.numero} de ${pagosDelPedido.length}`)}
            </div>
            <h3 className="det-section">Pagos del pedido {detalle.pedido}</h3>
            <MiniTabla
              filas={pagosDelPedido}
              columnas={[
                { label: 'Movimiento', render: (m) => <span className={m.id === detalle.id ? 'cell-main' : ''}>{m.codigo}{m.id === detalle.id ? ' (este)' : ''}</span> },
                { label: 'Fecha', render: (m) => <span className="caption">{fecha(m.fecha)}</span> },
                { label: 'Tipo', render: (m) => <Badge tono={TONO_TIPO[m.tipo]}>{m.tipo}</Badge> },
                { label: 'Valor', align: 'right', render: (m) => <span className="money">{money(m.monto)}</span> },
                { label: 'Saldo tras el pago', align: 'right', render: (m) => money(m.saldoTras) },
              ]}
            />
            <div className="alert alert-info" style={{ marginTop: 16 }}>
              <Icon name="info" size={18} />
              <div>La hora es la del registro del pago en el sistema; la fecha es la del pago. El valor es solo lo recibido en esta transacción.</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
