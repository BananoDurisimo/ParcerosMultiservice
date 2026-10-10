import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import Modal from '@shared/components/ui/Modal.jsx';
import Icon from '@shared/components/Icon.jsx';
import DetalleRegistro from '@features/ventas/components/DetalleRegistro.jsx';
import LineasPedido, { DesglosePedido, totalLineas } from '@features/ventas/components/LineasPedido.jsx';
import MontoAbono from '@features/ventas/components/MontoAbono.jsx';
import { validarLineas } from '@shared/components/ui/Form.jsx';
import { agrupar } from '@shared/lib/exportar.js';
import { DisenoModal, ComprobantesModal } from '@features/ventas/components/Archivos.jsx';
import { useData, consumoPedido } from '@shared/context/DataContext.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';
import {
  money, fecha, hoyISO, METODOS_PAGO,
  COTIZACION, EN_PROCESO, FALTA_PAGO, COMPLETADO, ENTREGADO,
  AGREGAR, VER_DISENO, DESCARGAR_DISENO, VER_COMPROBANTE, DESCARGAR_COMPROBANTE,
} from '@shared/data/mock.js';

/**
 * Tabla `pedido` (id_cliente, estado, fecha_creacion, fecha_inicio,
 * fecha_entrega, descripcion, imagen_diseno) con sus detalles:
 *  - detalle_pedido_producto: productos base (cantidad x precio de venta).
 *  - detalle_pedido_insumo: insumos de personalizacion (con precio) y la
 *    copia de la receta de los productos (`insumos_receta`, solo inventario).
 * El total es productos + personalizacion.
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
 *
 * El formulario va en dos columnas: a la izquierda el catalogo (productos y
 * personalizacion) con su buscador y lo agregado; a la derecha lo
 * informativo (cliente, fecha, desglose del total, abono inicial,
 * descripcion e imagen del diseño), numerado para guiar el registro.
 */

const VISTAS = [
  { id: 'cotizaciones', label: 'Cotizaciones', permiso: 'Cotizaciones', icono: 'clipboard', paso: 'Paso 1', ayuda: 'Aprobadas por el cliente, sin iniciar' },
  { id: 'pedidos', label: 'Pedidos', permiso: 'Pedidos', icono: 'package', paso: 'Paso 2', ayuda: 'En elaboración hasta quedar listos' },
  { id: 'ventas', label: 'Ventas', permiso: 'Ventas', icono: 'coin', paso: 'Paso 3', ayuda: 'Terminados: entrega y soportes' },
];

const TIPOS_DISENO = ['image/jpeg', 'image/png', 'image/webp'];
const TIPOS_COMPROBANTE = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const redondear = (n) => Math.round(n * 100) / 100;
/* Las lineas se editan como texto en el formulario; se guardan como numeros. */
const conSubtotal = (l) => {
  const cantidad = Number(l.cantidad);
  const precio = Number(l.precio_unitario);
  return { ...l, cantidad, precio_unitario: precio, subtotal: redondear(cantidad * precio) };
};
const listaFaltantes = (faltan) => faltan.map((f) => `${f.nombre} (se piden ${f.pide} y hay ${f.hay})`).join('; ');

/** Porcentajes permitidos para el abono inicial de un pedido. */
const opcionesAbonoInicial = (total) => [
  { value: 50, titulo: '50% del total', monto: redondear(total / 2) },
  { value: 100, titulo: '100% (pago completo)', monto: total },
];

