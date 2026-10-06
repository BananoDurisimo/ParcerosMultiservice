import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import Modal from '@shared/components/ui/Modal.jsx';
import Icon from '@shared/components/Icon.jsx';
import DetalleRegistro from '@features/ventas/components/DetalleRegistro.jsx';
import { DisenoModal, ComprobantesModal } from '@features/ventas/components/Archivos.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';
import {
  money, fecha, hoyISO, METODOS_PAGO,
  COTIZACION, EN_PROCESO, FALTA_PAGO, COMPLETADO, ENTREGADO,
  VER_DISENO, DESCARGAR_DISENO, VER_COMPROBANTE, DESCARGAR_COMPROBANTE,
} from '@shared/data/mock.js';

/**
 * Tabla `pedido` (id_cliente, estado, fecha_creacion, fecha_inicio,
 * fecha_entrega, descripcion, imagen_diseno) con su detalle
 * detalle_pedido_insumo (id_insumo, cantidad, precio_unitario, subtotal).
 *
 * La cotizacion, el pedido y la venta son este mismo registro: cada pestaña
 * muestra los registros de sus estados.
 *  - Cotizaciones: «Cotización aprobada por el cliente».
 *  - Pedidos: «Pedido en proceso», «Pedido completado - falta pago» y
 *    «Pedido completado».
 *  - Ventas: «Pedido completado» (pendiente de entrega) y
 *    «Pedido entregado / vendido».
 *
 * El recorrido de estados es solo hacia adelante. El primer abono pasa la
 * cotizacion a pedido en proceso (modulo de Abonos); al terminar la
 * elaboracion el sistema elige «falta pago» o «completado» segun el saldo; y
 * la entrega se registra desde Ventas.
 */

const VISTAS = [
  { id: 'cotizaciones', label: 'Cotizaciones', permiso: 'Cotizaciones', icono: 'clipboard' },
  { id: 'pedidos', label: 'Pedidos', permiso: 'Pedidos', icono: 'package' },
  { id: 'ventas', label: 'Ventas', permiso: 'Ventas', icono: 'coin' },
];

const TIPOS_DISENO = ['image/jpeg', 'image/png', 'image/webp'];
const TIPOS_COMPROBANTE = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const subtotalLineas = (lineas = []) =>
  lineas.reduce((s, l) => s + Number(l.cantidad || 0) * Number(l.precio_unitario || 0), 0);
const redondear = (n) => Math.round(n * 100) / 100;
const conSubtotal = (l) => ({ ...l, subtotal: redondear(l.cantidad * l.precio_unitario) });
const listaFaltantes = (faltan) => faltan.map((f) => `${f.nombre} (se piden ${f.pide} y hay ${f.hay})`).join('; ');

/** Total en vivo del formulario. */
function ResumenTotal({ total, abonoSugerido }) {
  return (
    <div className="pedido-total">
      <div className="is-total"><span>Total</span><strong className="money">{money(total)}</strong></div>
      {abonoSugerido && (
        <div><span>Abono inicial permitido</span><strong className="money">{money(total / 2)} (50%) o {money(total)} (total)</strong></div>
      )}
    </div>
  );
}

