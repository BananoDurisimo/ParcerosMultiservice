import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, ESTADOS_REGISTRO } from '@shared/data/mock.js';

/** Tabla `producto`: id_categoria, nombre, descripcion, precio, estado.
 *  Las tallas y las existencias pertenecen a `varianteproducto`, por eso
 *  aparecen como información derivada y no como campos del formulario. */
export default function Productos() {
  const { db, opciones } = useData();
  const categorias = opciones('categorias');

  return (
    <CrudPage
      titulo="Productos"
      subtitulo="Catálogo digital con precios base para cotizaciones y pedidos."
      icono="shirt"
      coleccion="productos"
      entidad="productos"
      singular="producto"
      searchKeys={['nombre', 'descripcion', 'calc_categoria']}
      filtros={[
        { key: 'id_categoria', label: 'Categoría', options: categorias },
        { key: 'estado', label: 'Estado', options: ESTADOS_REGISTRO },
      ]}
      defaults={{ estado: 'Activo' }}
      columnas={[
        {
          key: 'nombre', label: 'Producto', mobile: 'title',
          render: (r) => (
            <div className="row">
              <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flex: 'none' }}>
                {r.nombre.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div className="cell-main">{r.nombre}</div>
                <div className="caption">{r.calc_categoria}</div>
              </div>
            </div>
          ),
        },
        { key: 'descripcion', label: 'Descripción', render: (r) => <span className="muted">{r.descripcion || '—'}</span> },
        { key: 'calc_tallas', label: 'Tallas', sortable: false, mobile: 'meta', render: (r) => <span className="caption">{r.calc_tallas.join(' · ') || '—'}</span> },
        { key: 'calc_stock', label: 'Existencias', align: 'center', mobile: 'meta', render: (r) => <strong>{r.calc_stock}</strong> },
        { key: 'precio', label: 'Precio', align: 'right', mobile: 'value', render: (r) => <span className="money">{money(r.precio)}</span> },
        { key: 'estado', label: 'Estado', mobile: 'meta', render: (r) => <EstadoCell row={r} coleccion="productos" options={ESTADOS_REGISTRO} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre del producto', type: 'text', required: true },
        { name: 'id_categoria', label: 'Categoría', type: 'select', options: categorias, required: true },
        { name: 'precio', label: 'Precio (C$)', type: 'money', required: true, min: 0 },
        { name: 'estado', label: 'Estado', type: 'switch' },
        { name: 'descripcion', label: 'Descripción', type: 'textarea', full: true, placeholder: 'Materiales, acabados y detalles de confección…' },
      ]}
      renderDetalle={(r) => (
        <div>
          <div className="detail-grid">
            <div className="detail-item"><div className="dl">Producto</div><div className="dv">{r.nombre}</div></div>
            <div className="detail-item"><div className="dl">Categoría</div><div className="dv">{r.calc_categoria}</div></div>
            <div className="detail-item"><div className="dl">Precio</div><div className="dv money">{money(r.precio)}</div></div>
            <div className="detail-item"><div className="dl">Estado</div><div className="dv">{r.estado}</div></div>
            <div className="detail-item full"><div className="dl">Descripción</div><div className="dv">{r.descripcion || '—'}</div></div>
          </div>

          <h3 style={{ margin: '18px 0 10px' }}>Variantes por talla</h3>
          <div className="items-box">
            <div className="items-row head"><span>Talla</span><span>Existencias</span><span>Imagen</span><span style={{ width: 34 }} /></div>
            {db.variantes.filter((v) => v.id_producto === r.id).map((v) => (
              <div className="items-row" key={v.id}>
                <span style={{ fontSize: 13 }}>{v.calc_talla}</span>
                <span style={{ fontSize: 13 }}>{v.stock}</span>
                <span className="caption">{v.url_imagen ? 'Cargada' : 'Sin imagen'}</span>
                <span style={{ width: 34 }} />
              </div>
            ))}
            <div className="items-foot">
              <span className="caption">{r.calc_variantes} variante(s)</span>
              <strong>Total en existencia: {r.calc_stock}</strong>
            </div>
          </div>
        </div>
      )}
    />
  );
}
