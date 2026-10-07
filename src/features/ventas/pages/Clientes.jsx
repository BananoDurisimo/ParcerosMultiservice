import CrudPage from '@shared/components/CrudPage.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import Icon from '@shared/components/Icon.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import Badge from '@shared/components/ui/Badge.jsx';
import MiniTabla from '@shared/components/ui/MiniTabla.jsx';
import { iniciales } from '@shared/context/AuthContext.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, fecha, TIPOS_DOCUMENTO, ESTADOS_REGISTRO, COTIZACION, ENTREGADO } from '@shared/data/mock.js';

/** Etapa comercial del registro: cotizacion, pedido o venta. */
const etapa = (p) => (p.estado === COTIZACION ? 'Cotización' : p.estado === ENTREGADO ? 'Venta' : 'Pedido');

/** Tabla `cliente`: nombre, tipodocumento, documento, telefono, correo,
 *  direccion, estado. */
export default function Clientes() {
  const { db, stats } = useData();

  const detalle = (r) => (
    <div>
      <div className="detail-grid">
        <div className="detail-item"><div className="dl">Nombre o razón social</div><div className="dv">{r.nombre}</div></div>
        <div className="detail-item"><div className="dl">Documento</div><div className="dv">{r.tipodocumento}: {r.documento}</div></div>
        <div className="detail-item"><div className="dl">Correo electrónico</div><div className="dv">{r.correo || '—'}</div></div>
        <div className="detail-item"><div className="dl">Teléfono</div><div className="dv">{r.telefono || '—'}</div></div>
        <div className="detail-item"><div className="dl">Dirección</div><div className="dv">{r.direccion || '—'}</div></div>
        <div className="detail-item"><div className="dl">Estado</div><div className="dv"><Badge>{r.estado}</Badge></div></div>
      </div>

      <h3 className="det-section">Historial comercial</h3>
      <MiniTabla
        filas={db.pedidos.filter((p) => p.id_cliente === r.id).sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion))}
        vacio="El cliente todavía no tiene cotizaciones, pedidos ni ventas."
        columnas={[
          { label: 'Código', render: (p) => p.calc_codigo },
          { label: 'Tipo', render: (p) => <Badge tono="neutral" dot={false}>{etapa(p)}</Badge> },
          { label: 'Fecha de creación', render: (p) => fecha(p.fecha_creacion) },
          { label: 'Total', align: 'right', render: (p) => <span className="money">{money(p.calc_total)}</span> },
          { label: 'Saldo pendiente', align: 'right', render: (p) => <span className="money">{money(p.calc_saldo)}</span> },
          { label: 'Estado', render: (p) => <Badge>{p.estado}</Badge> },
        ]}
      />
    </div>
  );

  return (
    <CrudPage
      titulo="Clientes"
      subtitulo="Clubes, ligas, academias y equipos: datos de contacto e historial de cotizaciones, pedidos y ventas."
      icono="users"
      modulo="Clientes"
      coleccion="clientes"
      renderDetalle={detalle}
      entidad="clientes"
      singular="cliente"
      searchKeys={['nombre', 'documento', 'correo', 'telefono']}
      eliminacion={{
        validar: (r) => (r.calc_pedidos > 0
          ? `${r.nombre} tiene ${r.calc_pedidos} cotización(es), pedido(s) o venta(s) registradas. Para conservar su historial, desactívelo en lugar de eliminarlo.`
          : null),
      }}
      filtros={[
        { key: 'tipodocumento', label: 'Tipo de documento', options: TIPOS_DOCUMENTO },
        { key: 'estado', label: 'Estado', options: ESTADOS_REGISTRO },
      ]}
      defaults={{ tipodocumento: 'RUC', estado: 'Activo' }}
      resumen={[
        <KpiCard key="a" label="Clientes registrados" value={db.clientes.length} icon="users" tono="primary" />,
        <KpiCard key="b" label="Pedidos acumulados" value={stats.totalPedidos} icon="clipboard" tono="info" />,
        <KpiCard key="c" label="Saldo por cobrar" value={stats.porCobrar} prefix="C$ " icon="alert" tono="warning" />,
      ]}
      columnas={[
        {
          key: 'nombre', label: 'Cliente', mobile: 'title',
          render: (r) => (
            <div className="row">
              <span className="avatar" style={{ background: 'var(--secondary)' }}>{iniciales(r.nombre)}</span>
              <div>
                <div className="cell-main">{r.nombre}</div>
                <div className="caption">{r.tipodocumento}: {r.documento}</div>
              </div>
            </div>
          ),
        },
        { key: 'tipodocumento', label: 'Tipo doc.', mobile: 'meta', render: (r) => <span className="badge badge-neutral">{r.tipodocumento}</span> },
        { key: 'telefono', label: 'Teléfono', mobile: 'meta', render: (r) => <span className="muted row" style={{ gap: 6 }}><Icon name="phone" size={14} /> {r.telefono || '—'}</span> },
        { key: 'correo', label: 'Correo', render: (r) => <span className="muted">{r.correo}</span> },
        { key: 'direccion', label: 'Dirección', render: (r) => <span className="caption">{r.direccion || '—'}</span> },
        { key: 'calc_pedidos', label: 'Pedidos', align: 'center', mobile: 'value', render: (r) => <span className="badge badge-info">{r.calc_pedidos}</span> },
        { key: 'estado', label: 'Estado', mobile: 'meta', render: (r) => <EstadoCell row={r} coleccion="clientes" modulo="Clientes" options={ESTADOS_REGISTRO} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre o razón social', type: 'text', required: true, noSpecial: true, minLength: 3, maxLength: 80 },
        { name: 'tipodocumento', label: 'Tipo de documento', type: 'select', options: TIPOS_DOCUMENTO, required: true },
        { name: 'documento', label: 'Número de documento', type: 'text', required: true, unique: true, alfanumerico: true, minLength: 5, maxLength: 20, hint: 'No puede repetirse: la columna es única.' },
        { name: 'correo', label: 'Correo electrónico', type: 'email', required: true, unique: true, hint: 'No puede repetirse: la columna es única.' },
        { name: 'telefono', label: 'Teléfono', type: 'tel' },
        { name: 'direccion', label: 'Dirección', type: 'text', full: true, maxLength: 150 },
        { name: 'estado', label: 'Estado', type: 'switch', full: true, soloEditar: true, hint: 'Un cliente inactivo conserva sus pedidos y abonos, pero ya no se propone para pedidos nuevos.' },
      ]}
    />
  );
}
