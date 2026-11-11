import CrudPage from '@core/widgets/CrudPage.jsx';
import Icon from '@core/widgets/Icon.jsx';
import EstadoCell from '@core/widgets/ui/EstadoCell.jsx';
import Badge from '@core/widgets/ui/Badge.jsx';
import KpiCard from '@core/widgets/ui/KpiCard.jsx';
import { ItemsView } from '@core/widgets/ui/Form.jsx';
import { useData } from '@presentation/blocs/DataContext.jsx';
import { ESTADOS_COMPRA, ESTADOS_COMPRA_ACTIVOS, COMPRA_ANULADA } from '@core/constants/catalogos.js';
import { money, fecha, hoyISO } from '@core/utils/formato.js';
import { agrupar } from '@core/utils/exportar.js';

const unidadDe = (i) => i?.calc_abreviatura || i?.calc_unidad || '';

/** Modulo «Órdenes de pedido»: tabla `compra` (id_proveedor, numero_factura, fecha, fecha_entrega, estado) con su detalle
 *  detalle_compra_insumo (id_insumo, cantidad, precio_unitario).
 *
 *  Una compra mueve el inventario: al quedar "Recibida" sus lineas ingresan a
 *  las existencias de cada insumo. Una recibida ya no vuelve a "En transito";
 *  si hubo un error se anula (con motivo) y ese ingreso se deshace, siempre
 *  que sus insumos no se hayan gastado. */
