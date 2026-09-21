import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@shared/components/Icon.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import AreaChart from '@shared/components/charts/AreaChart.jsx';
import BarChart from '@shared/components/charts/BarChart.jsx';
import DonutChart from '@shared/components/charts/DonutChart.jsx';
import HBarChart from '@shared/components/charts/HBarChart.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { series, money, shortMoney, fecha, ESTADOS_PEDIDO, UMBRAL_STOCK_BAJO } from '@shared/data/mock.js';

const PERIODOS = ['Hoy', 'Semana', 'Mes', 'Año'];

const ETIQUETA_PERIODO = {
  Hoy: { periodo: 'de hoy', comparado: 'vs. ayer' },
  Semana: { periodo: 'de la semana', comparado: 'vs. semana anterior' },
  Mes: { periodo: 'del mes', comparado: 'vs. mes anterior' },
  'Año': { periodo: 'del año', comparado: 'vs. año anterior' },
};

const ACCESOS = [
  { to: '/app/pedidos', icon: 'clipboard', label: 'Nuevo pedido' },
  { to: '/app/compras', icon: 'cart', label: 'Registrar compra' },
  { to: '/app/abonos', icon: 'coin', label: 'Registrar abono' },
  { to: '/app/clientes', icon: 'users', label: 'Nuevo cliente' },
  { to: '/app/insumos', icon: 'package', label: 'Revisar inventario' },
  { to: '/app/productos', icon: 'shirt', label: 'Catálogo' },
];

/** Cabecera comun de cada tarjeta de grafico: titulo + tipo de grafico. */
function CabeceraGrafico({ titulo, tipo, tono = 'neutral' }) {
  return (
    <div className="between" style={{ marginBottom: 10 }}>
      <h2>{titulo}</h2>
      <span className={`badge badge-${tono}`}>{tipo}</span>
    </div>
  );
}

