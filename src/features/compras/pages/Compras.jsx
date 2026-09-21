import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import Badge from '@shared/components/ui/Badge.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import { ItemsView } from '@shared/components/ui/Form.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, fecha, hoyISO, ESTADOS_COMPRA, COMPRA_ANULADA } from '@shared/data/mock.js';

/** Tabla `compra` (id_proveedor, fecha, estado) con sus dos detalles:
 *  detalle_compra_insumo y detalle_compra_producto. */
export default function Compras() {
  const { db, getStats, opciones } = useData();
  const stats = getStats('Mes');
  const proveedores = opciones('proveedores');
  const insumos = opciones('insumos');
  const variantes = opciones('variantes', (v) => v.calc_etiqueta);

  const codigo = (r) => `CMP-${String(r.id).padStart(4, '0')}`;

  const detalle = (r) => (
    <div>
      <div className="detail-grid">
        <div className="detail-item"><div className="dl">Compra</div><div className="dv">{codigo(r)}</div></div>
        <div className="detail-item"><div className="dl">Proveedor</div><div className="dv">{r.calc_proveedor}</div></div>
        <div className="detail-item"><div className="dl">Fecha</div><div className="dv">{fecha(r.fecha)}</div></div>
        <div className="detail-item"><div className="dl">Estado</div><div className="dv"><Badge>{r.estado}</Badge></div></div>
      </div>

      <h3 style={{ margin: '18px 0 10px' }}>Insumos adquiridos</h3>
      <ItemsView lineas={r.detalle_insumos || []} opciones={insumos} itemKey="id_insumo" itemLabel="Insumo" />

      <h3 style={{ margin: '18px 0 10px' }}>Productos adquiridos</h3>
      <ItemsView lineas={r.detalle_productos || []} opciones={variantes} itemKey="id_varianteproducto" itemLabel="Variante" />

      <div className="between" style={{ marginTop: 16 }}>
        <span className="caption">{r.calc_lineas} línea(s) en total</span>
        <span className="money" style={{ fontSize: 17 }}>Total de la compra: {money(r.calc_total)}</span>
      </div>

      <div className="alert alert-info" style={{ marginTop: 14 }}>
        El total no se guarda en la tabla <strong>compra</strong>: se calcula sumando las líneas de
        <strong> detalle_compra_insumo</strong> y <strong>detalle_compra_producto</strong>.
      </div>
    </div>
  );

  return (
    <CrudPage
      titulo="Compras"
      subtitulo="Registro de compras a proveedores con el detalle de insumos y productos adquiridos."
      icono="cart"
      coleccion="compras"
      entidad="compras"
      singular="compra"
      searchKeys={['calc_proveedor', 'estado', 'fecha']}
      filtros={[
        { key: 'id_proveedor', label: 'Proveedor', options: proveedores },
        { key: 'estado', label: 'Estado', options: ESTADOS_COMPRA },
      ]}
      defaults={{ detalle_insumos: [], detalle_productos: [], estado: 'En tránsito', fecha: hoyISO() }}
      etiquetaRegistro={codigo}
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
        { key: 'fecha', label: 'Fecha', mobile: 'meta', render: (r) => <span className="caption">{fecha(r.fecha)}</span> },
        { key: 'calc_lineas', label: 'Líneas', align: 'center', render: (r) => <span className="badge badge-neutral">{r.calc_lineas}</span> },
        { key: 'calc_total', label: 'Total', align: 'right', mobile: 'value', render: (r) => <span className="money">{money(r.calc_total)}</span> },
        { key: 'estado', label: 'Estado', mobile: 'meta', render: (r) => <EstadoCell row={r} coleccion="compras" options={ESTADOS_COMPRA} /> },
      ]}
      campos={[
        { name: 'id_proveedor', label: 'Proveedor', type: 'select', options: proveedores, required: true },
        { name: 'fecha', label: 'Fecha de compra', type: 'date', required: true },
        { name: 'estado', label: 'Estado', type: 'select', options: ESTADOS_COMPRA, required: true },
        { name: 'detalle_insumos', label: 'Insumos adquiridos', type: 'items', itemKey: 'id_insumo', itemLabel: 'Insumo', options: insumos },
        { name: 'detalle_productos', label: 'Productos adquiridos', type: 'items', itemKey: 'id_varianteproducto', itemLabel: 'Variante de producto', options: variantes, hint: 'Opcional: solo para compras de prendas ya confeccionadas.' },
      ]}
      validarExtra={(v) =>
        (v.detalle_insumos || []).length + (v.detalle_productos || []).length === 0
          ? { detalle_insumos: 'Registre al menos una línea de insumo o de producto.' }
          : null
      }
    />
  );
}