export default function Pedidos() {
  const { db, opciones, create, update, nuevoId, faltantes } = useData();
  const { puede, puedeAccion } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const visibles = VISTAS.filter((v) => puede(v.permiso));
  const vista = visibles.find((v) => v.id === params.get('vista')) || visibles[0];

  const [diseno, setDiseno] = useState(null);
  const [comprobantes, setComprobantes] = useState(null);
  /* Cambio de estado pendiente de confirmar: { r, nuevo, titulo, mensaje, conFecha } */
  const [cambio, setCambio] = useState(null);
  const [fechaEntrega, setFechaEntrega] = useState(hoyISO());
  const [errFecha, setErrFecha] = useState('');

  if (!vista) return null;
  const modulo = vista.permiso;

  const clientes = opciones('clientes');
  const unidad = (i) => i.calc_abreviatura || i.calc_unidad;
  /* Al elegir cada insumo conviene ver cuanto hay en existencias. */
  const insumosEditor = opciones('insumos', (i) => `${i.nombre} (${unidad(i)}) · ${i.stock} disponibles`);
  const precioInsumo = (id) => db.insumos.find((i) => i.id === id)?.precio_unitario;

  const acciones = {
    verDiseno: puedeAccion(modulo, VER_DISENO),
    descargarDiseno: puedeAccion(modulo, DESCARGAR_DISENO),
    verComprobante: puedeAccion(modulo, VER_COMPROBANTE),
    descargarComprobante: puedeAccion(modulo, DESCARGAR_COMPROBANTE),
  };

  /* ---------- Cambios de estado ---------- */
  const etapa = (r, estado, f = hoyISO()) => [...(r.historial_estados || []), { estado, fecha: f }];

  const pedirCambio = (nuevo, r) => {
    if (nuevo === EN_PROCESO) {
      if (!r.calc_abonos) {
        toast.error('Registre el abono inicial para iniciar el pedido.', 'No fue posible cambiar el estado');
        return;
      }
      const faltan = faltantes(r.insumos, r);
      if (faltan.length) {
        toast.error(`No hay existencias suficientes: ${listaFaltantes(faltan)}.`, 'No fue posible cambiar el estado');
        return;
      }
      setCambio({ r, nuevo, mensaje: `La cotización ${r.calc_codigo} pasará a «${EN_PROCESO}» y sus insumos se descontarán del inventario. El cambio no se puede deshacer.` });
      return;
    }
    if (nuevo === ENTREGADO) {
      if (r.calc_saldo > 0) {
        toast.error('El pedido tiene saldo pendiente.', 'No fue posible registrar la entrega');
        return;
      }
      setFechaEntrega(hoyISO());
      setErrFecha('');
      setCambio({ r, nuevo, conFecha: true, mensaje: `El pedido ${r.calc_codigo} de ${r.calc_cliente} quedará registrado como entregado y vendido. El cambio no se puede deshacer.` });
      return;
    }
    setCambio({
      r, nuevo,
      mensaje: `El pedido ${r.calc_codigo} se marcará como terminado y pasará a «${nuevo}»${nuevo === FALTA_PAGO ? ` porque tiene un saldo pendiente de ${money(r.calc_saldo)}` : ' porque ya está pagado en su totalidad'}. El cambio no se puede deshacer.`,
    });
  };

  const confirmarCambio = () => {
    const { r, nuevo, conFecha } = cambio;
    if (conFecha) {
      if (!fechaEntrega) { setErrFecha('Este campo no puede estar vacío.'); return; }
      if (fechaEntrega < r.fecha_inicio) { setErrFecha('La fecha de entrega no puede ser anterior a la fecha de inicio del pedido.'); return; }
      update('pedidos', r.id, { estado: ENTREGADO, fecha_entrega: fechaEntrega, historial_estados: etapa(r, ENTREGADO, fechaEntrega) });
      toast.success(`${r.calc_codigo}: la venta se registró correctamente.`, 'Cambio guardado');
    } else if (nuevo === EN_PROCESO) {
      update('pedidos', r.id, { estado: EN_PROCESO, fecha_inicio: hoyISO(), historial_estados: etapa(r, EN_PROCESO) });
      toast.success(`${r.calc_codigo}: estado actualizado a "${EN_PROCESO}".`, 'Cambio guardado');
    } else {
      update('pedidos', r.id, { estado: nuevo, historial_estados: etapa(r, nuevo) });
      toast.success(`${r.calc_codigo}: estado actualizado a "${nuevo}".`, 'Cambio guardado');
    }
    setCambio(null);
  };

  /** Estados que ofrece la columna Estado en cada pestaña: el actual y, si
   *  corresponde, el siguiente. */
  const celdaEstado = (r) => {
    let siguiente = null;
    if (vista.id === 'cotizaciones' && r.estado === COTIZACION) siguiente = EN_PROCESO;
    if (vista.id === 'pedidos' && r.estado === EN_PROCESO) siguiente = r.calc_saldo > 0 ? FALTA_PAGO : COMPLETADO;
    if (vista.id === 'ventas' && r.estado === COMPLETADO) siguiente = ENTREGADO;
    return (
      <EstadoCell
        row={r}
        coleccion="pedidos"
        modulo={modulo}
        nombre={r.calc_codigo}
        etiqueta="estado"
        options={siguiente ? [r.estado, siguiente] : [r.estado]}
        comoLista
        disabled={!siguiente}
        alElegir={pedirCambio}
      />
    );
  };

  /* ---------- Validaciones comunes ---------- */
  const totalForm = (v) => redondear(subtotalLineas(v.insumos));
  const validarTotalAbonado = (v, actual) =>
    actual && actual.calc_abonado > 0 && totalForm(v) < actual.calc_abonado
      ? { insumos: `El total no puede quedar por debajo de lo ya abonado (${money(actual.calc_abonado)}).` }
      : null;

  const camposBase = [
    { name: 'id_cliente', label: 'Cliente', type: 'select', options: clientes, required: true, soloCrear: vista.id === 'pedidos' },
    {
      name: 'insumos', label: 'Insumos a utilizar', type: 'items', required: true,
      itemKey: 'id_insumo', itemLabel: 'Insumo', options: insumosEditor, decimales: true,
      precioSugerido: precioInsumo, totalLabel: 'Total',
      hint: 'Cantidad de cada insumo que se va a gastar y su precio. Al elegirlo se sugiere su precio unitario; puede ajustarlo. Admite decimales.',
    },
    {
      name: 'descripcion', label: 'Descripción de la personalización', type: 'textarea', full: true, required: true, maxLength: 600,
      placeholder: 'Ej.: camisetas con escudo sublimado en el pecho, nombre y número en la espalda; 10 talla M y 12 talla L…',
      hint: 'Lo que se va a elaborar con los insumos: diseño, colores, tallas y cantidades.',
    },
    {
      name: 'imagen_diseno', label: 'Imagen del diseño', type: 'archivo', full: true, required: true, tipos: TIPOS_DISENO,
      hint: 'Diseño aprobado por el cliente (JPG, PNG o WEBP, máx. 5 MB).',
    },
  ];

  /* ---------- Configuracion de cada pestaña ---------- */
  const comun = {
    icono: vista.icono,
    modulo,
    coleccion: 'pedidos',
    etiquetaRegistro: (r) => r.calc_codigo,
    renderDetalle: (r) => <DetalleRegistro r={r} onVerDiseno={setDiseno} acciones={acciones} />,
    accionesExtra: (r) => (
      <>
        {acciones.verDiseno && (
          <button className="icon-btn" onClick={() => setDiseno(r)} title="Ver diseño"><Icon name="image" size={16} /></button>
        )}
        {vista.id === 'ventas' && acciones.verComprobante && (
          <button className="icon-btn" onClick={() => setComprobantes(r)} title="Ver comprobante"><Icon name="receipt" size={16} /></button>
        )}
      </>
    ),
    subnav: visibles.length > 1 && (
      <div className="tabs">
        {visibles.map((v) => (
          <button key={v.id} className={`tab ${v.id === vista.id ? 'active' : ''}`} onClick={() => setParams({ vista: v.id })}>
            <span className="row" style={{ gap: 7 }}><Icon name={v.icono} size={15} /> {v.label}</span>
          </button>
        ))}
      </div>
    ),
  };

  const cotizaciones = db.pedidos.filter((p) => p.estado === COTIZACION);
  const pedidos = db.pedidos.filter((p) => [EN_PROCESO, FALTA_PAGO, COMPLETADO].includes(p.estado));
  const ventas = db.pedidos.filter((p) => [COMPLETADO, ENTREGADO].includes(p.estado));
  const mesActual = hoyISO().slice(0, 7);

  const config = {
    cotizaciones: {
      ...comun,
      titulo: 'Cotizaciones',
      subtitulo: 'Cotizaciones aprobadas por el cliente: insumos, precio, descripción y diseño acordados.',
      filas: cotizaciones,
      entidad: 'cotizaciones',
      singular: 'cotización',
      searchKeys: ['calc_cliente', 'fecha_creacion', 'descripcion'],
      filtros: [
        { key: 'id_cliente', label: 'Cliente', options: clientes },
        { key: 'fecha_creacion', label: 'Fecha de creación', type: 'rango' },
        { key: 'calc_abono_inicial', label: 'Abono inicial', options: ['Registrado', 'Pendiente'] },
      ],
      defaults: { insumos: [], descripcion: '', imagen_diseno: '', fecha_creacion: hoyISO() },
      resumen: [
        <KpiCard key="a" label="Cotizaciones aprobadas" value={cotizaciones.length} icon="clipboard" tono="info" />,
        <KpiCard key="b" label="Valor cotizado" value={cotizaciones.reduce((s, p) => s + p.calc_total, 0)} prefix="C$ " icon="coin" tono="primary" />,
        <KpiCard key="c" label="Con abono inicial" value={cotizaciones.filter((p) => p.calc_abonos).length} icon="dollar" tono="success" />,
      ],
      columnas: [
        { key: 'id', label: 'Código', mobile: 'title', render: (r) => <span className="cell-main">{r.calc_codigo}</span> },
        { key: 'calc_cliente', label: 'Cliente', mobile: 'meta' },
        { key: 'fecha_creacion', label: 'Fecha de creación', mobile: 'meta', render: (r) => <span className="caption">{fecha(r.fecha_creacion)}</span> },
        { key: 'calc_total', label: 'Total', align: 'right', mobile: 'value', render: (r) => <span className="money">{money(r.calc_total)}</span> },
        { key: 'calc_abono_inicial', label: 'Abono inicial', render: (r) => <span className={`badge badge-${r.calc_abonos ? 'success' : 'neutral'}`}>{r.calc_abono_inicial}</span> },
        { key: 'estado', label: 'Estado', mobile: 'meta', render: celdaEstado },
      ],
      campos: [
        camposBase[0],
        { name: 'fecha_creacion', label: 'Fecha de creación', type: 'date', required: true },
        ...camposBase.slice(1),
        { name: 'resumen', type: 'custom', full: true, render: (v) => <ResumenTotal total={totalForm(v)} /> },
      ],
      validarExtra: (v, modo, actual) => validarTotalAbonado(v, actual),
      beforeSave: (d, modo) => ({
        ...d,
        insumos: (d.insumos || []).map(conSubtotal),
        ...(modo === 'crear'
          ? { estado: COTIZACION, fecha_inicio: '', fecha_entrega: '', historial_estados: [{ estado: COTIZACION, fecha: d.fecha_creacion }] }
          : {}),
      }),
    },

    pedidos: {
      ...comun,
      titulo: 'Pedidos',
      subtitulo: 'Trazabilidad de la elaboración desde que el cliente paga el abono inicial hasta que el pedido está listo para entregar.',
      filas: pedidos,
      entidad: 'pedidos',
      singular: 'pedido',
      searchKeys: ['calc_cliente', 'estado', 'fecha_inicio', 'descripcion'],
      filtros: [
        { key: 'estado', label: 'Estado', options: [EN_PROCESO, FALTA_PAGO, COMPLETADO] },
        { key: 'id_cliente', label: 'Cliente', options: clientes },
        { key: 'fecha_inicio', label: 'Fecha de inicio', type: 'rango' },
      ],
      defaults: { insumos: [], descripcion: '', imagen_diseno: '', fecha_inicio: hoyISO(), abono_metodo: 'Efectivo', abono_comprobante: '' },
      /* La edicion solo aplica mientras el pedido se elabora. */
      puedeEditarFila: (r) => r.estado === EN_PROCESO,
      resumen: [
        <KpiCard key="a" label="Pedidos en proceso" value={pedidos.filter((p) => p.estado === EN_PROCESO).length} icon="package" tono="warning" />,
        <KpiCard key="b" label="Con pago pendiente" value={pedidos.filter((p) => p.estado === FALTA_PAGO).length} icon="alert" tono="error" />,
        <KpiCard key="c" label="Saldo por cobrar" value={pedidos.reduce((s, p) => s + p.calc_saldo, 0)} prefix="C$ " icon="coin" tono="primary" />,
      ],
      columnas: [
        { key: 'id', label: 'Código', mobile: 'title', render: (r) => <span className="cell-main">{r.calc_codigo}</span> },
        { key: 'calc_cliente', label: 'Cliente', mobile: 'meta' },
        { key: 'fecha_inicio', label: 'Fecha de inicio', mobile: 'meta', render: (r) => <span className="caption">{fecha(r.fecha_inicio)}</span> },
        { key: 'calc_total', label: 'Total', align: 'right', mobile: 'value', render: (r) => <span className="money">{money(r.calc_total)}</span> },
        {
          key: 'calc_pct', label: 'Abonado', align: 'right',
          render: (r) => (
            <div style={{ minWidth: 96 }}>
              <div className="caption right">{r.calc_pct}%</div>
              <div className={`bar ${r.calc_pct >= 100 ? 'ok' : 'warn'}`}><i style={{ width: Math.min(100, r.calc_pct) + '%' }} /></div>
            </div>
          ),
        },
        { key: 'estado', label: 'Estado', mobile: 'meta', render: celdaEstado },
      ],
      campos: [
        camposBase[0],
        { name: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true, soloCrear: true },
        ...camposBase.slice(1),
        { name: 'resumen', type: 'custom', full: true, render: (v, modo) => <ResumenTotal total={totalForm(v)} abonoSugerido={modo === 'crear'} /> },
        { name: 'abono_monto', label: 'Abono inicial (C$)', type: 'money', required: true, min: 0, ocultarAlEditar: true, hint: 'El 50% del total o el pago completo.' },
        { name: 'abono_metodo', label: 'Método de pago', type: 'select', options: METODOS_PAGO, required: true, ocultarAlEditar: true },
        {
          name: 'abono_comprobante', label: 'Comprobante del abono', type: 'archivo', full: true, tipos: TIPOS_COMPROBANTE, ocultarAlEditar: true,
          hint: 'Opcional: JPG, PNG, WEBP o PDF, máx. 5 MB.',
        },
      ],
      validarExtra: (v, modo, actual) => {
        const total = totalForm(v);
        if (modo === 'crear' && v.abono_monto !== '' && v.abono_monto !== undefined && total > 0) {
          const m = Number(v.abono_monto);
          if (Math.abs(m - total / 2) > 0.01 && Math.abs(m - total) > 0.01) {
            return { abono_monto: 'El abono inicial debe ser el 50% del total o el pago completo.' };
          }
        }
        const faltan = faltantes(v.insumos, modo === 'editar' ? actual : null);
        if (faltan.length) return { insumos: `No hay existencias suficientes: ${listaFaltantes(faltan)}.` };
        return validarTotalAbonado(v, actual);
      },
      alGuardar: (d, modo, actual) => {
        const lineas = (d.insumos || []).map(conSubtotal);
        if (modo === 'editar') {
          update('pedidos', actual.id, { insumos: lineas, descripcion: d.descripcion, imagen_diseno: d.imagen_diseno });
          toast.success('El registro de pedido se actualizó correctamente.');
          return;
        }
        /* El pedido nace cuando el cliente aprueba y paga en la misma visita:
           se registra ya en proceso y con su abono inicial. */
        const id = nuevoId('pedidos');
        create('pedidos', {
          id,
          id_cliente: d.id_cliente,
          estado: EN_PROCESO,
          fecha_creacion: d.fecha_inicio,
          fecha_inicio: d.fecha_inicio,
          fecha_entrega: '',
          descripcion: d.descripcion,
          imagen_diseno: d.imagen_diseno,
          insumos: lineas,
          historial_estados: [{ estado: COTIZACION, fecha: d.fecha_inicio }, { estado: EN_PROCESO, fecha: d.fecha_inicio }],
        });
        create('abonos', {
          id_pedido: id, monto: Number(d.abono_monto), fecha: d.fecha_inicio,
          metodo_pago: d.abono_metodo, url_comprobante: d.abono_comprobante || '',
        });
        toast.success('El registro de pedido se guardó correctamente.');
      },
    },

    ventas: {
      ...comun,
      titulo: 'Ventas',
      subtitulo: 'Pedidos terminados y pagados: registro de la entrega y soportes de pago y de diseño.',
      filas: ventas,
      entidad: 'ventas',
      singular: 'venta',
      conCrear: false,
      searchKeys: ['calc_cliente', 'fecha_entrega', 'descripcion'],
      filtros: [
        { key: 'estado', label: 'Estado', options: [{ value: COMPLETADO, label: 'Pendiente de entrega' }, { value: ENTREGADO, label: ENTREGADO }] },
        { key: 'id_cliente', label: 'Cliente', options: clientes },
        { key: 'fecha_entrega', label: 'Fecha de entrega', type: 'rango' },
      ],
      resumen: [
        <KpiCard key="a" label="Ventas del mes" value={ventas.filter((p) => p.estado === ENTREGADO && (p.fecha_entrega || '').startsWith(mesActual)).reduce((s, p) => s + p.calc_total, 0)} prefix="C$ " icon="coin" tono="success" />,
        <KpiCard key="b" label="Total vendido" value={ventas.filter((p) => p.estado === ENTREGADO).reduce((s, p) => s + p.calc_total, 0)} prefix="C$ " icon="chart" tono="primary" />,
        <KpiCard key="c" label="Pendientes de entrega" value={ventas.filter((p) => p.estado === COMPLETADO).length} icon="truck" tono="warning" />,
      ],
      columnas: [
        { key: 'id', label: 'Código', mobile: 'title', render: (r) => <span className="cell-main">{r.calc_codigo}</span> },
        { key: 'calc_cliente', label: 'Cliente', mobile: 'meta' },
        { key: 'fecha_creacion', label: 'Fecha de creación', render: (r) => <span className="caption">{fecha(r.fecha_creacion)}</span> },
        { key: 'fecha_entrega', label: 'Fecha de entrega', mobile: 'meta', render: (r) => <span className="caption">{fecha(r.fecha_entrega)}</span> },
        { key: 'calc_total', label: 'Total de la venta', align: 'right', mobile: 'value', render: (r) => <span className="money">{money(r.calc_total)}</span> },
        { key: 'estado', label: 'Estado', mobile: 'meta', render: celdaEstado },
      ],
      campos: camposBase,
    },
  }[vista.id];

  return (
    <>
      <CrudPage key={vista.id} {...config} />

      <DisenoModal registro={diseno} onClose={() => setDiseno(null)} puedeDescargar={acciones.descargarDiseno} />
      <ComprobantesModal
        registro={comprobantes}
        onClose={() => setComprobantes(null)}
        puedeVer={acciones.verComprobante}
        puedeDescargar={acciones.descargarComprobante}
      />

      <Modal
        open={!!cambio}
        onClose={() => setCambio(null)}
        size="sm"
        title={cambio?.conFecha ? 'Registrar entrega' : 'Cambiar estado'}
        footer={
          <>
            <button className="btn" onClick={() => setCambio(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={confirmarCambio}><Icon name="check" size={16} /> Confirmar</button>
          </>
        }
      >
        {cambio && (
          <div className="stack" style={{ gap: 14 }}>
            <div className="alert alert-warning">
              <Icon name="alert" size={20} />
              <div>{cambio.mensaje}</div>
            </div>
            {cambio.conFecha && (
              <div className="field">
                <label htmlFor="f-entrega">Fecha de entrega <span className="req">*</span></label>
                <input
                  id="f-entrega" className={`input ${errFecha ? 'has-error' : ''}`} type="date" value={fechaEntrega}
                  onChange={(e) => { setFechaEntrega(e.target.value); setErrFecha(''); }}
                />
                {errFecha && <span className="field-error"><Icon name="alert" size={12} /> {errFecha}</span>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
