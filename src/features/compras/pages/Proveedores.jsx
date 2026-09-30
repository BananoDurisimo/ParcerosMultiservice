import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import Icon from '@shared/components/Icon.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { ESTADOS_REGISTRO } from '@shared/data/mock.js';

/** Tabla `proveedor`: nombre, nombrepersonacontacto, id_tipo_insumo,
 *  telefono, correo, direccion, nit, estado. */
export default function Proveedores() {
  const { opciones } = useData();
  const tipos = opciones('tipos_insumo');

  return (
    <CrudPage
      titulo="Proveedores"
      subtitulo="Mantenga actualizada la información de contacto y el abastecimiento de materiales."
      icono="truck"
      coleccion="proveedores"
      entidad="proveedores"
      singular="proveedor"
      searchKeys={['nombre', 'nombrepersonacontacto', 'correo', 'nit', 'calc_tipo_insumo']}
      filtros={[
        { key: 'id_tipo_insumo', label: 'Tipo de insumo', options: tipos },
        { key: 'estado', label: 'Estado', options: ESTADOS_REGISTRO },
      ]}
      defaults={{ estado: 'Activo' }}
      columnas={[
        {
          key: 'nombre', label: 'Proveedor', mobile: 'title',
          render: (r) => (
            <div>
              <div className="cell-main">{r.nombre}</div>
              <div className="caption">{r.nombrepersonacontacto}</div>
            </div>
          ),
        },
        { key: 'nit', label: 'NIT', mobile: 'meta', render: (r) => <span className="caption">{r.nit || '—'}</span> },
        { key: 'calc_tipo_insumo', label: 'Tipo de insumo', mobile: 'meta', render: (r) => <span className="badge badge-info">{r.calc_tipo_insumo}</span> },
        { key: 'telefono', label: 'Teléfono', render: (r) => <span className="muted row" style={{ gap: 6 }}><Icon name="phone" size={14} /> {r.telefono || '—'}</span> },
        { key: 'correo', label: 'Correo', render: (r) => <span className="muted">{r.correo || '—'}</span> },
        { key: 'calc_compras', label: 'Compras', align: 'center', mobile: 'value', render: (r) => <span className="badge badge-neutral">{r.calc_compras}</span> },
        { key: 'estado', label: 'Estado', mobile: 'meta', render: (r) => <EstadoCell row={r} coleccion="proveedores" options={ESTADOS_REGISTRO} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre del proveedor', type: 'text', required: true },
        { name: 'nombrepersonacontacto', label: 'Persona de contacto', type: 'text', required: true },
        { name: 'id_tipo_insumo', label: 'Tipo de insumo que suministra', type: 'select', options: tipos, required: true },
        { name: 'nit', label: 'NIT', type: 'text' },
        { name: 'telefono', label: 'Teléfono', type: 'tel' },
        { name: 'correo', label: 'Correo electrónico', type: 'email' },
        { name: 'direccion', label: 'Dirección', type: 'text', full: true },
        { name: 'estado', label: 'Estado', type: 'switch', full: true, soloEditar: true, hint: 'Un proveedor inactivo conserva su historial de compras, pero ya no se propone para compras nuevas.' },
      ]}
    />
  );
}
