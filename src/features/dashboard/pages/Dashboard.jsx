import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@shared/components/Icon.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import Badge from '@shared/components/ui/Badge.jsx';
import AreaChart from '@shared/components/charts/AreaChart.jsx';
import BarChart from '@shared/components/charts/BarChart.jsx';
import DonutChart from '@shared/components/charts/DonutChart.jsx';
import HBarChart from '@shared/components/charts/HBarChart.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { money, fecha, ESTADOS_PEDIDO, COTIZACION, EN_PROCESO, ENTREGADO } from '@shared/data/mock.js';

const PERIODOS = ['Hoy', 'Semana', 'Mes', 'Año'];

const ETIQUETA_PERIODO = {
  Hoy: { periodo: 'de hoy', comparado: 'vs. ayer' },
  Semana: { periodo: 'de la semana', comparado: 'vs. semana anterior' },
  Mes: { periodo: 'del mes', comparado: 'vs. mes anterior' },
  'Año': { periodo: 'del año', comparado: 'vs. año anterior' },
};

/* Que parte del negocio ve cada rol: los indicadores de ventas los ve quien
   tiene algun permiso del proceso de ventas, y los de compras quien tiene
   alguno del proceso de compras. El Administrador y el Gerente tienen todos. */
const PERMISOS_VENTAS = ['Cotizaciones', 'Pedidos', 'Ventas', 'Abonos'];
const PERMISOS_COMPRAS = ['Compras', 'Insumos', 'Proveedores'];

/** Cabecera comun de cada tarjeta de grafico: titulo + tipo de grafico. */
function CabeceraGrafico({ titulo, tipo, tono = 'neutral' }) {
  return (
    <div className="between" style={{ marginBottom: 10 }}>
      <h2>{titulo}</h2>
      <span className={`badge badge-${tono}`}>{tipo}</span>
    </div>
  );
}

/** Dos tarjetas lado a lado, o una sola a todo el ancho si el rol solo ve una. */
function Fila({ children, clase = 'grid-2-eq' }) {
  const items = children.filter(Boolean);
  if (!items.length) return null;
  return <div className={items.length > 1 ? clase : ''} style={{ marginTop: 16 }}>{items}</div>;
}

