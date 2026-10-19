import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CrudPage from '@shared/components/CrudPage.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import Icon from '@shared/components/Icon.jsx';
import { useDescargas, ComprobanteModal } from '@features/ventas/components/Archivos.jsx';
import MontoAbono, { errorMonto } from '@features/ventas/components/MontoAbono.jsx';
import { useData, consumoPedido } from '@shared/context/DataContext.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';
import { esImagen, esPdf } from '@shared/data/archivos.js';
import { agrupar } from '@shared/lib/exportar.js';
import {
  money, fecha, hoyISO, METODOS_PAGO,
  COTIZACION, EN_PROCESO, FALTA_PAGO, COMPLETADO, ENTREGADO,
  VER_COMPROBANTE, DESCARGAR_COMPROBANTE,
} from '@shared/data/mock.js';

const TIPOS_COMPROBANTE = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/** Tabla `abono`: id_pedido, monto, fecha, metodo_pago, url_comprobante.
 *  El cliente y el saldo se obtienen del pedido asociado.
 *
 *  El monto es libre y un pedido admite los abonos que hagan falta, con
 *  cualquier metodo de pago (incluido «Mixto»). El primer abono debe ser de
 *  al menos el 50% del total; ninguno puede pasar el saldo. El abono mueve el
 *  estado del registro: el primero pasa la cotizacion a «Pedido en proceso»
 *  y el que salda un pedido en «falta pago» lo deja en «Pedido completado».
 *  La fecha del pago puede ser anterior a hoy, nunca posterior.
 *
 *  Con `?pedido=ID` en la direccion (accion «Agregar abono» del listado de
 *  cotizaciones y de pedidos) el formulario se abre con ese pedido elegido. */
