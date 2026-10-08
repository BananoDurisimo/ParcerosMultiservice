import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import Badge from '@shared/components/ui/Badge.jsx';
import MiniTabla from '@shared/components/ui/MiniTabla.jsx';
import Icon from '@shared/components/Icon.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, fecha, ESTADOS_REGISTRO } from '@shared/data/mock.js';

/** Tabla `proveedor`: nombre, id_tipo_insumo, telefono, correo, direccion,
 *  nit, estado, y los datos de la persona de contacto: nombrepersonacontacto,
 *  telefono_contacto y correo_contacto. El telefono y el correo de la empresa
 *  son los generales; los del contacto, los de quien atiende los pedidos. */
export default function Proveedores() {
  const { db, opciones } = useData();
  const tipos = opciones('tipos_insumo');

  const detalle = (r) => (
    <div>
      <div className="detail-grid">
        <div className="detail-item"><div className="dl">Proveedor</div><div className="dv">{r.nombre}</div></div>
        <div className="detail-item"><div className="dl">NIT</div><div className="dv">{r.nit || '—'}</div></div>
        <div className="detail-item"><div className="dl">Tipo de insumo que suministra</div><div className="dv">{r.calc_tipo_insumo}</div></div>
        <div className="detail-item"><div className="dl">Estado</div><div className="dv"><Badge>{r.estado}</Badge></div></div>
        <div className="detail-item"><div className="dl">Teléfono de la empresa</div><div className="dv">{r.telefono || '—'}</div></div>
        <div className="detail-item"><div className="dl">Correo de la empresa</div><div className="dv">{r.correo || '—'}</div></div>
        <div className="detail-item full"><div className="dl">Dirección</div><div className="dv">{r.direccion || '—'}</div></div>
      </div>

      <h3 className="det-section">Persona de contacto</h3>
      <div className="detail-grid">
        <div className="detail-item"><div className="dl">Nombre</div><div className="dv">{r.nombrepersonacontacto || '—'}</div></div>
        <div className="detail-item"><div className="dl">Teléfono</div><div className="dv">{r.telefono_contacto || '—'}</div></div>
        <div className="detail-item"><div className="dl">Correo electrónico</div><div className="dv">{r.correo_contacto || '—'}</div></div>
      </div>

      <h3 className="det-section">Insumos que suministra</h3>
      <MiniTabla
        filas={db.insumos.filter((i) => i.id_tipo_insumo === r.id_tipo_insumo)}
        vacio="No hay insumos registrados de este tipo."
        columnas={[
          { label: 'Insumo', render: (i) => i.nombre },
          { label: 'Existencias', align: 'right', render: (i) => `${i.stock} ${i.calc_abreviatura}` },
          { label: 'Estado', render: (i) => <Badge>{i.estado}</Badge> },
        ]}
      />

      <h3 className="det-section">Historial de compras</h3>
      <MiniTabla
        filas={db.compras.filter((c) => c.id_proveedor === r.id).sort((a, b) => b.fecha.localeCompare(a.fecha))}
        vacio="No se han registrado compras a este proveedor."
        columnas={[
          { label: 'Compra', render: (c) => c.calc_codigo },
          { label: 'Fecha', render: (c) => fecha(c.fecha) },
          { label: 'Insumos', render: (c) => <span className="caption">{c.calc_insumos_txt}</span> },
          { label: 'Total', align: 'right', render: (c) => <span className="money">{money(c.calc_total)}</span> },
          { label: 'Estado', render: (c) => <Badge>{c.estado}</Badge> },
        ]}
      />
    </div>
  );

  return (
    <CrudPage
      titulo="Proveedores"
      subtitulo="Mantenga actualizada la información de contacto y el abastecimiento de materiales."
      icono="truck"
      modulo="Proveedores"
      coleccion="proveedores"
      renderDetalle={detalle}
      entidad="proveedores"
      singular="proveedor"
      searchKeys={['nombre', 'nombrepersonacontacto', 'correo', 'telefono', 'correo_contacto', 'telefono_contacto', 'nit', 'calc_tipo_insumo']}
      eliminacion={{
        validar: (r) => (r.calc_compras > 0
          ? `${r.nombre} tiene ${r.calc_compras} compra(s) registradas. Para conservar el historial, desactívelo en lugar de eliminarlo.`
          : null),
      }}
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
              <div className="caption">Contacto: {r.nombrepersonacontacto}{r.telefono_contacto ? ` · ${r.telefono_contacto}` : ''}</div>
            </div>
          ),
        },
        { key: 'nit', label: 'NIT', mobile: 'meta', render: (r) => <span className="caption">{r.nit || '—'}</span> },
        { key: 'calc_tipo_insumo', label: 'Tipo de insumo', mobile: 'meta', render: (r) => <span className="badge badge-info">{r.calc_tipo_insumo}</span> },
        { key: 'telefono', label: 'Teléfono empresa', render: (r) => <span className="muted row" style={{ gap: 6 }}><Icon name="phone" size={14} /> {r.telefono || '—'}</span> },
        { key: 'correo', label: 'Correo empresa', render: (r) => <span className="muted">{r.correo || '—'}</span> },
        { key: 'calc_compras', label: 'Compras', align: 'center', mobile: 'value', render: (r) => <span className="badge badge-neutral">{r.calc_compras}</span> },
        { key: 'estado', label: 'Estado', mobile: 'meta', render: (r) => <EstadoCell row={r} coleccion="proveedores" modulo="Proveedores" options={ESTADOS_REGISTRO} /> },
      ]}
      campos={[
        { name: 'sec_empresa', type: 'custom', full: true, render: () => <div className="form-section"><Icon name="truck" size={15} /> Datos de la empresa</div> },
        { name: 'nombre', label: 'Nombre del proveedor', type: 'text', required: true, noSpecial: true, unique: true, maxLength: 80 },
        { name: 'nit', label: 'NIT', type: 'text', required: true, alfanumerico: true, unique: true, maxLength: 20, placeholder: 'Ej.: J0310000451' },
        { name: 'id_tipo_insumo', label: 'Tipo de insumo que suministra', type: 'select', options: tipos, required: true },
        { name: 'direccion', label: 'Dirección', type: 'text', required: true, maxLength: 150 },
        { name: 'telefono', label: 'Teléfono de la empresa', type: 'tel', required: true, placeholder: 'Ej.: 2278 4410' },
        { name: 'correo', label: 'Correo de la empresa', type: 'email', required: true, placeholder: 'ventas@empresa.com' },
        { name: 'sec_contacto', type: 'custom', full: true, render: () => <div className="form-section"><Icon name="user" size={15} /> Persona de contacto</div> },
        { name: 'nombrepersonacontacto', label: 'Nombre de la persona de contacto', type: 'text', required: true, soloLetras: true, maxLength: 80, full: true },
        { name: 'telefono_contacto', label: 'Teléfono de la persona de contacto', type: 'tel', required: true, placeholder: 'Ej.: 8854 1203' },
        { name: 'correo_contacto', label: 'Correo de la persona de contacto', type: 'email', required: true, placeholder: 'nombre@empresa.com' },
        { name: 'estado', label: 'Estado', type: 'switch', full: true, soloEditar: true, hint: 'Un proveedor inactivo conserva su historial de compras, pero ya no se propone para compras nuevas.' },
      ]}
    />
  );
}