export default function Pedidos() {
  const { db, opciones, create, update, remove, nuevoId, faltantes, expandirReceta } = useData();
  const { puede, puedeAccion } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
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

  /* El cliente se busca por nombre o por documento. */
  const clientes = opciones('clientes', (c) => `${c.nombre} · ${c.tipodocumento} ${c.documento}`);
  const clientesFiltro = opciones('clientes');

  const acciones = {
    agregarAbono: puedeAccion('Abonos', AGREGAR),
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
      const faltan = faltantes(consumoPedido(r), r);
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
  const totalForm = (v) => totalLineas(v.productos, v.insumos);
  /** Lo que el pedido gasta del inventario: receta de los productos + personalizacion. */
  const consumoForm = (v) => [...expandirReceta(v.productos || []), ...(v.insumos || [])];
  const validarLineasPedido = (v) => {
    const productos = v.productos || [];
    const insumos = v.insumos || [];
    if (!productos.length && !insumos.length) return { lineas: 'Agregue al menos un producto (o un insumo) desde el catálogo.' };
    const e = validarLineas(productos, 'id_producto') || validarLineas(insumos, 'id_insumo');
    if (e) return { lineas: e };
    if (productos.some((l) => !Number.isInteger(Number(l.cantidad)))) return { lineas: 'Las unidades de cada producto deben ser un número entero.' };
    return null;
  };
  const validarTotalAbonado = (v, actual) =>
    actual && actual.calc_abonado > 0 && totalForm(v) < actual.calc_abonado
      ? { lineas: `El total no puede quedar por debajo de lo ya abonado (${money(actual.calc_abonado)}).` }
      : null;
  /** Lineas listas para guardar, con la receta copiada de los productos. */
  const lineasGuardar = (d) => {
    const productos = (d.productos || []).map(conSubtotal);
    return { productos, insumos: (d.insumos || []).map(conSubtotal), insumos_receta: expandirReceta(productos) };
  };
  /** Titulo numerado de cada bloque del formulario: guia el orden de registro. */
  const paso = (n, texto) => ({ name: `paso${n}`, type: 'custom', full: true, render: () => <div className="form-section"><span className="paso-num">{n}</span> {texto}</div> });

  const camposBase = [
    {
      name: 'id_cliente', label: 'Cliente', type: 'select', options: clientes, required: true, soloCrear: vista.id === 'pedidos',
      buscarPlaceholder: 'Buscar cliente por nombre o documento…',
    },
    {
      /* Un solo componente llena dos columnas: productos e insumos de personalizacion. */
      name: 'lineas', type: 'component', col: 'izq', columnas: ['productos', 'insumos'],
      render: ({ values, setVal, error, bloqueado }) => (
        <LineasPedido
          productos={values.productos || []}
          insumos={values.insumos || []}
          onProductos={(v) => { setVal('lineas', true); setVal('productos', v); }}
          onInsumos={(v) => { setVal('lineas', true); setVal('insumos', v); }}
          error={error}
          readOnly={bloqueado}
        />
      ),
    },
    { name: 'desglose', type: 'custom', full: true, render: (v) => <DesglosePedido productos={v.productos || []} insumos={v.insumos || []} /> },
    {
      name: 'descripcion', label: 'Descripción de la personalización', type: 'textarea', full: true, required: true, maxLength: 600, minLength: 10,
      placeholder: 'Ej.: escudo sublimado en el pecho, nombre y número en la espalda, colores azul y blanco…',
      hint: 'Detalles del diseño acordado: colores, escudos, nombres y números de cada prenda.',
    },
    {
      name: 'imagen_diseno', label: 'Imagen del diseño', type: 'archivo', full: true, required: true, tipos: TIPOS_DISENO,
      hint: 'Diseño aprobado por el cliente (JPG, PNG o WEBP, máx. 5 MB).',
    },
  ];
  const [campoCliente, campoInsumos, campoDesglose, ...camposInfo] = camposBase;

  /* Acceso directo al abono del registro: abre Abonos con el formulario listo. */
  const puedeAbonar = (r) => acciones.agregarAbono && r.estado !== ENTREGADO && r.calc_saldo > 0 && r.calc_abonos < 2;
  const irAAbonar = (r) => navigate(`/app/abonos?pedido=${r.id}`);

  /* Eliminar el registro borra tambien sus abonos (dependen de el) y, si ya
     estaba en produccion, devuelve sus insumos al inventario. */
  const eliminacion = {
    mensaje: (r) => [
      `Se eliminará ${r.calc_codigo} de ${r.calc_cliente}.`,
      r.calc_abonos ? ` También se eliminarán sus ${r.calc_abonos} abono(s) por ${money(r.calc_abonado)}.` : '',
      r.estado !== COTIZACION ? ' Los insumos que tenía descontados volverán al inventario.' : '',
      ' Esta acción no se puede deshacer.',
    ].join(''),
    alEliminar: (r) => {
      db.abonos.filter((a) => a.id_pedido === r.id).forEach((a) => remove('abonos', a.id));
      remove('pedidos', r.id);
    },
  };

  const cotizaciones = db.pedidos.filter((p) => p.estado === COTIZACION);
  const pedidos = db.pedidos.filter((p) => [EN_PROCESO, FALTA_PAGO, COMPLETADO].includes(p.estado));
  const ventas = db.pedidos.filter((p) => [COMPLETADO, ENTREGADO].includes(p.estado));
  const mesActual = hoyISO().slice(0, 7);
  const cuantos = { cotizaciones: cotizaciones.length, pedidos: pedidos.length, ventas: ventas.length };

  /* ---------- Exportar y reporte ---------- */
  const FECHA_VISTA = {
    cotizaciones: ['fecha_creacion', 'Fecha de creación'],
    pedidos: ['fecha_inicio', 'Fecha de inicio'],
    ventas: ['fecha_entrega', 'Fecha de entrega'],
  };
  const [campoFecha, tituloFecha] = FECHA_VISTA[vista.id];
  const suma = (filas, fn) => filas.reduce((s, r) => s + Number(fn(r) || 0), 0);
  /** Unidades y valor vendidos de cada producto en las filas exportadas. */
  const porProducto = (filas) => {
    const m = new Map();
    filas.forEach((r) => (r.productos || []).forEach((l) => {
      const nombre = db.productos.find((x) => x.id === l.id_producto)?.nombre || `#${l.id_producto}`;
      const g = m.get(nombre) || [0, 0];
      m.set(nombre, [g[0] + Number(l.cantidad), g[1] + Number(l.cantidad) * Number(l.precio_unitario)]);
    }));
    return [...m].sort((a, b) => b[1][1] - a[1][1]).map(([k, [u, t]]) => [k, u, t]);
  };
  const exportacion = {
    columnas: [
      { titulo: 'Código', valor: (r) => r.calc_codigo, ancho: 62 },
      { titulo: 'Cliente', valor: (r) => r.calc_cliente, ancho: 140 },
      { titulo: tituloFecha, valor: (r) => fecha(r[campoFecha]), ancho: 74 },
      { titulo: 'Productos', valor: (r) => r.calc_productos_txt || '—', ancho: 170 },
      { titulo: 'Prendas', valor: (r) => r.calc_prendas, tipo: 'numero', ancho: 52, total: true },
      { titulo: 'Total', valor: (r) => r.calc_total, tipo: 'dinero', ancho: 82, total: true },
      { titulo: 'Abonado', valor: (r) => r.calc_abonado, tipo: 'dinero', ancho: 82, total: true },
      { titulo: 'Saldo', valor: (r) => r.calc_saldo, tipo: 'dinero', ancho: 82, total: true },
      { titulo: 'Estado', valor: (r) => r.estado, ancho: 150 },
    ],
    indicadores: (filas) => [
      { etiqueta: vista.label, valor: filas.length, tipo: 'numero', nota: 'registros en el reporte' },
      { etiqueta: 'Valor total', valor: suma(filas, (r) => r.calc_total), tipo: 'dinero' },
      { etiqueta: 'Abonado', valor: suma(filas, (r) => r.calc_abonado), tipo: 'dinero' },
      { etiqueta: 'Saldo por cobrar', valor: suma(filas, (r) => r.calc_saldo), tipo: 'dinero' },
      { etiqueta: 'Prendas', valor: suma(filas, (r) => r.calc_prendas), tipo: 'numero', nota: 'unidades de producto' },
    ],
    grupos: (filas) => [
      { titulo: 'Por estado', columnas: ['Estado', 'Registros', 'Total'], tipos: ['texto', 'numero', 'dinero'], filas: agrupar(filas, (r) => r.estado, (r) => r.calc_total) },
      { titulo: 'Por cliente', columnas: ['Cliente', 'Registros', 'Total'], tipos: ['texto', 'numero', 'dinero'], filas: agrupar(filas, (r) => r.calc_cliente, (r) => r.calc_total).slice(0, 15) },
      { titulo: 'Productos', columnas: ['Producto', 'Unidades', 'Valor'], tipos: ['texto', 'numero', 'dinero'], filas: porProducto(filas) },
    ],
  };

  /* ---------- Configuracion de cada pestaña ---------- */
  const comun = {
    exportacion,
    icono: vista.icono,
    modulo,
    coleccion: 'pedidos',
    etiquetaRegistro: (r) => r.calc_codigo,
    renderDetalle: (r) => <DetalleRegistro r={r} onVerDiseno={setDiseno} acciones={acciones} />,
    eliminacion,
    accionesExtra: (r) => (
      <>
        {vista.id !== 'ventas' && puedeAbonar(r) && (
          <button className="icon-btn" style={{ color: 'var(--success)' }} onClick={() => irAAbonar(r)} title="Agregar abono">
            <Icon name="dollar" size={16} />
          </button>
        )}
        {acciones.verDiseno && (
          <button className="icon-btn" onClick={() => setDiseno(r)} title="Ver diseño"><Icon name="image" size={16} /></button>
        )}
        {vista.id === 'ventas' && acciones.verComprobante && (
          <button className="icon-btn" onClick={() => setComprobantes(r)} title="Ver comprobante"><Icon name="receipt" size={16} /></button>
        )}
      </>
    ),
    /* Menu de etapas: tarjetas grandes con el paso, el numero de registros y
       que hay en cada una, para que se vea de un vistazo donde esta cada
       cosa y en que orden avanza (cotizacion -> pedido -> venta). */
    subnav: visibles.length > 1 && (
      <nav className="etapas" aria-label="Etapas del registro de venta">
        {visibles.map((v, i) => (
          <button
            key={v.id}
            type="button"
            className={`etapa ${v.id === vista.id ? 'is-on' : ''}`}
            aria-current={v.id === vista.id ? 'page' : undefined}
            onClick={() => setParams({ vista: v.id })}
          >
            <span className="etapa-ico"><Icon name={v.icono} size={20} /></span>
            <span className="etapa-txt">
              <span className="etapa-paso">{v.paso}</span>
              <strong>{v.label}</strong>
              <span className="caption">{v.ayuda}</span>
            </span>
            <span className="etapa-n">{cuantos[v.id]}</span>
            {i < visibles.length - 1 && <span className="etapa-flecha" aria-hidden="true"><Icon name="chevR" size={16} /></span>}
          </button>
        ))}
      </nav>
    ),
  };

  const config = {
    cotizaciones: {
      ...comun,
      titulo: 'Cotizaciones',
      subtitulo: 'Cotizaciones aprobadas por el cliente: productos, personalización, precio y diseño acordados.',
      filas: cotizaciones,
      entidad: 'cotizaciones',
      singular: 'cotización',
      searchKeys: ['calc_codigo', 'calc_cliente', 'calc_productos_txt', 'fecha_creacion', 'descripcion'],
      filtros: [
        { key: 'id_cliente', label: 'Cliente', options: clientesFiltro },
        { key: 'fecha_creacion', label: 'Fecha de creación', type: 'rango' },
        { key: 'calc_abono_inicial', label: 'Abono inicial', options: ['Registrado', 'Pendiente'] },
      ],
      defaults: { productos: [], insumos: [], descripcion: '', imagen_diseno: '', fecha_creacion: hoyISO() },
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
        campoInsumos,
        paso(1, 'Cliente y fecha'),
        campoCliente,
        { name: 'fecha_creacion', label: 'Fecha de creación', type: 'date', required: true, maxHoy: true, hint: 'No puede ser posterior a hoy.' },
        paso(2, 'Revise el precio'),
        campoDesglose,
        paso(3, 'Personalización y diseño'),
        ...camposInfo,
      ],
      validarExtra: (v, modo, actual) => ({ ...validarLineasPedido(v), ...validarTotalAbonado(v, actual) }),
      beforeSave: (d, modo) => ({
        ...d,
        ...lineasGuardar(d),
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
      searchKeys: ['calc_codigo', 'calc_cliente', 'calc_productos_txt', 'estado', 'fecha_inicio', 'descripcion'],
      filtros: [
        { key: 'estado', label: 'Estado', options: [EN_PROCESO, FALTA_PAGO, COMPLETADO] },
        { key: 'id_cliente', label: 'Cliente', options: clientesFiltro },
        { key: 'fecha_inicio', label: 'Fecha de inicio', type: 'rango' },
      ],
      defaults: { productos: [], insumos: [], descripcion: '', imagen_diseno: '', fecha_inicio: hoyISO(), abono_pct: '', abono_metodo: 'Efectivo', abono_comprobante: '' },
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
        campoInsumos,
        paso(1, 'Cliente y fecha'),
        campoCliente,
        {
          name: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true, soloCrear: true, maxHoy: true,
          hint: 'Es la fecha del abono inicial; no puede ser posterior a hoy.',
        },
        paso(2, 'Revise el precio'),
        campoDesglose,
        paso(3, 'Personalización y diseño'),
        ...camposInfo,
        { ...paso(4, 'Abono inicial'), ocultarAlEditar: true },
        {
          name: 'abono_pct', type: 'component', required: true, ocultarAlEditar: true,
          render: ({ value, onChange, error, values }) => (
            <MontoAbono
              label="Abono inicial"
              opciones={totalForm(values) > 0 ? opcionesAbonoInicial(totalForm(values)) : []}
              vacio="Agregue productos para calcular el abono inicial (50% o 100% del total)."
              value={value}
              onChange={onChange}
              error={error}
            />
          ),
        },
        { name: 'abono_metodo', label: 'Método de pago', type: 'select', options: METODOS_PAGO, required: true, ocultarAlEditar: true },
        {
          name: 'abono_comprobante', label: 'Comprobante del abono', type: 'archivo', full: true, tipos: TIPOS_COMPROBANTE, ocultarAlEditar: true,
          hint: 'Opcional: JPG, PNG, WEBP o PDF, máx. 5 MB.',
        },
      ],
      validarExtra: (v, modo, actual) => {
        const lineas = validarLineasPedido(v);
        if (lineas) return lineas;
        const errs = {};
        if (modo === 'crear' && v.abono_pct !== '' && ![50, 100].includes(Number(v.abono_pct))) {
          errs.abono_pct = 'El abono inicial debe ser el 50% del total o el pago completo.';
        }
        const faltan = faltantes(consumoForm(v), modo === 'editar' ? actual : null);
        if (faltan.length) return { ...errs, lineas: `No hay existencias suficientes: ${listaFaltantes(faltan)}.` };
        return { ...errs, ...validarTotalAbonado(v, actual) };
      },
      alGuardar: (d, modo, actual) => {
        const lineas = lineasGuardar(d);
        if (modo === 'editar') {
          update('pedidos', actual.id, { ...lineas, descripcion: d.descripcion, imagen_diseno: d.imagen_diseno });
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
          ...lineas,
          historial_estados: [{ estado: COTIZACION, fecha: d.fecha_inicio }, { estado: EN_PROCESO, fecha: d.fecha_inicio }],
        });
        const total = totalLineas(lineas.productos, lineas.insumos);
        create('abonos', {
          id_pedido: id, monto: redondear((total * Number(d.abono_pct)) / 100), fecha: d.fecha_inicio,
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
      searchKeys: ['calc_codigo', 'calc_cliente', 'calc_productos_txt', 'fecha_entrega', 'descripcion'],
      filtros: [
        { key: 'estado', label: 'Estado', options: [{ value: COMPLETADO, label: 'Pendiente de entrega' }, { value: ENTREGADO, label: ENTREGADO }] },
        { key: 'id_cliente', label: 'Cliente', options: clientesFiltro },
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
      campos: [campoInsumos, campoCliente, campoDesglose, ...camposInfo],
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
