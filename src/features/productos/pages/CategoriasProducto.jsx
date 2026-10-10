import { useNavigate } from 'react-router-dom';
import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import Badge from '@shared/components/ui/Badge.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import MiniTabla from '@shared/components/ui/MiniTabla.jsx';
import Icon from '@shared/components/Icon.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, ESTADOS_REGISTRO } from '@shared/data/mock.js';

/** Tabla `categoria_producto`: el tipo de prenda (Jersey, Short, Camiseta,
 *  Medias…). Agrupa los productos base para buscarlos y filtrarlos. */
export default function CategoriasProducto() {
  const { db } = useData();
  const navigate = useNavigate();

  const detalle = (r) => (
    <div>
      <div className="detail-grid">
        <div className="detail-item"><div className="dl">Categoría</div><div className="dv">{r.nombre}</div></div>
        <div className="detail-item"><div className="dl">Productos</div><div className="dv">{r.calc_productos}</div></div>
        <div className="detail-item full"><div className="dl">Descripción</div><div className="dv">{r.descripcion || '—'}</div></div>
        <div className="detail-item"><div className="dl">Estado</div><div className="dv"><Badge>{r.estado}</Badge></div></div>
      </div>
      <h3 className="det-section">Productos de la categoría</h3>
      <MiniTabla
        filas={db.productos.filter((p) => p.id_categoria_producto === r.id)}
        vacio="Todavía no hay productos en esta categoría."
        columnas={[
          { label: 'Producto', render: (p) => p.nombre },
          { label: 'Talla', render: (p) => p.calc_talla },
          { label: 'Tela', render: (p) => p.calc_tela },
          { label: 'Precio de venta', align: 'right', render: (p) => <span className="money">{money(p.precio_venta)}</span> },
          { label: 'Estado', render: (p) => <Badge>{p.estado}</Badge> },
        ]}
      />
    </div>
  );

  return (
    <CrudPage
      titulo="Categorías de producto"
      subtitulo="Tipos de prenda con que se agrupan los productos base: jersey, short, camiseta, medias…"
      icono="category"
      modulo="Categorías de producto"
      coleccion="categorias_producto"
      entidad="categorías"
      singular="categoría"
      renderDetalle={detalle}
      searchKeys={['nombre', 'descripcion']}
      filtros={[{ key: 'estado', label: 'Estado', options: ESTADOS_REGISTRO }]}
      defaults={{ estado: 'Activo', descripcion: '' }}
      eliminacion={{
        validar: (r) => (r.calc_productos
          ? `${r.nombre} tiene ${r.calc_productos} producto(s). Para conservarlos, desactívela en lugar de eliminarla.`
          : null),
      }}
      pageActions={
        <button className="btn" onClick={() => navigate('/app/productos')}>
          <Icon name="shirt" size={16} /> Ir a productos
        </button>
      }
      resumen={[
        <KpiCard key="a" label="Categorías" value={db.categorias_producto.length} icon="category" tono="primary" />,
        <KpiCard key="b" label="Activas" value={db.categorias_producto.filter((c) => c.estado === 'Activo').length} icon="checkC" tono="success" />,
        <KpiCard key="c" label="Productos registrados" value={db.productos.length} icon="shirt" tono="info" />,
      ]}
      columnas={[
        { key: 'nombre', label: 'Categoría', mobile: 'title', render: (r) => <span className="cell-main">{r.nombre}</span> },
        { key: 'descripcion', label: 'Descripción', mobile: 'meta', render: (r) => <span className="caption">{r.descripcion || '—'}</span> },
        { key: 'calc_productos', label: 'Productos', align: 'center', mobile: 'value', render: (r) => <span className="badge badge-info">{r.calc_productos}</span> },
        { key: 'estado', label: 'Estado', mobile: 'meta', render: (r) => <EstadoCell row={r} coleccion="categorias_producto" modulo="Categorías de producto" options={ESTADOS_REGISTRO} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre de la categoría', type: 'text', required: true, noSpecial: true, unique: true, maxLength: 60, full: true, placeholder: 'Ej.: Jersey' },
        { name: 'descripcion', label: 'Descripción', type: 'textarea', full: true, maxLength: 200, placeholder: 'Ej.: Camisetas deportivas de manga corta para competencia.' },
        { name: 'estado', label: 'Estado', type: 'switch', full: true, soloEditar: true, hint: 'Una categoría inactiva ya no se ofrece para productos nuevos.' },
      ]}
    />
  );
}
