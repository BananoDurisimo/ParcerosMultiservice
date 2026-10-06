import CrudPage from '@shared/components/CrudPage.jsx';
import Icon from '@shared/components/Icon.jsx';
import Badge from '@shared/components/ui/Badge.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import MiniTabla from '@shared/components/ui/MiniTabla.jsx';
import { useData, consumeInventario } from '@shared/context/DataContext.jsx';
import { money, fecha, UMBRAL_STOCK_BAJO, ESTADOS_REGISTRO } from '@shared/data/mock.js';

/** Tabla `insumo`: nombre, id_tipo_insumo, id_unidad_medida, stock,
 *  stock_minimo, precio_unitario, estado.
 *  Cada insumo define sus propias existencias minimas: por debajo de ese
 *  numero la fila se marca en amarillo y entra en la alerta de inventario. */
export default function Insumos() {
  const { db, stats, opciones } = useData();
  const tipos = opciones('tipos_insumo');
  const unidades = opciones('unidades_medida', (u) => `${u.nombre} (${u.abreviatura})`);

  const nivel = (i) => {
    if (i.stock === 0) return { tono: 'bad', label: 'Agotado', badge: 'error' };
    if (i.stock <= i.calc_minimo) return { tono: 'warn', label: 'Existencias bajas', badge: 'warning' };
    return { tono: 'ok', label: 'Disponible', badge: 'success' };
  };

  /* Compras que trajeron el insumo, de la mas reciente a la mas antigua. */
  const ultimasCompras = (i) =>
    db.compras
      .flatMap((c) => (c.detalle_insumos || [])
        .filter((l) => l.id_insumo === i.id)
        .map((l, k) => ({ id: `${c.id}-${k}`, compra: c, cantidad: l.cantidad, precio: l.precio_unitario })))
      .sort((a, b) => b.compra.fecha.localeCompare(a.compra.fecha))
      .slice(0, 5);

  /* Movimientos de inventario del insumo: entradas por compras recibidas,
     salidas por pedidos en produccion y ajustes hechos a mano en el formulario. */
  const movimientosInventario = (i) => {
    const out = [];
    db.compras.filter((c) => c.estado === 'Recibida').forEach((c) =>
      (c.detalle_insumos || []).filter((l) => l.id_insumo === i.id).forEach((l) =>
        out.push({ fecha: c.fecha_entrega || c.fecha, tipo: 'Entrada', origen: `Compra ${c.calc_codigo}`, cantidad: l.cantidad })
      )
    );
    db.pedidos.filter((p) => consumeInventario(p.estado)).forEach((p) =>
      (p.insumos || []).filter((l) => l.id_insumo === i.id).forEach((l) =>
        out.push({ fecha: p.fecha_inicio, tipo: 'Salida', origen: `Pedido ${p.calc_codigo}`, cantidad: -l.cantidad })
      )
    );
    db.movimientos
      .filter((m) => m.tabla === 'insumo' && m.id_registro === i.id && m.accion === 'UPDATE' && m.calc_cambios.some((c) => c.campo === 'stock'))
      .forEach((m) => {
        const n = Number(m.valor_nuevo.stock) - Number(m.valor_anterior.stock);
        out.push({ fecha: m.calc_fecha, tipo: 'Ajuste manual', origen: m.calc_usuario, cantidad: n });
      });
    return out.sort((a, b) => b.fecha.localeCompare(a.fecha)).map((x, k) => ({ ...x, id: k }));
  };

  const detalle = (r) => {
    const n = nivel(r);
    return (
      <div>
        <div className="detail-grid">
          <div className="detail-item"><div className="dl">Insumo</div><div className="dv">{r.nombre}</div></div>
          <div className="detail-item"><div className="dl">Tipo de insumo</div><div className="dv">{r.calc_tipo}</div></div>
          <div className="detail-item"><div className="dl">Unidad de medida</div><div className="dv">{r.calc_unidad} ({r.calc_abreviatura})</div></div>
          <div className="detail-item"><div className="dl">Existencias</div><div className="dv">{r.stock} {r.calc_abreviatura}</div></div>
          <div className="detail-item"><div className="dl">Existencias mínimas</div><div className="dv">{r.calc_minimo} {r.calc_abreviatura}</div></div>
          <div className="detail-item"><div className="dl">Precio unitario</div><div className="dv money">{money(r.precio_unitario)}</div></div>
          <div className="detail-item"><div className="dl">Disponibilidad</div><div className="dv"><Badge tono={n.badge}>{n.label}</Badge></div></div>
          <div className="detail-item"><div className="dl">Estado</div><div className="dv"><Badge>{r.estado}</Badge></div></div>
        </div>

        {r.stock <= r.calc_minimo && (
          <div className={`alert alert-${r.stock === 0 ? 'error' : 'warning'}`} style={{ marginTop: 16 }}>
            <Icon name="alert" size={20} />
            <div>
              {r.stock === 0
                ? 'Este insumo está agotado: no hay existencias para la producción.'
                : `Quedan ${r.stock} ${r.calc_abreviatura}, en o por debajo del mínimo de ${r.calc_minimo}.`}
            </div>
          </div>
        )}

        <h3 className="det-section">Últimas compras asociadas</h3>
        <MiniTabla
          filas={ultimasCompras(r)}
          vacio="Este insumo no figura en ninguna compra."
          columnas={[
            { label: 'Compra', render: (x) => x.compra.calc_codigo },
            { label: 'Fecha', render: (x) => fecha(x.compra.fecha) },
            { label: 'Proveedor', render: (x) => x.compra.calc_proveedor },
            { label: 'Cantidad', align: 'right', render: (x) => `${x.cantidad} ${r.calc_abreviatura}` },
            { label: 'Precio de compra', align: 'right', render: (x) => <span className="money">{money(x.precio)}</span> },
            { label: 'Estado', render: (x) => <Badge>{x.compra.estado}</Badge> },
          ]}
        />

        <h3 className="det-section">Movimientos de inventario</h3>
        <MiniTabla
          filas={movimientosInventario(r)}
          vacio="Este insumo no tiene movimientos de inventario."
          columnas={[
            { label: 'Fecha', render: (x) => fecha(x.fecha) },
            { label: 'Tipo', render: (x) => <Badge tono={x.cantidad >= 0 ? 'success' : 'warning'} dot={false}>{x.tipo}</Badge> },
            { label: 'Origen', render: (x) => x.origen },
            { label: 'Cantidad', align: 'right', render: (x) => <strong>{x.cantidad > 0 ? '+' : ''}{x.cantidad} {r.calc_abreviatura}</strong> },
          ]}
        />
      </div>
    );
  };

  return (
    <CrudPage
      titulo="Insumos"
      subtitulo="Controle las existencias de materiales, su unidad de medida y su costo unitario."
      icono="package"
      modulo="Insumos"
      coleccion="insumos"
      renderDetalle={detalle}
      entidad="insumos"
      singular="insumo"
      searchKeys={['nombre', 'calc_tipo', 'calc_unidad']}
      filtros={[
        { key: 'id_tipo_insumo', label: 'Tipo de insumo', options: tipos },
        { key: 'id_unidad_medida', label: 'Unidad de medida', options: unidades },
        { key: 'estado', label: 'Estado', options: ESTADOS_REGISTRO },
      ]}
      defaults={{ stock: 0, stock_minimo: UMBRAL_STOCK_BAJO, estado: 'Activo' }}
      resumen={[
        <KpiCard key="a" label="Insumos registrados" value={db.insumos.length} icon="package" tono="primary" />,
        <KpiCard key="b" label="Bajo su mínimo" value={stats.bajoStock.length} icon="alert" tono="warning" />,
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
            /* La barra se llena contra el minimo de este insumo: llena = el
               doble del minimo, para que el amarillo caiga siempre a la mitad. */
            const pct = Math.min(100, (r.stock / Math.max(1, r.calc_minimo * 2)) * 100);
            return (
              <div style={{ minWidth: 118 }}>
                <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                  <strong>{r.stock}</strong>
                  <span className="caption">{r.calc_abreviatura}</span>
                </div>
                <div className={`bar ${n.tono}`}><i style={{ width: pct + '%' }} /></div>
                <div className="caption" style={{ marginTop: 3 }}>mín. {r.calc_minimo}</div>
              </div>
            );
          },
        },
        { key: 'precio_unitario', label: 'Precio unit.', align: 'right', mobile: 'value', render: (r) => <span className="money">{money(r.precio_unitario)}</span> },
        { key: 'calc_valor', label: 'Valor en stock', align: 'right', render: (r) => <span className="money">{money(r.calc_valor)}</span> },
        { key: 'disponibilidad', label: 'Disponibilidad', sortable: false, render: (r) => <Badge tono={nivel(r).badge}>{nivel(r).label}</Badge> },
        { key: 'estado', label: 'Estado', mobile: 'value', render: (r) => <EstadoCell row={r} coleccion="insumos" modulo="Insumos" options={ESTADOS_REGISTRO} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre del insumo', type: 'text', required: true, full: true },
        { name: 'id_tipo_insumo', label: 'Tipo de insumo', type: 'select', options: tipos, required: true },
        { name: 'id_unidad_medida', label: 'Unidad de medida', type: 'select', options: unidades, required: true },
        { name: 'stock', label: 'Existencias', type: 'number', required: true, min: 0 },
        {
          name: 'stock_minimo', label: 'Existencias mínimas', type: 'number', required: true, min: 0,
          hint: 'Cuando las existencias bajen hasta este número el insumo entrará en la alerta de inventario.',
        },
        { name: 'precio_unitario', label: 'Precio unitario (C$)', type: 'money', required: true, min: 0 },
        { name: 'estado', label: 'Estado', type: 'switch', full: true, soloEditar: true, hint: 'Un insumo inactivo sigue en el catálogo, pero ya no se ofrece para compra.' },
      ]}
    />
  );
}
