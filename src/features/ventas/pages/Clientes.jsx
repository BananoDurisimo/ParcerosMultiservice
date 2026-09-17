import CrudPage from '@shared/components/CrudPage.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import Icon from '@shared/components/Icon.jsx';
import { iniciales } from '@shared/context/AuthContext.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { TIPOS_DOCUMENTO } from '@shared/data/mock.js';

/** Tabla `cliente`: nombre, tipodocumento, documento, telefono, correo, direccion. */
export default function Clientes() {
  const { db, stats } = useData();

  return (
    <CrudPage
      titulo="Clientes"
      subtitulo="Información comercial de los clientes para el seguimiento de cotizaciones, pedidos y ventas."
      icono="users"
      coleccion="clientes"
      entidad="clientes"
      singular="cliente"
      searchKeys={['nombre', 'documento', 'correo', 'telefono']}
      filtros={[{ key: 'tipodocumento', label: 'Tipo de documento', options: TIPOS_DOCUMENTO }]}
      defaults={{ tipodocumento: 'RUC' }}
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
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre o razón social', type: 'text', required: true },
        { name: 'tipodocumento', label: 'Tipo de documento', type: 'select', options: TIPOS_DOCUMENTO, required: true },
        { name: 'documento', label: 'Número de documento', type: 'text', required: true, hint: 'No puede repetirse: la columna es única.' },
        { name: 'correo', label: 'Correo electrónico', type: 'email', required: true, hint: 'No puede repetirse: la columna es única.' },
        { name: 'telefono', label: 'Teléfono', type: 'tel' },
        { name: 'direccion', label: 'Dirección', type: 'text', full: true },
      ]}
    />
  );
}
