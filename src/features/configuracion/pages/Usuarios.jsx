import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import Icon from '@shared/components/Icon.jsx';
import { iniciales } from '@shared/context/AuthContext.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { fecha, hoyISO, ESTADOS_REGISTRO, TIPOS_DOCUMENTO } from '@shared/data/mock.js';

/** Titulo de cada bloque del formulario. */
const seccion = (n, icono, texto) => ({
  name: `sec${n}`, type: 'custom', full: true,
  render: () => <div className="form-section"><span className="paso-num">{n}</span> <Icon name={icono} size={15} /> {texto}</div>,
});

/** Tabla `usuario`: id_rol, tipodocumento, documento, nombre_empleado,
 *  telefono, correo_empresarial, contrasena, cargo, fecha_ingreso, estado.
 *  Se inicia sesion con el correo empresarial: no hay nombre de usuario.
 *
 *  El formulario va en tres bloques: datos personales (empieza por el tipo y
 *  el numero de documento), acceso al sistema y datos laborales (el cargo es
 *  el ultimo campo). */
export default function Usuarios() {
  const { db, opciones } = useData();
  const { user } = useAuth();
  const roles = opciones('roles');

  /* Los movimientos guardan quien los hizo: un usuario con acciones en el
     historial se desactiva, para no perder la trazabilidad. */
  const validarEliminar = (r) => {
    if (r.id === user?.id) return 'No puede eliminar el usuario con el que inició sesión.';
    const acciones = db.movimientos.filter((m) => m.id_usuario === r.id).length;
    return acciones
      ? `${r.nombre_empleado} tiene ${acciones} acción(es) en el historial de movimientos. Para conservar la trazabilidad, desactívelo en lugar de eliminarlo.`
      : null;
  };

  return (
    <CrudPage
      titulo="Usuarios"
      subtitulo="Administre los usuarios del sistema y los accesos disponibles según el rol asignado."
      icono="user"
      modulo="Usuarios"
      coleccion="usuarios"
      entidad="usuarios"
      singular="usuario"
      searchKeys={['nombre_empleado', 'correo_empresarial', 'documento', 'cargo', 'calc_rol']}
      tablaCompacta
      eliminacion={{ validar: validarEliminar }}
      filtros={[
        { key: 'id_rol', label: 'Rol', options: roles },
        { key: 'estado', label: 'Estado', options: ESTADOS_REGISTRO },
      ]}
      defaults={{ estado: 'Activo', fecha_ingreso: hoyISO(), tipodocumento: 'Cédula' }}
      columnas={[
        {
          key: 'nombre_empleado', label: 'Usuario', mobile: 'title',
          render: (r) => (
            <div className="row">
              <span className="avatar">{iniciales(r.nombre_empleado)}</span>
              <div>
                <div className="cell-main">{r.nombre_empleado}</div>
                <div className="caption">{r.correo_empresarial}</div>
              </div>
            </div>
          ),
        },
        {
          key: 'documento', label: 'Documento', mobile: 'meta',
          render: (r) => <span className="caption">{r.documento ? `${r.tipodocumento ? r.tipodocumento + ': ' : ''}${r.documento}` : '—'}</span>,
        },
        { key: 'telefono', label: 'Teléfono', render: (r) => <span className="muted row" style={{ gap: 6 }}><Icon name="phone" size={14} /> {r.telefono || '—'}</span> },
        { key: 'cargo', label: 'Cargo', mobile: 'meta', render: (r) => <span className="muted">{r.cargo || '—'}</span> },
        { key: 'calc_rol', label: 'Rol', mobile: 'meta', render: (r) => <span className="badge badge-primary">{r.calc_rol}</span> },
        { key: 'fecha_ingreso', label: 'Fecha de ingreso', render: (r) => <span className="caption">{fecha(r.fecha_ingreso)}</span> },
        { key: 'estado', label: 'Estado', mobile: 'value', render: (r) => <EstadoCell row={r} coleccion="usuarios" modulo="Usuarios" options={ESTADOS_REGISTRO} disabled={r.correo_empresarial === 'admin@parceros.ni'} /> },
      ]}
      campos={[
        seccion(1, 'user', 'Datos personales'),
        { name: 'tipodocumento', label: 'Tipo de documento', type: 'select', options: TIPOS_DOCUMENTO, required: true },
        {
          name: 'documento', label: 'Número de documento', type: 'text', required: true, alfanumerico: true, unique: true, minLength: 5, maxLength: 20,
          placeholder: 'Ej.: 001-120390-0001A', hint: 'No puede repetirse entre usuarios.',
        },
        { name: 'nombre_empleado', label: 'Nombre completo', type: 'text', required: true, soloLetras: true, minLength: 3, maxLength: 80 },
        { name: 'telefono', label: 'Teléfono', type: 'tel', placeholder: 'Ej.: 8854 1203' },

        seccion(2, 'lock', 'Acceso al sistema'),
        { name: 'correo_empresarial', label: 'Correo empresarial', type: 'email', required: true, unique: true, hint: 'Es el correo con el que el usuario inicia sesión.' },
        { name: 'contrasena', label: 'Contraseña', type: 'password', required: true, minLength: 6, placeholder: 'Mínimo 6 caracteres', ocultarEnDetalle: true, ocultarAlEditar: true },
        { name: 'id_rol', label: 'Rol asignado', type: 'select', options: roles, required: true, hint: 'Define los módulos y las acciones que puede usar.' },
        { name: 'estado', label: 'Estado', type: 'switch' },

        seccion(3, 'badge', 'Datos laborales'),
        { name: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date', maxHoy: true },
        { name: 'cargo', label: 'Cargo', type: 'text', noSpecial: true, maxLength: 60, placeholder: 'Ej.: Vendedor' },
      ]}
    />
  );
}
