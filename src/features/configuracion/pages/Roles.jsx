import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { ESTADOS_REGISTRO } from '@shared/data/mock.js';

/** Tabla `rol` (id_rol, nombre, estado) + tabla puente `rolxpermiso` (id_rol, id_permiso). */
export default function Roles() {
  const { opciones } = useData();
  const permisos = opciones('permisos');

  return (
    <CrudPage
      titulo="Roles"
      subtitulo="Controle el acceso al sistema asignando permisos a cada rol."
      icono="shield"
      coleccion="roles"
      entidad="roles"
      singular="rol"
      searchKeys={['nombre']}
      conDetalle={false}
      filtros={[
        { key: 'estado', label: 'Estado', options: ESTADOS_REGISTRO },
        { key: 'calc_uso', label: 'Asignación', options: ['Con usuarios', 'Sin usuarios'] },
      ]}
      defaults={{ permisos: [], estado: 'Activo' }}
      columnas={[
        { key: 'nombre', label: 'Rol', mobile: 'title', render: (r) => <span className="cell-main">{r.nombre}</span> },
        { key: 'calc_permisos', label: 'Permisos', sortable: false, render: (r) => <span className="caption">{r.calc_permisos.join(' · ') || '—'}</span> },
        { key: 'permisos', label: 'Total', align: 'center', mobile: 'meta', sortable: false, render: (r) => <span className="badge badge-primary">{r.permisos.length}</span> },
        { key: 'calc_usuarios', label: 'Usuarios', align: 'center', mobile: 'meta', render: (r) => <strong>{r.calc_usuarios}</strong> },
        { key: 'estado', label: 'Estado', mobile: 'value', render: (r) => <EstadoCell row={r} coleccion="roles" options={ESTADOS_REGISTRO} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre del rol', type: 'text', required: true, noSpecial: true, unique: true, maxLength: 40, full: true },
        {
          name: 'permisos', label: 'Permisos asociados', type: 'multiselect', options: permisos,
          full: true, required: true, buscable: true, buscarPlaceholder: 'Buscar permiso…',
          hint: 'Cada permiso marcado crea una fila en rolxpermiso.',
        },
        { name: 'estado', label: 'Estado', type: 'switch', full: true, soloEditar: true, hint: 'Un rol inactivo no habilita el ingreso de sus usuarios.' },
      ]}
    />
  );
}
