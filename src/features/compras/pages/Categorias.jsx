import CrudPage from '@shared/components/CrudPage.jsx';

/** Tabla `categoria`: id_categoria, nombre. */
export default function Categorias() {
  return (
    <CrudPage
      titulo="Categorías"
      subtitulo="Clasifique el catálogo para facilitar la consulta y la selección de productos."
      icono="category"
      coleccion="categorias"
      entidad="categorías"
      singular="categoría"
      searchKeys={['nombre']}
      conDetalle={false}
      columnas={[
        { key: 'nombre', label: 'Categoría', mobile: 'title', render: (r) => <span className="cell-main">{r.nombre}</span> },
        { key: 'calc_productos', label: 'Productos', align: 'center', mobile: 'value', render: (r) => <span className="badge badge-info">{r.calc_productos}</span> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre de la categoría', type: 'text', required: true, noSpecial: true, unique: true, full: true, hint: 'No puede repetirse: la columna es única.' },
      ]}
    />
  );
}
