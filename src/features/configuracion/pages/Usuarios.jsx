import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import Icon from '@shared/components/Icon.jsx';
import { iniciales } from '@shared/context/AuthContext.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { fecha, hoyISO, ESTADOS_REGISTRO } from '@shared/data/mock.js';

/** Tabla `usuario`: id_rol, nombre_usuario, contrasena, correo_empresarial,
 *  nombre_empleado, documento, telefono, cargo, fecha_ingreso, estado. */
export default function Usuarios() {
  const { opciones } = useData();
  const roles = opciones('roles');

  return (
    <CrudPage
      titulo="Usuarios"
      subtitulo="Administre los usuarios del sistema y los accesos disponibles según el rol asignado."
      icono="user"
      coleccion="usuarios"
      entidad="usuarios"
      singular="usuario"
      searchKeys={['nombre_empleado', 'nombre_usuario', 'correo_empresarial', 'documento', 'cargo', 'calc_rol']}
      tablaCompacta
      filtros={[
        { key: 'id_rol', label: 'Rol', options: roles },
        { key: 'estado', label: 'Estado', options: ESTADOS_REGISTRO },
      ]}
      defaults={{ estado: 'Activo', fecha_ingreso: hoyISO() }}
      columnas={[
        {
          key: 'nombre_empleado', label: 'Usuario', mobile: 'title',
          render: (r) => (
            <div className="row">
              <span className="avatar">{iniciales(r.nombre_empleado)}</span>
              <div>
                <div className="cell-main">{r.nombre_empleado}</div>
                <div className="caption">@{r.nombre_usuario}</div>
              </div>
            </div>
          ),
        },
        { key: 'documento', label: 'Documento', mobile: 'meta', render: (r) => <span className="caption">{r.documento || '—'}</span> },
        { key: 'correo_empresarial', label: 'Correo empresarial', render: (r) => <span className="muted row" style={{ gap: 6 }}><Icon name="mail" size={14} /> {r.correo_empresarial || '—'}</span> },
        { key: 'cargo', label: 'Cargo', mobile: 'meta', render: (r) => <span className="muted">{r.cargo || '—'}</span> },
        { key: 'calc_rol', label: 'Rol', mobile: 'meta', render: (r) => <span className="badge badge-primary">{r.calc_rol}</span> },
        { key: 'fecha_ingreso', label: 'Fecha de ingreso', render: (r) => <span className="caption">{fecha(r.fecha_ingreso)}</span> },
        { key: 'estado', label: 'Estado', mobile: 'value', render: (r) => <EstadoCell row={r} coleccion="usuarios" options={ESTADOS_REGISTRO} /> },
      ]}
      campos={[
        { name: 'nombre_empleado', label: 'Nombre del empleado', type: 'text', noSpecial: true },
        { name: 'documento', label: 'Documento', type: 'text' },
        { name: 'nombre_usuario', label: 'Nombre de usuario', type: 'text', required: true, noSpecial: true, hint: 'Único en el sistema, sin espacios.' },
        { name: 'contrasena', label: 'Contraseña', type: 'password', required: true, placeholder: 'Mínimo 6 caracteres' },
        { name: 'correo_empresarial', label: 'Correo empresarial', type: 'email' },
        { name: 'telefono', label: 'Teléfono', type: 'tel' },
        { name: 'cargo', label: 'Cargo', type: 'text' },
        { name: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date' },
        { name: 'id_rol', label: 'Rol asignado', type: 'select', options: roles, required: true },
        { name: 'estado', label: 'Estado', type: 'switch' },
      ]}
    />
  );
}