export default function Abonos() {
  const { db, stats, getStats, opciones, create, update, remove, faltantes } = useData();
  const [params, setParams] = useSearchParams();
  const { puedeAccion } = useAuth();
  const toast = useToast();
  const { descargarComprobante } = useDescargas();
  const tendencia = getStats('Mes').tendencias.recaudado;

  const verComp = puedeAccion('Abonos', VER_COMPROBANTE);
  const descComp = puedeAccion('Abonos', DESCARGAR_COMPROBANTE);
  /* Abono cuyo comprobante se esta viendo (modal, sin salir de la pantalla). */
  const [verComprobante, setVerComprobante] = useState(null);

  /* Se pueden abonar las cotizaciones y los pedidos con saldo; los pagados
     en su totalidad y los ya entregados se listan, pero no se pueden elegir. */
  const pedidos = opciones(
    'pedidos',
    (p) => `${p.calc_codigo} · ${p.calc_cliente}`,
    (p) => (p.estado === ENTREGADO ? 'Entregado' : p.calc_saldo <= 0 ? 'Pagado' : undefined)
  );
  const pedidoDe = (id) => db.pedidos.find((x) => x.id === Number(id));

  const redondear = (n) => Math.round(n * 100) / 100;

  /** Limites del siguiente abono del pedido: el primero, al menos el 50% del
   *  total; ninguno, mas que el saldo. Los atajos llenan el monto con un clic. */
  const limites = (p) => {
    if (!p) return {};
    const primero = p.calc_abonos === 0;
    const minimo = primero ? redondear(p.calc_total / 2) : 0;
    const atajos = primero
      ? [{ titulo: '50%', monto: minimo }, { titulo: 'Pago completo', monto: p.calc_saldo }]
      : [{ titulo: 'Saldo completo', monto: p.calc_saldo }];
    return { primero, minimo, maximo: p.calc_saldo, atajos: p.calc_saldo > 0 ? atajos : [] };
  };
  const montoInicial = () => '';

  const idPedidoUrl = params.get('pedido');
  const abrirCon = useMemo(() => {
    const p = idPedidoUrl && db.pedidos.find((x) => x.id === Number(idPedidoUrl));
    return p ? { id_pedido: p.id, monto: montoInicial() } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPedidoUrl]);

  const AyudaPedido = ({ v }) => {
    const p = pedidoDe(v.id_pedido);
    if (!p) return <span className="caption">Seleccione el pedido para ver el cliente y el saldo.</span>;
    return (
      <div className="pedido-total">
        <div><span>Cliente</span><strong>{p.calc_cliente}</strong></div>
        <div><span>Estado del pedido</span><strong>{p.estado}</strong></div>
        <div><span>Total del pedido</span><strong className="money">{money(p.calc_total)}</strong></div>
        <div><span>Saldo pendiente</span><strong className="money">{money(p.calc_saldo)}</strong></div>
      </div>
    );
  };

  const BotonesComprobante = ({ r }) => (
    <span className="row" style={{ gap: 10 }}>
      {verComp && (
        <button type="button" className="link-btn row" style={{ gap: 4, fontSize: 12.5 }} onClick={() => setVerComprobante(r)}>
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
    if (p.calc_saldo <= 0) return { id_pedido: 'Este pedido ya está pagado en su totalidad.' };
    const l = limites(p);
    const e = errorMonto(v.monto, l.minimo, l.maximo, { primero: l.primero });
    return e ? { monto: e } : null;
  };

  /* Un abono se puede eliminar mientras no deje al pedido sin respaldo: los
     abonos de una venta entregada son su soporte, y un pedido en produccion
     necesita al menos el abono inicial. */
  const eliminacion = {
    validar: (r) => {
      const p = pedidoDe(r.id_pedido);
      if (!p) return null;
      if (p.estado === ENTREGADO) return `${p.calc_codigo} ya se entregó: sus abonos son el soporte de la venta.`;
      if (p.estado !== COTIZACION && p.calc_abonos <= 1) {
        return `Es el abono inicial de ${p.calc_codigo}, que ya está en producción. Si el pedido no va, elimine el pedido.`;
      }
      return null;
    },
    mensaje: (r) => {
      const p = pedidoDe(r.id_pedido);
      return `Se eliminará el abono ${r.calc_codigo} por ${money(r.monto)} de ${r.calc_pedido}; el saldo del pedido aumentará en ese valor.${p?.estado === COMPLETADO ? ` El pedido volverá a «${FALTA_PAGO}».` : ''} Esta acción no se puede deshacer.`;
    },
    alEliminar: (r) => {
      const p = pedidoDe(r.id_pedido);
      remove('abonos', r.id);
      if (p?.estado === COMPLETADO) {
        update('pedidos', p.id, { estado: FALTA_PAGO, historial_estados: [...(p.historial_estados || []), { estado: FALTA_PAGO, fecha: hoyISO() }] });
      }
    },
  };

  const alGuardar = (d, modo, actual) => {
    if (modo === 'editar') {
      update('abonos', actual.id, { fecha: d.fecha, metodo_pago: d.metodo_pago, url_comprobante: d.url_comprobante || '' });
      toast.success('El registro de abono se actualizó correctamente.');
      return;
    }
    const p = pedidoDe(d.id_pedido);
    create('abonos', { ...d, id_pedido: p.id, monto: redondear(Number(d.monto)), url_comprobante: d.url_comprobante || '' });
    toast.success('El registro de abono se guardó correctamente.');

    const saldo = Math.round((p.calc_saldo - Number(d.monto)) * 100) / 100;
    const etapa = (estado) => [...(p.historial_estados || []), { estado, fecha: d.fecha }];

    /* Primer abono de una cotizacion: inicia el pedido si hay existencias. */
    if (p.estado === COTIZACION) {
      const faltan = faltantes(consumoPedido(p), p);
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

  const suma = (filas, fn) => filas.reduce((s, r) => s + Number(fn(r) || 0), 0);
  /* El saldo pendiente se cuenta una vez por pedido, no por abono. */
  const saldoPedidos = (filas) => suma([...new Map(filas.map((a) => [a.id_pedido, a])).values()], (a) => a.calc_saldo);
  const exportacion = {
    columnas: [
      { titulo: 'Abono', valor: (r) => r.calc_codigo, ancho: 60 },
      { titulo: 'Pedido', valor: (r) => r.calc_pedido, ancho: 64 },
      { titulo: 'Cliente', valor: (r) => r.calc_cliente, ancho: 150 },
      { titulo: 'Fecha', valor: (r) => fecha(r.fecha), ancho: 70 },
      { titulo: 'Método de pago', valor: (r) => r.metodo_pago, ancho: 90 },
      { titulo: 'Monto', valor: (r) => r.monto, tipo: 'dinero', ancho: 86, total: true },
      { titulo: 'Total del pedido', valor: (r) => r.calc_total_pedido, tipo: 'dinero', ancho: 90 },
      { titulo: 'Saldo del pedido', valor: (r) => r.calc_saldo, tipo: 'dinero', ancho: 90 },
      { titulo: 'Estado del pedido', valor: (r) => r.calc_estado_pedido, ancho: 150 },
    ],
    indicadores: (filas) => [
      { etiqueta: 'Total recaudado', valor: suma(filas, (r) => r.monto), tipo: 'dinero' },
      { etiqueta: 'Abonos', valor: filas.length, tipo: 'numero', nota: 'pagos registrados' },
      { etiqueta: 'Pedidos con abono', valor: new Set(filas.map((r) => r.id_pedido)).size, tipo: 'numero' },
      { etiqueta: 'Saldo pendiente', valor: saldoPedidos(filas), tipo: 'dinero', nota: 'de esos pedidos' },
    ],
    grupos: (filas) => [
      { titulo: 'Por método de pago', columnas: ['Método de pago', 'Abonos', 'Monto'], tipos: ['texto', 'numero', 'dinero'], filas: agrupar(filas, (r) => r.metodo_pago, (r) => r.monto) },
      { titulo: 'Por mes', columnas: ['Mes', 'Abonos', 'Monto'], tipos: ['texto', 'numero', 'dinero'], filas: agrupar(filas, (r) => (r.fecha || '').slice(0, 7).split('-').reverse().join('/'), (r) => r.monto) },
      { titulo: 'Por cliente', columnas: ['Cliente', 'Abonos', 'Monto'], tipos: ['texto', 'numero', 'dinero'], filas: agrupar(filas, (r) => r.calc_cliente, (r) => r.monto).slice(0, 15) },
    ],
  };

  return (
    <>
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
      exportacion={exportacion}
      validarExtra={validarExtra}
      alGuardar={alGuardar}
      eliminacion={eliminacion}
      abrirCon={abrirCon}
      alAbrirCon={() => setParams({}, { replace: true })}
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
        {
          name: 'id_pedido', label: 'Pedido asociado', type: 'select', options: pedidos, required: true, soloCrear: true,
          buscarPlaceholder: 'Buscar por código o cliente…',
          /* Al cambiar de pedido el monto elegido ya no aplica. */
          alCambiar: (id, setVal) => setVal('monto', montoInicial(), false),
        },
        {
          name: 'fecha', label: 'Fecha del pago', type: 'date', required: true, maxHoy: true,
          hint: 'Puede ser anterior a hoy, pero no posterior.',
        },
        { name: 'ayuda', type: 'custom', full: true, render: (v) => <AyudaPedido v={v} /> },
        {
          name: 'monto', type: 'component', required: true, soloCrear: true,
          render: ({ value, onChange, error, values, modo, actual }) => (
            modo === 'editar' ? (
              <MontoAbono label="Monto abonado" disabled required={false} value={actual?.monto} maximo={actual?.monto} />
            ) : (
              <MontoAbono
                label="Monto abonado"
                {...limites(pedidoDe(values.id_pedido))}
                nota={limites(pedidoDe(values.id_pedido)).primero ? 'primer abono: mínimo el 50% del total' : undefined}
                vacio="Seleccione el pedido para ver el monto mínimo y el máximo."
                value={value}
                onChange={onChange}
                error={error}
              />
            )
          ),
        },
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
    <ComprobanteModal abono={verComprobante} onClose={() => setVerComprobante(null)} puedeDescargar={descComp} />
    </>
  );
}
