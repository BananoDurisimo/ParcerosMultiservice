import CrudPage from '@shared/components/CrudPage.jsx';
import Badge from '@shared/components/ui/Badge.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, UMBRAL_STOCK_BAJO } from '@shared/data/mock.js';

/** Tabla `insumo`: nombre, id_tipo_insumo, id_unidad_medida, stock, precio_unitario. */
export default function Insumos() {
  const { db, stats, opciones } = useData();
  const tipos = opciones('tipos_insumo');
  const unidades = opciones('unidades_medida', (u) => `${u.nombre} (${u.abreviatura})`);

  const nivel = (i) => {
    if (i.stock === 0) return { tono: 'bad', label: 'Agotado', badge: 'error' };
    if (i.stock <= UMBRAL_STOCK_BAJO) return { tono: 'warn', label: 'Existencias bajas', badge: 'warning' };
    return { tono: 'ok', label: 'Disponible', badge: 'success' };
  };

  return (
    <CrudPage
      titulo="Insumos"
      subtitulo="Controle las existencias de materiales, su unidad de medida y su costo unitario."
      icono="package"
      coleccion="insumos"
      entidad="insumos"
      singular="insumo"
      searchKeys={['nombre', 'calc_tipo', 'calc_unidad']}
      filtros={[
        { key: 'id_tipo_insumo', label: 'Tipo de insumo', options: tipos },
        { key: 'id_unidad_medida', label: 'Unidad de medida', options: unidades },
      ]}
      defaults={{ stock: 0 }}
      resumen={[
        <KpiCard key="a" label="Insumos registrados" value={db.insumos.length} icon="package" tono="primary" />,
        <KpiCard key="b" label={`Con ${UMBRAL_STOCK_BAJO} o menos`} value={stats.bajoStock.length} icon="alert" tono="warning" />,
        <KpiCard key="c" label="Valor del inventario" value={stats.valorInventario} prefix="C$ " icon="coin" tono="success" decimals={0} />,
      ]}
      columnas={[
        {
          key: 'nombre', label: 'Insumo', mobile: 'title',
          render: (r) => (
            <div>
              <div className="cell-main">{r.nombre}</div>
              <div className="caption">{r.calc_tipo}</div>
            </div>
          ),
        },
        { key: 'calc_unidad', label: 'Unidad', mobile: 'meta', render: (r) => <span className="muted">{r.calc_unidad} ({r.calc_abreviatura})</span> },
        {
          key: 'stock', label: 'Existencias', mobile: 'meta',
          render: (r) => {
            const n = nivel(r);
            const pct = Math.min(100, (r.stock / (UMBRAL_STOCK_BAJO * 4)) * 100);
            return (
              <div style={{ minWidth: 118 }}>
                <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                  <strong>{r.stock}</strong>
                  <span className="caption">{r.calc_abreviatura}</span>
                </div>
                <div className={`bar ${n.tono}`}><i style={{ width: pct + '%' }} /></div>
              </div>
            );
          },
        },
        { key: 'precio_unitario', label: 'Precio unit.', align: 'right', mobile: 'value', render: (r) => <span className="money">{money(r.precio_unitario)}</span> },
        { key: 'calc_valor', label: 'Valor en stock', align: 'right', render: (r) => <span className="money">{money(r.calc_valor)}</span> },
        { key: 'disponibilidad', label: 'Disponibilidad', sortable: false, render: (r) => <Badge tono={nivel(r).badge}>{nivel(r).label}</Badge> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre del insumo', type: 'text', required: true, full: true },
        { name: 'id_tipo_insumo', label: 'Tipo de insumo', type: 'select', options: tipos, required: true },
        { name: 'id_unidad_medida', label: 'Unidad de medida', type: 'select', options: unidades, required: true },
        { name: 'stock', label: 'Existencias', type: 'number', required: true, min: 0 },
        { name: 'precio_unitario', label: 'Precio unitario (C$)', type: 'money', required: true, min: 0 },
      ]}
    />
  );
}