export default function Compras() {
  const { db, getStats, opciones } = useData();
  const stats = getStats('Mes');
  const proveedores = opciones('proveedores');
  const insumos = opciones('insumos', (i) => `${i.nombre} (${unidadDe(i)})`);
  const unidad = (id) => unidadDe(db.insumos.find((i) => i.id === id));

  /* Solo los insumos que ya figuran en alguna compra: ofrecer el catalogo
     completo llenaria el desplegable de opciones sin resultados. */
  const compradosIds = new Set(db.compras.flatMap((c) => c.calc_insumos));
  const insumosComprados = insumos.filter((o) => compradosIds.has(o.value));

  /* El insumo no tiene precio: se sugiere lo que se pago en su compra mas reciente. */
  const precioInsumo = (id) => {
    const ultima = [...db.compras].sort((a, b) => b.fecha.localeCompare(a.fecha))
      .find((c) => (c.detalle_insumos || []).some((l) => l.id_insumo === id));
    return ultima?.detalle_insumos.find((l) => l.id_insumo === id)?.precio_unitario;
  };
  const codigo = (r) => r.calc_codigo || '';
  /** Insumos de una compra recibida que ya no estan completos en el inventario
   *  (se gastaron en pedidos): sacarlos dejaria existencias negativas. */
  const insumosGastados = (r) => {
    if (r.estado !== 'Recibida') return '';
    return (r.detalle_insumos || [])
      .map((l) => ({ l, i: db.insumos.find((x) => x.id === l.id_insumo) }))
      .filter(({ l, i }) => i && Number(i.stock) < Number(l.cantidad))
      .map(({ i }) => i.nombre)
      .join(', ');
  };

  /* Las anuladas se listan, pero no suman en los totales del reporte. */
  const vigentes = (filas) => filas.filter((c) => c.estado !== COMPRA_ANULADA);
  const suma = (filas, fn) => filas.reduce((s, r) => s + Number(fn(r) || 0), 0);
  const porInsumo = (filas) => {
    const m = new Map();
    vigentes(filas).forEach((c) => (c.detalle_insumos || []).forEach((l) => {
      const i = db.insumos.find((x) => x.id === l.id_insumo);
      const k = i ? `${i.nombre} (${unidadDe(i)})` : `#${l.id_insumo}`;
      const g = m.get(k) || [0, 0];
      m.set(k, [g[0] + Number(l.cantidad), g[1] + Number(l.cantidad) * Number(l.precio_unitario)]);
    }));
    return [...m].sort((a, b) => b[1][1] - a[1][1]).map(([k, [c, t]]) => [k, c, t]);
  };
  const exportacion = {
    columnas: [
      { titulo: 'Orden', valor: (r) => codigo(r), ancho: 62 },
      { titulo: 'N.º de factura', valor: (r) => r.numero_factura || '—', ancho: 80 },
      { titulo: 'Proveedor', valor: (r) => r.calc_proveedor, ancho: 140 },
      { titulo: 'Fecha de compra', valor: (r) => fecha(r.fecha), ancho: 80 },
      { titulo: 'Fecha de entrega', valor: (r) => fecha(r.fecha_entrega), ancho: 80 },
      { titulo: 'Insumos', valor: (r) => r.calc_insumos_txt || '—', ancho: 200 },
      { titulo: 'Total', valor: (r) => (r.estado === COMPRA_ANULADA ? 0 : r.calc_total), tipo: 'dinero', ancho: 90, total: true },
      { titulo: 'Estado', valor: (r) => r.estado, ancho: 70 },
    ],
    indicadores: (filas) => [
      { etiqueta: 'Órdenes de pedido', valor: filas.length, tipo: 'numero', nota: `${filas.length - vigentes(filas).length} anulada(s)` },
      { etiqueta: 'Total comprado', valor: suma(vigentes(filas), (r) => r.calc_total), tipo: 'dinero', nota: 'sin las anuladas' },
      { etiqueta: 'Recibidas', valor: filas.filter((r) => r.estado === 'Recibida').length, tipo: 'numero' },
      { etiqueta: 'En tránsito', valor: filas.filter((r) => r.estado === 'En tránsito').length, tipo: 'numero', nota: 'pendientes de llegar' },
    ],
    grupos: (filas) => [
      { titulo: 'Por proveedor', columnas: ['Proveedor', 'Órdenes', 'Total'], tipos: ['texto', 'numero', 'dinero'], filas: agrupar(vigentes(filas), (r) => r.calc_proveedor, (r) => r.calc_total) },
      { titulo: 'Por estado', columnas: ['Estado', 'Órdenes', 'Total'], tipos: ['texto', 'numero', 'dinero'], filas: agrupar(filas, (r) => r.estado, (r) => (r.estado === COMPRA_ANULADA ? 0 : r.calc_total)) },
      { titulo: 'Insumos comprados', columnas: ['Insumo', 'Cantidad', 'Total'], tipos: ['texto', 'numero', 'dinero'], filas: porInsumo(filas) },
    ],
  };

  const detalle = (r) => (
    <div>
      <div className="detail-grid">
        <div className="detail-item"><div className="dl">Orden de pedido</div><div className="dv">{codigo(r)}</div></div>
        <div className="detail-item"><div className="dl">N.º de factura</div><div className="dv">{r.numero_factura || '—'}</div></div>
        <div className="detail-item"><div className="dl">Proveedor</div><div className="dv">{r.calc_proveedor}</div></div>
        <div className="detail-item"><div className="dl">Fecha de compra</div><div className="dv">{fecha(r.fecha)}</div></div>
        <div className="detail-item"><div className="dl">Fecha de entrega</div><div className="dv">{fecha(r.fecha_entrega)}</div></div>
        <div className="detail-item"><div className="dl">Estado</div><div className="dv"><Badge>{r.estado}</Badge></div></div>
        {r.estado === COMPRA_ANULADA && (
          <div className="detail-item full"><div className="dl">Motivo de la anulación</div><div className="dv">{r.motivo_anulacion || '—'}</div></div>
        )}
      </div>

      <h3 className="det-section">Insumos adquiridos</h3>
      <ItemsView lineas={r.detalle_insumos || []} opciones={insumos} itemKey="id_insumo" itemLabel="Insumo" totalLabel="Total de la orden" unidad={unidad} />
    </div>
  );

  return (
    <CrudPage
      titulo="Órdenes de pedido"
      subtitulo="Órdenes de pedido de insumos a proveedores, con su factura, fecha de compra y de entrega."
      icono="cart"
      modulo="Órdenes de pedido"
      coleccion="compras"
      entidad="órdenes de pedido"
      singular="orden de pedido"
      searchKeys={['calc_codigo', 'numero_factura', 'calc_proveedor', 'calc_insumos_txt']}
      filtros={[
        { key: 'id_proveedor', label: 'Proveedor', options: proveedores },
        { key: 'calc_insumos', label: 'Insumo adquirido', options: insumosComprados },
        { key: 'fecha', label: 'Fecha de compra', type: 'rango' },
        { key: 'estado', label: 'Estado', options: ESTADOS_COMPRA },
      ]}
      defaults={{ detalle_insumos: [], estado: 'En tránsito', numero_factura: '', fecha: hoyISO(), fecha_entrega: '' }}
      etiquetaRegistro={codigo}
      /* Las compras no se eliminan: quedan en el historial y, si hay que darlas
         de baja, se anulan (018). */
      conEliminar={false}
      /* Anular: desde las acciones de la fila, con justificacion. Una recibida
         tambien se anula y sus insumos salen del inventario, salvo que ya se
         hayan gastado (la base de datos tambien lo valida, 014). */
      anulacion={{
        valor: COMPRA_ANULADA,
        campoMotivo: 'motivo_anulacion',
        enAcciones: true,
        validar: (r) => {
          const faltan = insumosGastados(r);
          return faltan ? `Los insumos de la orden ${codigo(r)} ya se usaron en producción (${faltan}): no se puede anular.` : null;
        },
        mensaje: (r) => `La orden de pedido ${codigo(r)} de ${r.calc_proveedor} quedará anulada: se conserva en el listado, pero deja de sumar en los totales.${r.estado === 'Recibida' ? ' Como ya fue recibida, sus insumos se retirarán del inventario.' : ''} No se puede deshacer.`,
      }}
      /* Datos de la compra a la izquierda e insumos a la derecha. */
      columnasInvertidas
      resumen={[
        <KpiCard key="a" label="Órdenes del mes" value={stats.comprasMes} prefix="C$ " icon="cart" tono="primary" trend={stats.tendencias.compras} />,
        <KpiCard key="b" label="Órdenes registradas" value={db.compras.length} icon="clipboard" tono="info" />,
        <KpiCard key="c" label="En tránsito" value={db.compras.filter((c) => c.estado === 'En tránsito').length} icon="truck" tono="warning" />,
      ]}
      renderDetalle={detalle}
      exportacion={exportacion}
      columnas={[
        { key: 'id', label: 'Orden', mobile: 'title', render: (r) => <div><div className="cell-main">{codigo(r)}</div><div className="caption">{r.numero_factura ? `Factura ${r.numero_factura}` : 'Sin factura'}</div></div> },
        { key: 'calc_proveedor', label: 'Proveedor', mobile: 'meta', render: (r) => r.calc_proveedor },
        { key: 'fecha', label: 'Fecha de compra', mobile: 'meta', render: (r) => <span className="caption">{fecha(r.fecha)}</span> },
        { key: 'fecha_entrega', label: 'Fecha de entrega', render: (r) => <span className="caption">{fecha(r.fecha_entrega)}</span> },
        { key: 'calc_lineas', label: 'Insumos', align: 'center', render: (r) => <span className="badge badge-neutral">{r.calc_lineas}</span> },
        { key: 'calc_total', label: 'Total', align: 'right', mobile: 'value', render: (r) => <span className="money">{money(r.calc_total)}</span> },
        {
          /* Anular tiene su propia confirmacion en el formulario, asi que la
             lista del listado solo ofrece los estados normales y se bloquea
             cuando la compra ya esta anulada. */
          key: 'estado', label: 'Estado', mobile: 'meta',
          render: (r) => (
            <EstadoCell
              row={r}
              coleccion="compras"
              modulo="Órdenes de pedido"
              nombre={codigo(r)}
              options={ESTADOS_COMPRA_ACTIVOS}
              comoLista
              /* Recibida y anulada son finales: una recibida solo se puede anular. */
              disabled={r.estado === COMPRA_ANULADA || r.estado === 'Recibida'}
            />
          ),
        },
      ]}
      campos={[
        { name: 'sec_datos', type: 'custom', full: true, render: () => <div className="form-section"><Icon name="clipboard" size={15} /> Datos de la orden</div> },
        { name: 'id_proveedor', label: 'Proveedor', type: 'select', options: proveedores, required: true, full: true, buscarPlaceholder: 'Buscar proveedor…' },
        {
          name: 'estado', label: 'Estado', type: 'select', options: ESTADOS_COMPRA_ACTIVOS, required: true, full: true,
          hint: 'Al marcarla como recibida, sus insumos ingresan a las existencias.',
        },
        {
          name: 'numero_factura', label: 'Número de factura', type: 'text', required: true, maxLength: 30,
          placeholder: 'Ej.: FAC-001245', hint: 'El número que trae la factura del proveedor.',
        },
        { name: 'fecha', label: 'Fecha de compra', type: 'date', required: true, maxHoy: true, hint: 'El día en que se compró.' },
        {
          name: 'fecha_entrega', label: 'Fecha de entrega', type: 'date',
          hint: 'Opcional: complétela cuando el pedido llegue.',
        },
        {
          name: 'detalle_insumos', label: 'Insumos de la orden', type: 'items', required: true, col: 'izq',
          itemKey: 'id_insumo', itemLabel: 'Insumo', options: insumos, decimales: true,
          precioSugerido: precioInsumo, unidad, totalLabel: 'Total de la orden',
          hint: 'Indique la cantidad y lo que se pagó por cada insumo. Al elegirlo se sugiere el precio de su última compra; puede ajustarlo.',
        },
      ]}
      validarExtra={(v, modo, actual) => {
        if (actual?.estado === 'Recibida' && v.estado !== 'Recibida') {
          return { estado: 'Una compra recibida no puede volver a «En tránsito». Si hubo un error, anúlela.' };
        }
        if (v.fecha && v.fecha_entrega && v.fecha_entrega < v.fecha) {
          return { fecha_entrega: 'La fecha de entrega no puede ser anterior a la fecha de compra.' };
        }
        if (v.estado === 'Recibida' && v.fecha_entrega && v.fecha_entrega > hoyISO()) {
          return { fecha_entrega: 'Una compra recibida no puede tener la fecha de entrega en el futuro.' };
        }
        return null;
      }}
    />
  );
}