export default function Dashboard() {
  const { db, getStats } = useData();
  const { user, puede } = useAuth();
  const [periodo, setPeriodo] = useState('Mes');

  const verVentas = puede(PERMISOS_VENTAS);
  const verCompras = puede(PERMISOS_COMPRAS);

  const stats = getStats(periodo);
  const et = ETIQUETA_PERIODO[periodo];
  const t = stats.tendencias;

  const barras = ESTADOS_PEDIDO.map((e) => ({
    l: e.replace(' por el cliente', '').replace('Pedido ', '').replace(' / vendido', ''),
    v: stats.porEstado[e] || 0,
    color:
      e === ENTREGADO ? 'var(--success)'
      : e === EN_PROCESO ? 'var(--warning)'
      : e === COTIZACION ? 'var(--info)'
      : 'var(--primary)',
  }));

  const recientes = [...db.pedidos]
    .sort((a, b) => (b.fecha_inicio || b.fecha_creacion).localeCompare(a.fecha_inicio || a.fecha_creacion))
    .slice(0, 5);
  const horaActual = new Date().getHours();
  const saludo = horaActual < 12 ? 'Buenos días' : horaActual < 19 ? 'Buenas tardes' : 'Buenas noches';

  const series = [
    verVentas && { name: 'Ventas', color: 'var(--primary)', data: stats.serie.ventas },
    verCompras && { name: 'Compras', color: 'var(--success)', data: stats.serie.compras },
  ].filter(Boolean);

  return (
    <div className="anim-page">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="sub">{saludo}, {user?.nombre?.split(' ')[0]}. Este es el estado general {verVentas && verCompras ? 'del negocio' : 'de su proceso'}.</p>
          <div className="hero-rule" />
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {PERIODOS.map((p) => (
            <button key={p} className={`chip ${periodo === p ? 'is-on' : ''}`} onClick={() => setPeriodo(p)}>{p}</button>
          ))}
        </div>
      </div>

      {verCompras && stats.bajoStock.length > 0 && (
        <div className="alert alert-warning anim-in" style={{ marginBottom: 16 }}>
          <Icon name="alert" size={20} />
          <div className="grow">
            <strong>Alerta de inventario.</strong>{' '}
            {stats.bajoStock.length} insumo(s) están en o por debajo de sus existencias mínimas:{' '}
            {stats.bajoStock.slice(0, 3).map((i) => i.nombre).join(', ')}
            {stats.bajoStock.length > 3 ? '…' : '.'}
          </div>
          {puede('Insumos') && <Link className="btn btn-sm btn-warning" to="/app/insumos">Revisar</Link>}
        </div>
      )}

      {!verVentas && !verCompras && (
        <div className="card empty">
          <div className="ico-wrap"><Icon name="chart" size={22} /></div>
          <div style={{ fontWeight: 500, color: 'var(--text)' }}>Sin indicadores</div>
          <p className="caption" style={{ marginTop: 4 }}>Su rol no tiene permisos sobre los procesos de compras ni de ventas.</p>
        </div>
      )}

      {/* ---------- KPI: la variación se calcula contra el período anterior ---------- */}
      <div className="kpi-grid stagger">
        {verVentas && <KpiCard label={`Ventas ${et.periodo}`} value={stats.ventasMes} prefix="C$ " icon="coin" tono="success" trend={t.ventas} trendLabel={et.comparado} />}
        {verCompras && <KpiCard label={`Compras ${et.periodo}`} value={stats.comprasMes} prefix="C$ " icon="cart" tono="primary" trend={t.compras} trendLabel={et.comparado} />}
        {verVentas && <KpiCard label="Abonos por cobrar" value={stats.porCobrar} prefix="C$ " icon="dollar" tono="warning" trend={t.recaudado} trendLabel={`recaudo ${et.comparado}`} />}
        {verVentas && <KpiCard label="Pedidos activos" value={stats.pedidosActivos} icon="clipboard" tono="info" trend={t.pedidos} trendLabel={et.comparado} />}
        {verCompras && <KpiCard label="Insumos bajo su mínimo" value={stats.bajoStock.length} icon="package" tono="error" />}
      </div>

      <Fila clase="grid-2">
        {series.length > 0 && (
          <div className="card chart-box" key="area">
            <CabeceraGrafico titulo={series.map((s) => s.name).join(' / ')} tipo={`Línea de área · ${periodo === 'Hoy' ? 'últimos 7 días' : periodo}`} tono="info" />
            <AreaChart series={series} />
          </div>
        )}
        {verVentas && (
          <div className="card chart-box" key="estado">
            <CabeceraGrafico titulo="Pedidos por estado" tipo="Barras" tono="success" />
            <BarChart data={barras} />
          </div>
        )}
      </Fila>

      <Fila>
        {verCompras && (
          <div className="card chart-box" key="tipo">
            <CabeceraGrafico titulo="Compras por tipo de insumo" tipo="Dona" tono="warning" />
            {stats.comprasPorCategoria.length > 0 ? (
              <DonutChart data={stats.comprasPorCategoria} />
            ) : (
              <p className="caption" style={{ padding: '40px 0', textAlign: 'center' }}>
                No se registraron compras en el período seleccionado.
              </p>
            )}
          </div>
        )}
        {verVentas && (
          <div className="card chart-box" key="metodo">
            <CabeceraGrafico titulo="Recaudo por método de pago" tipo="Dona" tono="success" />
            {stats.recaudoPorMetodo.length > 0 ? (
              <DonutChart data={stats.recaudoPorMetodo} />
            ) : (
              <p className="caption" style={{ padding: '40px 0', textAlign: 'center' }}>
                No se registraron abonos en el período seleccionado.
              </p>
            )}
          </div>
        )}
      </Fila>

      <Fila clase="grid-2">
        {verVentas && (
          <div className="card" key="recientes">
            <div className="card-head">
              <h2>Registros recientes</h2>
              {puede(['Cotizaciones', 'Pedidos', 'Ventas']) && <Link className="btn btn-sm btn-ghost" to="/app/pedidos">Ver todos <Icon name="chevR" size={14} /></Link>}
            </div>
            <div className="table-scroll">
              <table className="tbl">
                <thead>
                  <tr><th>Código</th><th>Cliente</th><th>Fecha</th><th style={{ textAlign: 'right' }}>Total</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {recientes.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-main">{p.calc_codigo}</td>
                      <td className="muted">{p.calc_cliente}</td>
                      <td className="caption">{fecha(p.fecha_inicio || p.fecha_creacion)}</td>
                      <td className="right"><span className="money">{money(p.calc_total)}</span></td>
                      <td><Badge>{p.estado}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mlist">
              {recientes.map((p) => (
                <div className="mrow" key={p.id}>
                  <div className="m-body">
                    <div className="m-title">{p.calc_codigo} · {p.calc_cliente}</div>
                    <div className="m-meta"><span>{fecha(p.fecha_inicio || p.fecha_creacion)}</span><Badge>{p.estado}</Badge></div>
                  </div>
                  <span className="money">{money(p.calc_total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {verCompras && (
          <div className="card chart-box" key="existencias">
            <CabeceraGrafico titulo="Insumos con menores existencias" tipo="Barras horizontales · actual" tono="error" />
            <HBarChart data={stats.existencias} formato={(v) => v.toLocaleString('es-NI')} />
          </div>
        )}
      </Fila>
    </div>
  );
}