export default function Dashboard() {
  const { db, getStats } = useData();
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState('Mes');

  const stats = getStats(periodo);
  const s = series[periodo];
  const et = ETIQUETA_PERIODO[periodo];
  const t = stats.tendencias;

  const barras = ESTADOS_PEDIDO.map((e) => ({
    l: e.replace('Pedido ', '').replace(' / vendido', ''),
    v: stats.porEstado[e] || 0,
    color:
      e === 'Entregado / vendido' ? 'var(--success)'
      : e === 'Pedido en proceso' ? 'var(--warning)'
      : e === 'Cotización aprobada' ? 'var(--info)'
      : 'var(--primary)',
  }));

  const recientes = [...db.pedidos].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio)).slice(0, 5);
  const horaActual = new Date().getHours();
  const saludo = horaActual < 12 ? 'Buenos días' : horaActual < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="anim-page">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="sub">{saludo}, {user?.nombre?.split(' ')[0]}. Este es el estado general del negocio.</p>
          <div className="hero-rule" />
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {PERIODOS.map((p) => (
            <button key={p} className={`chip ${periodo === p ? 'is-on' : ''}`} onClick={() => setPeriodo(p)}>{p}</button>
          ))}
        </div>
      </div>

      {stats.bajoStock.length > 0 && (
        <div className="alert alert-warning anim-in" style={{ marginBottom: 16 }}>
          <Icon name="alert" size={20} />
          <div className="grow">
            <strong>Alerta de inventario.</strong>{' '}
            {stats.bajoStock.length} insumo(s) tienen {UMBRAL_STOCK_BAJO} unidades o menos en existencia:{' '}
            {stats.bajoStock.slice(0, 3).map((i) => i.nombre).join(', ')}
            {stats.bajoStock.length > 3 ? '…' : '.'}
          </div>
          <Link className="btn btn-sm btn-warning" to="/app/insumos">Revisar</Link>
        </div>
      )}

      {/* ---------- KPI: la variación se calcula contra el período anterior ---------- */}
      <div className="kpi-grid stagger">
        <KpiCard label={`Ventas ${et.periodo}`} value={stats.ventasMes} prefix="C$ " icon="coin" tono="success" trend={t.ventas} trendLabel={et.comparado} />
        <KpiCard label={`Compras ${et.periodo}`} value={stats.comprasMes} prefix="C$ " icon="cart" tono="primary" trend={t.compras} trendLabel={et.comparado} />
        <KpiCard label="Abonos por cobrar" value={stats.porCobrar} prefix="C$ " icon="dollar" tono="warning" trend={t.recaudado} trendLabel={`recaudo ${et.comparado}`} />
        <KpiCard label="Pedidos activos" value={stats.pedidosActivos} icon="clipboard" tono="info" trend={t.pedidos} trendLabel={et.comparado} />
        <KpiCard
          label={`Producto más vendido ${et.periodo}`}
          texto={stats.topProducto ? stats.topProducto.l : 'Sin ventas'}
          nota={stats.topProducto
            ? `${stats.topProducto.unidades} unidad(es) · ${money(stats.topProducto.v)}`
            : 'No se registraron ventas en el período.'}
          icon="shirt"
          tono="primary"
        />
      </div>

      {/* ---------- Gráficos 1 y 2 ---------- */}
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card chart-box">
          <CabeceraGrafico titulo="Ventas / Compras" tipo={`Línea de área · ${periodo}`} tono="info" />
          <AreaChart
            series={[
              { name: 'Ventas', color: 'var(--primary)', data: s.ventas },
              { name: 'Compras', color: 'var(--success)', data: s.compras },
            ]}
          />
        </div>

        <div className="card chart-box">
          <CabeceraGrafico titulo="Pedidos por estado" tipo="Barras" tono="success" />
          <BarChart data={barras} />
        </div>
      </div>

      {/* ---------- Gráficos 3 y 4 ---------- */}
      <div className="grid-2-eq" style={{ marginTop: 16 }}>
        <div className="card chart-box">
          <CabeceraGrafico titulo="Productos más vendidos" tipo="Barras horizontales" tono="primary" />
          <HBarChart
            data={stats.topProductos}
            color="var(--primary)"
            formato={shortMoney}
            vacio="No se registraron ventas en el período seleccionado."
          />
        </div>

        <div className="card chart-box">
          <CabeceraGrafico titulo="Compras por tipo de insumo" tipo="Dona" tono="warning" />
          {stats.comprasPorCategoria.length > 0 ? (
            <DonutChart data={stats.comprasPorCategoria} />
          ) : (
            <p className="caption" style={{ padding: '40px 0', textAlign: 'center' }}>
              No se registraron compras en el período seleccionado.
            </p>
          )}
        </div>
      </div>

      {/* ---------- Gráficos 5 y 6 ---------- */}
      <div className="grid-2-eq" style={{ marginTop: 16 }}>
        <div className="card chart-box">
          <CabeceraGrafico titulo="Recaudo por método de pago" tipo="Dona" tono="success" />
          {stats.recaudoPorMetodo.length > 0 ? (
            <DonutChart data={stats.recaudoPorMetodo} />
          ) : (
            <p className="caption" style={{ padding: '40px 0', textAlign: 'center' }}>
              No se registraron abonos en el período seleccionado.
            </p>
          )}
        </div>

        <div className="card chart-box">
          <CabeceraGrafico titulo="Insumos con menores existencias" tipo="Barras horizontales · actual" tono="error" />
          <HBarChart
            data={stats.existencias}
            formato={(v) => v.toLocaleString('es-NI')}
            umbral={UMBRAL_STOCK_BAJO}
            etiquetaUmbral="Existencias mínimas"
          />
        </div>
      </div>

      {/* ---------- Detalle operativo ---------- */}
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head">
            <h2>Pedidos recientes</h2>
            <Link className="btn btn-sm btn-ghost" to="/app/pedidos">Ver todos <Icon name="chevR" size={14} /></Link>
          </div>
          <div className="table-scroll">
            <table className="tbl">
              <thead>
                <tr><th>Pedido</th><th>Cliente</th><th>Fecha de inicio</th><th style={{ textAlign: 'right' }}>Total</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {recientes.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-main">PED-{String(p.id).padStart(4, '0')}</td>
                    <td className="muted">{p.calc_cliente}</td>
                    <td className="caption">{fecha(p.fecha_inicio)}</td>
                    <td className="right"><span className="money">{money(p.calc_total)}</span></td>
                    <td><EstadoCell row={p} coleccion="pedidos" etiqueta="estado del pedido" options={ESTADOS_PEDIDO} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mlist">
            {recientes.map((p) => (
              <div className="mrow" key={p.id}>
                <div className="m-body">
                  <div className="m-title">PED-{String(p.id).padStart(4, '0')} · {p.calc_cliente}</div>
                  <div className="m-meta"><span>{fecha(p.fecha_inicio)}</span><EstadoCell row={p} coleccion="pedidos" etiqueta="estado del pedido" options={ESTADOS_PEDIDO} /></div>
                </div>
                <span className="money">{money(p.calc_total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
