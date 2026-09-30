import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, ESTADOS_REGISTRO } from '@shared/data/mock.js';

/** Tabla `producto`: id_categoria, nombre, precio, estado.
 *  Las tallas no se administran ni se consultan aquí: pertenecen a
 *  `varianteproducto` y viven en el módulo Variante producto. De ellas este
 *  catálogo solo conserva la suma de existencias de todas las variantes. */
export default function Productos() {
  const { opciones } = useData();
  const categorias = opciones('categorias');

  return (
    <CrudPage
      titulo="Productos"
      subtitulo="Catálogo de uniformes y accesorios deportivos con precios base para cotizaciones y pedidos."
      icono="shirt"
      coleccion="productos"
      entidad="productos"
      singular="producto"
      searchKeys={['nombre', 'calc_categoria']}
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
        { key: 'calc_stock', label: 'Existencias totales', align: 'center', mobile: 'meta', render: (r) => <strong>{r.calc_stock}</strong> },
        { key: 'precio', label: 'Precio', align: 'right', mobile: 'value', render: (r) => <span className="money">{money(r.precio)}</span> },
        { key: 'estado', label: 'Estado', mobile: 'meta', render: (r) => <EstadoCell row={r} coleccion="productos" options={ESTADOS_REGISTRO} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre del producto', type: 'text', required: true },
        { name: 'id_categoria', label: 'Categoría', type: 'select', options: categorias, required: true },
        { name: 'precio', label: 'Precio (C$)', type: 'money', required: true, min: 0 },
        { name: 'estado', label: 'Estado', type: 'switch', full: true, soloEditar: true, hint: 'Un producto inactivo sigue en el catálogo, pero ya no se ofrece.' },
      ]}
      renderDetalle={(r) => (
        <div className="detail-grid">
          <div className="detail-item"><div className="dl">Producto</div><div className="dv">{r.nombre}</div></div>
          <div className="detail-item"><div className="dl">Categoría</div><div className="dv">{r.calc_categoria}</div></div>
          <div className="detail-item"><div className="dl">Precio</div><div className="dv money">{money(r.precio)}</div></div>
          <div className="detail-item"><div className="dl">Existencias totales</div><div className="dv">{r.calc_stock}</div></div>
          <div className="detail-item"><div className="dl">Estado</div><div className="dv">{r.estado}</div></div>
        </div>
      )}
    />
  );
}
