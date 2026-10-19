import { useNavigate } from 'react-router-dom';
import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import Badge from '@shared/components/ui/Badge.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import MiniTabla from '@shared/components/ui/MiniTabla.jsx';
import Icon from '@shared/components/Icon.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, ESTADOS_REGISTRO } from '@shared/data/mock.js';

/** Tabla `tipo_insumo`: la categoria de cada insumo (Tela, Hilo, Estampado,
 *  Accesorio, Cinta…). Agrupa los insumos y dice que suministra cada
 *  proveedor. Una categoria inactiva se sigue viendo en lo ya registrado,
 *  pero no se ofrece para insumos ni proveedores nuevos. */
export default function CategoriasInsumo() {
  const { db } = useData();
  const navigate = useNavigate();

  const detalle = (r) => (
    <div>
      <div className="detail-grid">
        <div className="detail-item"><div className="dl">Categoría</div><div className="dv">{r.nombre}</div></div>
        <div className="detail-item"><div className="dl">Estado</div><div className="dv"><Badge>{r.estado}</Badge></div></div>
        <div className="detail-item full"><div className="dl">Descripción</div><div className="dv">{r.descripcion || '—'}</div></div>
      </div>

      <h3 className="det-section">Insumos de la categoría</h3>
      <MiniTabla
        filas={db.insumos.filter((i) => i.id_tipo_insumo === r.id)}
        vacio="Todavía no hay insumos en esta categoría."
        columnas={[
          { label: 'Insumo', render: (i) => i.nombre },
          { label: 'Existencias', align: 'right', render: (i) => `${i.stock} ${i.calc_abreviatura}` },
          { label: 'Precio unit.', align: 'right', render: (i) => <span className="money">{money(i.precio_unitario)}</span> },
          { label: 'Estado', render: (i) => <Badge>{i.estado}</Badge> },
        ]}
      />

      <h3 className="det-section">Proveedores que la suministran</h3>
      <MiniTabla
        filas={db.proveedores.filter((p) => p.id_tipo_insumo === r.id)}
        vacio="Ningún proveedor suministra esta categoría."
        columnas={[
          { label: 'Proveedor', render: (p) => p.nombre },
          { label: 'Teléfono', render: (p) => p.telefono || '—' },
          { label: 'Estado', render: (p) => <Badge>{p.estado}</Badge> },
        ]}
      />
    </div>
  );

  return (
    <CrudPage
      titulo="Categorías de insumo"
      subtitulo="Clasificación de los insumos (tela, hilo, estampado, accesorio, cinta…) y de lo que suministra cada proveedor."
      icono="category"
      modulo="Categorías de insumo"
      coleccion="tipos_insumo"
      entidad="categorías"
      singular="categoría"
      renderDetalle={detalle}
      searchKeys={['nombre', 'descripcion']}
      filtros={[{ key: 'estado', label: 'Estado', options: ESTADOS_REGISTRO }]}
      defaults={{ estado: 'Activo', descripcion: '' }}
      eliminacion={{
        validar: (r) => {
          if (!r.calc_insumos && !r.calc_proveedores) return null;
          return `${r.nombre} está asignada a ${[r.calc_insumos && `${r.calc_insumos} insumo(s)`, r.calc_proveedores && `${r.calc_proveedores} proveedor(es)`].filter(Boolean).join(' y ')}. Para conservarlos, desactívela en lugar de eliminarla.`;
        },
      }}
      pageActions={
        <button className="btn" onClick={() => navigate('/app/insumos')}>
          <Icon name="package" size={16} /> Ir a insumos
        </button>
      }
      resumen={[
        <KpiCard key="a" label="Categorías" value={db.tipos_insumo.length} icon="category" tono="primary" />,
        <KpiCard key="b" label="Activas" value={db.tipos_insumo.filter((t) => t.estado === 'Activo').length} icon="checkC" tono="success" />,
        <KpiCard key="c" label="Insumos registrados" value={db.insumos.length} icon="package" tono="info" />,
      ]}
      columnas={[
        { key: 'nombre', label: 'Categoría', mobile: 'title', render: (r) => <span className="cell-main">{r.nombre}</span> },
        { key: 'descripcion', label: 'Descripción', mobile: 'meta', render: (r) => <span className="caption">{r.descripcion || '—'}</span> },
        { key: 'calc_insumos', label: 'Insumos', align: 'center', mobile: 'value', render: (r) => <span className="badge badge-info">{r.calc_insumos}</span> },
        { key: 'calc_proveedores', label: 'Proveedores', align: 'center', render: (r) => <span className="badge badge-neutral">{r.calc_proveedores}</span> },
        { key: 'estado', label: 'Estado', mobile: 'meta', render: (r) => <EstadoCell row={r} coleccion="tipos_insumo" modulo="Categorías de insumo" options={ESTADOS_REGISTRO} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre de la categoría', type: 'text', required: true, noSpecial: true, unique: true, maxLength: 40, full: true, placeholder: 'Ej.: Cinta' },
        { name: 'descripcion', label: 'Descripción', type: 'textarea', full: true, maxLength: 200, placeholder: 'Ej.: Cintas, tirantes y elásticos para licras y uniformes.' },
        { name: 'estado', label: 'Estado', type: 'switch', full: true, soloEditar: true, hint: 'Una categoría inactiva ya no se ofrece para insumos ni proveedores nuevos.' },
      ]}
    />
  );
}
