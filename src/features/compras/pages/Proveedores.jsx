import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import Badge from '@shared/components/ui/Badge.jsx';
import MiniTabla from '@shared/components/ui/MiniTabla.jsx';
import Icon from '@shared/components/Icon.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, fecha, ESTADOS_REGISTRO } from '@shared/data/mock.js';
import { PAISES, PAIS_POR_DEFECTO } from '@shared/data/paises.js';

/** Tabla `proveedor`: nombre, telefono, pais, id_tipo_insumo (el tipo de
 *  insumo que suministra) y estado. Los datos que se pedian antes (NIT,
 *  correo, direccion, persona de contacto) se conservan en la base de datos,
 *  pero ya no se piden ni se muestran. */
export default function Proveedores() {
  const { db, opciones } = useData();
  const tipos = opciones('tipos_insumo');
  const paisesUsados = [...new Set(db.proveedores.map((p) => p.pais).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));

  const detalle = (r) => (
    <div>
      <div className="detail-grid">
        <div className="detail-item"><div className="dl">Proveedor</div><div className="dv">{r.nombre}</div></div>
        <div className="detail-item"><div className="dl">Teléfono</div><div className="dv">{r.telefono || '—'}</div></div>
        <div className="detail-item"><div className="dl">País</div><div className="dv">{r.pais || '—'}</div></div>
        <div className="detail-item"><div className="dl">Tipo de insumo que suministra</div><div className="dv">{r.calc_tipo_insumo}</div></div>
        <div className="detail-item"><div className="dl">Estado</div><div className="dv"><Badge>{r.estado}</Badge></div></div>
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
      searchKeys={['nombre', 'telefono', 'pais', 'calc_tipo_insumo']}
      eliminacion={{
        validar: (r) => (r.calc_compras > 0
          ? `${r.nombre} tiene ${r.calc_compras} compra(s) registradas. Para conservar el historial, desactívelo en lugar de eliminarlo.`
          : null),
      }}
      filtros={[
        { key: 'id_tipo_insumo', label: 'Tipo de insumo', options: tipos },
        { key: 'pais', label: 'País', options: paisesUsados },
        { key: 'estado', label: 'Estado', options: ESTADOS_REGISTRO },
      ]}
      defaults={{ estado: 'Activo', pais: PAIS_POR_DEFECTO }}
      columnas={[
        { key: 'nombre', label: 'Proveedor', mobile: 'title', render: (r) => <span className="cell-main">{r.nombre}</span> },
        { key: 'telefono', label: 'Teléfono', mobile: 'meta', render: (r) => <span className="muted row" style={{ gap: 6 }}><Icon name="phone" size={14} /> {r.telefono || '—'}</span> },
        { key: 'pais', label: 'País', mobile: 'meta', render: (r) => <span className="muted row" style={{ gap: 6 }}><Icon name="pin" size={14} /> {r.pais || '—'}</span> },
        { key: 'calc_tipo_insumo', label: 'Tipo de insumo', mobile: 'meta', render: (r) => <span className="badge badge-info">{r.calc_tipo_insumo}</span> },
        { key: 'calc_compras', label: 'Compras', align: 'center', mobile: 'value', render: (r) => <span className="badge badge-neutral">{r.calc_compras}</span> },
        { key: 'estado', label: 'Estado', mobile: 'meta', render: (r) => <EstadoCell row={r} coleccion="proveedores" modulo="Proveedores" options={ESTADOS_REGISTRO} /> },
      ]}
      campos={[
        { name: 'nombre', label: 'Nombre del proveedor', type: 'text', required: true, noSpecial: true, unique: true, maxLength: 80, full: true },
        { name: 'telefono', label: 'Teléfono', type: 'tel', required: true, placeholder: 'Ej.: 2278 4410' },
        { name: 'pais', label: 'País', type: 'select', options: PAISES, required: true, buscarPlaceholder: 'Buscar país…' },
        { name: 'id_tipo_insumo', label: 'Tipo de insumo', type: 'select', options: tipos, required: true, full: true, hint: 'Lo que suministra este proveedor.' },
        { name: 'estado', label: 'Estado', type: 'switch', full: true, soloEditar: true, hint: 'Un proveedor inactivo conserva su historial de compras, pero ya no se propone para compras nuevas.' },
      ]}
    />
  );
}
