import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import { ESTADOS_REGISTRO } from '@shared/data/mock.js';

/** Tabla `categoria`: id_categoria, nombre, estado. */
export default function Categorias() {
  return (
    <CrudPage
      titulo="Categorías"
      subtitulo="Organice el catálogo por disciplina deportiva para facilitar la consulta y la selección de productos."
      icono="category"
      coleccion="categorias"
      entidad="categorías"
      singular="categoría"
      searchKeys={['nombre']}
      conDetalle={false}
      filtros={[
        { key: 'estado', label: 'Estado', options: ESTADOS_REGISTRO },
        { key: 'calc_uso', label: 'Uso', options: ['Con productos', 'Sin productos'] },
      ]}
      defaults={{ estado: 'Activo' }}
      columnas={[
        { key: 'nombre', label: 'Categoría', mobile: 'title', render: (r) => <span className="cell-main">{r.nombre}</span> },
        { key: 'calc_productos', label: 'Productos', align: 'center', mobile: 'meta', render: (r) => <span className="badge badge-info">{r.calc_productos}</span> },
        { key: 'estado', label: 'Estado', mobile: 'value', render: (r) => <EstadoCell row={r} coleccion="categorias" options={ESTADOS_REGISTRO} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre de la categoría', type: 'text', required: true, noSpecial: true, unique: true, full: true, hint: 'No puede repetirse: la columna es única.' },
        { name: 'estado', label: 'Estado', type: 'switch', full: true, soloEditar: true, hint: 'Una categoría inactiva sigue en el catálogo con sus productos, pero ya no se propone para clasificar productos nuevos.' },
      ]}
    />
  );
}
