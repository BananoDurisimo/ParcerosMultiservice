import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import Badge from '@shared/components/ui/Badge.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import { ItemsView } from '@shared/components/ui/Form.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, fecha, hoyISO, ESTADOS_COMPRA, ESTADOS_COMPRA_ACTIVOS, COMPRA_ANULADA } from '@shared/data/mock.js';

const unidadDe = (i) => i?.calc_abreviatura || i?.calc_unidad || '';

/** Tabla `compra` (id_proveedor, fecha, fecha_entrega, estado) con su detalle
 *  detalle_compra_insumo (id_insumo, cantidad, precio_unitario).
 *
 *  Una compra mueve el inventario: al quedar "Recibida" sus lineas ingresan a
 *  las existencias de cada insumo, y si vuelve a "En transito" o se anula, ese
 *  ingreso se deshace. */
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

  const precioInsumo = (id) => db.insumos.find((i) => i.id === id)?.precio_unitario;
  const codigo = (r) => r.calc_codigo || '';

  const detalle = (r) => (
    <div>
      <div className="detail-grid">
        <div className="detail-item"><div className="dl">Compra</div><div className="dv">{codigo(r)}</div></div>
        <div className="detail-item"><div className="dl">Proveedor</div><div className="dv">{r.calc_proveedor}</div></div>
        <div className="detail-item"><div className="dl">Fecha de realización</div><div className="dv">{fecha(r.fecha)}</div></div>
        <div className="detail-item"><div className="dl">Fecha de entrega</div><div className="dv">{fecha(r.fecha_entrega)}</div></div>
        <div className="detail-item"><div className="dl">Estado</div><div className="dv"><Badge>{r.estado}</Badge></div></div>
      </div>

      <h3 className="det-section">Insumos adquiridos</h3>
      <ItemsView lineas={r.detalle_insumos || []} opciones={insumos} itemKey="id_insumo" itemLabel="Insumo" totalLabel="Total de la compra" unidad={unidad} />
    </div>
  );

  return (
    <CrudPage
      titulo="Compras"
      subtitulo="Registro de compras de insumos a proveedores, con su fecha de realización y de entrega."
      icono="cart"
      modulo="Compras"
      coleccion="compras"
      entidad="compras"
      singular="compra"
      searchKeys={['calc_proveedor', 'calc_insumos_txt']}
      filtros={[
        { key: 'id_proveedor', label: 'Proveedor', options: proveedores },
        { key: 'calc_insumos', label: 'Insumo adquirido', options: insumosComprados },
        { key: 'fecha', label: 'Fecha de realización', type: 'rango' },
        { key: 'estado', label: 'Estado', options: ESTADOS_COMPRA },
      ]}
      defaults={{ detalle_insumos: [], estado: 'En tránsito', fecha: hoyISO(), fecha_entrega: '' }}
      etiquetaRegistro={codigo}
      eliminacion={{
        /* Borrar una compra recibida retira del inventario lo que ingreso: no
           se puede si esas existencias ya se gastaron. */
        validar: (r) => {
          if (r.estado !== 'Recibida') return null;
          const faltan = (r.detalle_insumos || []).filter((l) => {
            const i = db.insumos.find((x) => x.id === l.id_insumo);
            return i && Number(i.stock) < Number(l.cantidad);
          });
          return faltan.length
            ? `Sus insumos ya se usaron en producción (${faltan.map((l) => db.insumos.find((x) => x.id === l.id_insumo)?.nombre).join(', ')}): no se pueden retirar del inventario. Puede anularla.`
            : null;
        },
        mensaje: (r) => `Se eliminará la compra ${codigo(r)} de ${r.calc_proveedor}.${r.estado === 'Recibida' ? ' Sus insumos se retirarán del inventario.' : ''} Esta acción no se puede deshacer; si solo quiere darla de baja, anúlela.`,
      }}
      anulacion={{
        valor: COMPRA_ANULADA,
        mensaje: (r) => `La compra ${codigo(r)} de ${r.calc_proveedor} quedará marcada como anulada: se conserva en el listado y en el historial, pero deja de sumar en los totales de compras.`,
      }}
      resumen={[
        <KpiCard key="a" label="Compras del mes" value={stats.comprasMes} prefix="C$ " icon="cart" tono="primary" trend={stats.tendencias.compras} />,
        <KpiCard key="b" label="Compras registradas" value={db.compras.length} icon="clipboard" tono="info" />,
        <KpiCard key="c" label="En tránsito" value={db.compras.filter((c) => c.estado === 'En tránsito').length} icon="truck" tono="warning" />,
      ]}
      renderDetalle={detalle}
      columnas={[
        { key: 'id', label: 'Compra', mobile: 'title', render: (r) => <span className="cell-main">{codigo(r)}</span> },
        { key: 'calc_proveedor', label: 'Proveedor', mobile: 'meta', render: (r) => r.calc_proveedor },
        { key: 'fecha', label: 'Fecha de realización', mobile: 'meta', render: (r) => <span className="caption">{fecha(r.fecha)}</span> },
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
              modulo="Compras"
              nombre={codigo(r)}
              options={ESTADOS_COMPRA_ACTIVOS}
              comoLista
              disabled={r.estado === COMPRA_ANULADA}
            />
          ),
        },
      ]}
      campos={[
        { name: 'id_proveedor', label: 'Proveedor', type: 'select', options: proveedores, required: true, buscarPlaceholder: 'Buscar proveedor…' },
        {
          name: 'estado', label: 'Estado', type: 'select', options: ESTADOS_COMPRA_ACTIVOS, required: true,
          hint: 'Al marcarla como recibida, sus insumos ingresan a las existencias.',
        },
        { name: 'fecha', label: 'Fecha de realización', type: 'date', required: true, maxHoy: true },
        { name: 'fecha_entrega', label: 'Fecha de entrega', type: 'date', required: true },
        {
          name: 'detalle_insumos', label: 'Insumos adquiridos', type: 'items', required: true,
          itemKey: 'id_insumo', itemLabel: 'Insumo', options: insumos, decimales: true,
          precioSugerido: precioInsumo, unidad, totalLabel: 'Total de la compra',
          hint: 'Indique la cantidad y el precio de compra de cada insumo. Al elegirlo se sugiere su precio unitario; puede ajustarlo.',
        },
      ]}
      validarExtra={(v) => {
        if (v.fecha && v.fecha_entrega && v.fecha_entrega < v.fecha) {
          return { fecha_entrega: 'La fecha de entrega no puede ser anterior a la fecha de la compra.' };
        }
        if (v.estado === 'Recibida' && v.fecha_entrega && v.fecha_entrega > hoyISO()) {
          return { fecha_entrega: 'Una compra recibida no puede tener la fecha de entrega en el futuro.' };
        }
        return null;
      }}
    />
  );
}
