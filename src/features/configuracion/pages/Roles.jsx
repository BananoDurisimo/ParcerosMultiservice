import CrudPage from '@shared/components/CrudPage.jsx';
import { useData } from '@shared/context/DataContext.jsx';

/** Tabla `rol` (id_rol, nombre) + tabla puente `rolxpermiso` (id_rol, id_permiso). */
export default function Roles() {
  const { db, opciones } = useData();
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
      defaults={{ permisos: [] }}
      columnas={[
        { key: 'nombre', label: 'Rol', mobile: 'title', render: (r) => <span className="cell-main">{r.nombre}</span> },
        { key: 'calc_permisos', label: 'Permisos', sortable: false, render: (r) => <span className="caption">{r.calc_permisos.join(' · ') || '—'}</span> },
        { key: 'permisos', label: 'Total', align: 'center', mobile: 'meta', sortable: false, render: (r) => <span className="badge badge-primary">{r.permisos.length}</span> },
        { key: 'calc_usuarios', label: 'Usuarios', align: 'center', mobile: 'value', render: (r) => <strong>{r.calc_usuarios}</strong> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre del rol', type: 'text', required: true, noSpecial: true, unique: true, maxLength: 40, full: true },
        {
          name: 'permisos', label: 'Permisos asociados', type: 'multiselect', options: permisos,
          full: true, required: true, buscable: true, buscarPlaceholder: 'Buscar permiso…',
          hint: 'Cada permiso marcado crea una fila en rolxpermiso.',
        },
      ]}
      renderDetalle={(r) => (
        <div>
          <div className="detail-grid">
            <div className="detail-item"><div className="dl">Rol</div><div className="dv">{r.nombre}</div></div>
            <div className="detail-item"><div className="dl">Usuarios asignados</div><div className="dv">{r.calc_usuarios}</div></div>
          </div>
          <h3 style={{ margin: '18px 0 10px' }}>Permisos asociados</h3>
          <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
            {r.calc_permisos.length === 0 && <span className="caption">Este rol no tiene permisos asignados.</span>}
            {r.calc_permisos.map((p) => <span className="badge badge-primary" key={p}>{p}</span>)}
          </div>
          {r.calc_usuarios > 0 && (
            <div className="alert alert-info" style={{ marginTop: 16 }}>
              {r.calc_usuarios} usuario(s) usan este rol: {db.usuarios.filter((u) => u.id_rol === r.id).map((u) => u.nombre_empleado).join(', ')}.
            </div>
          )}
        </div>
      )}
    />
  );
}
