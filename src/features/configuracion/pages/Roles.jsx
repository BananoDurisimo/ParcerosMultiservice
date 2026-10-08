import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import Badge from '@shared/components/ui/Badge.jsx';
import MiniTabla from '@shared/components/ui/MiniTabla.jsx';
import HistorialRegistro from '@shared/components/ui/HistorialRegistro.jsx';
import PermisosField from '@features/configuracion/components/PermisosField.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { ESTADOS_REGISTRO } from '@shared/data/mock.js';

/** Tabla `rol` (id_rol, nombre, estado) + tablas puente `rolxpermiso`
 *  (modulos a los que entra) y `rolxprivilegio` (acciones dentro de cada modulo). */
export default function Roles() {
  const { db } = useData();

  /* Un rol necesita al menos un permiso. Las acciones son opcionales: con el
     modulo activo el rol ya puede consultar su listado. */
  const validarExtra = (v) =>
    (v.permisos || []).length ? null : { permisos: 'Este campo no puede estar vacío.' };

  const detalle = (r) => (
    <div>
      <div className="detail-grid">
        <div className="detail-item"><div className="dl">Rol</div><div className="dv">{r.nombre}</div></div>
        <div className="detail-item"><div className="dl">Estado</div><div className="dv"><Badge>{r.estado}</Badge></div></div>
      </div>

      <h3 className="det-section">Permisos y privilegios</h3>
      <MiniTabla
        filas={db.permisos.filter((p) => (r.permisos || []).includes(p.id))}
        vacio="El rol no tiene permisos asignados."
        columnas={[
          { label: 'Permiso (módulo)', render: (p) => <span className="cell-main">{p.nombre}</span> },
          {
            label: 'Privilegios (acciones)',
            render: (p) => (
              <span className="caption">
                {db.privilegios.filter((pr) => pr.id_permiso === p.id && (r.privilegios || []).includes(pr.id)).map((pr) => pr.nombre).join(' · ') || '—'}
              </span>
            ),
          },
        ]}
      />

      <h3 className="det-section">Usuarios con este rol</h3>
      <MiniTabla
        filas={db.usuarios.filter((u) => u.id_rol === r.id)}
        vacio="Ningún usuario tiene asignado este rol."
        columnas={[
          { label: 'Empleado', render: (u) => u.nombre_empleado },
          { label: 'Usuario', render: (u) => <span className="caption">@{u.nombre_usuario}</span> },
          { label: 'Estado', render: (u) => <Badge>{u.estado}</Badge> },
        ]}
      />

      <h3 className="det-section">Historial de modificaciones</h3>
      <HistorialRegistro tabla="rol" id={r.id} vacio="El rol no tiene modificaciones registradas." />
    </div>
  );

  return (
    <CrudPage
      titulo="Roles"
      subtitulo="Controle el acceso al sistema asignando a cada rol sus permisos y privilegios."
      icono="shield"
      modulo="Roles"
      coleccion="roles"
      entidad="roles"
      singular="rol"
      searchKeys={['nombre']}
      filtros={[
        { key: 'estado', label: 'Estado', options: ESTADOS_REGISTRO },
        { key: 'calc_uso', label: 'Asignación', options: ['Con usuarios', 'Sin usuarios'] },
      ]}
      defaults={{ permisos: [], privilegios: [], estado: 'Activo' }}
      validarExtra={validarExtra}
      renderDetalle={detalle}
      eliminacion={{
        validar: (r) => (r.calc_usuarios > 0
          ? `El rol ${r.nombre} está asignado a ${r.calc_usuarios} usuario(s). Asígneles otro rol antes de eliminarlo.`
          : null),
      }}
      columnas={[
        { key: 'nombre', label: 'Rol', mobile: 'title', render: (r) => <span className="cell-main">{r.nombre}</span> },
        { key: 'calc_permisos', label: 'Permisos', sortable: false, render: (r) => <span className="caption">{r.calc_permisos.join(' · ') || '—'}</span> },
        { key: 'calc_total_permisos', label: 'Total permisos', align: 'center', mobile: 'meta', sortable: false, render: (r) => <span className="badge badge-primary">{r.calc_total_permisos}</span> },
        { key: 'calc_total_privilegios', label: 'Privilegios', align: 'center', render: (r) => <span className="badge badge-neutral">{r.calc_total_privilegios}</span> },
        { key: 'calc_usuarios', label: 'Usuarios', align: 'center', mobile: 'meta', render: (r) => <strong>{r.calc_usuarios}</strong> },
        { key: 'estado', label: 'Estado', mobile: 'value', render: (r) => <EstadoCell row={r} coleccion="roles" modulo="Roles" options={ESTADOS_REGISTRO} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre del rol', type: 'text', required: true, noSpecial: true, unique: true, maxLength: 40, full: true },
        {
          name: 'permisos', type: 'component', columnas: ['permisos', 'privilegios'],
          render: ({ values, setVal, errors }) => <PermisosField values={values} setVal={setVal} errors={errors} />,
        },
        { name: 'estado', label: 'Estado', type: 'switch', full: true, soloEditar: true, hint: 'Un rol inactivo ya no se puede asignar a usuarios nuevos.' },
      ]}
    />
  );
}
