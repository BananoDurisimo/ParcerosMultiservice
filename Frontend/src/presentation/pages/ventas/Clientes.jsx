import CrudPage from '@core/widgets/CrudPage.jsx';
import KpiCard from '@core/widgets/ui/KpiCard.jsx';
import Icon from '@core/widgets/Icon.jsx';
import EstadoCell from '@core/widgets/ui/EstadoCell.jsx';
import Badge from '@core/widgets/ui/Badge.jsx';
import MiniTabla from '@core/widgets/ui/MiniTabla.jsx';
import { Field } from '@core/widgets/ui/Form.jsx';
import { iniciales } from '@presentation/blocs/AuthContext.jsx';
import { useData } from '@presentation/blocs/DataContext.jsx';
import { ESTADOS_REGISTRO, COTIZACION } from '@core/constants/catalogos.js';
import { money, fecha } from '@core/utils/formato.js';
import { PAISES, PAIS_POR_DEFECTO } from '@core/constants/paises.js';

/* El pais define los tipos de documento que se ofrecen: un cliente de
   Nicaragua se identifica con cedula, RUC o cedula de residencia; uno de otro
   pais, con pasaporte o cedula de residencia. */
const TIPOS_NICARAGUA = ['Cédula', 'RUC', 'Cédula de residencia', 'Pasaporte'];
const TIPOS_EXTRANJERO = ['Pasaporte', 'Cédula de residencia'];
const tiposPara = (pais) => (pais === PAIS_POR_DEFECTO ? TIPOS_NICARAGUA : TIPOS_EXTRANJERO);

/* El documento admite entre 6 y 20 caracteres: letras, numeros y guiones. Si
   es una cedula nicaraguense (001-010190-0001A) escrita sin guiones, se guarda
   con ellos. */
const DOC = { min: 6, max: 20 };
const CEDULA_VALIDA = /^[A-Za-z0-9-]+$/;
const CEDULA = /^(\d{3})-?(\d{6})-?(\d{4})([A-Za-z])$/;
const formatoCedula = (v) => {
  const m = String(v || '').trim().match(CEDULA);
  return m ? `${m[1]}-${m[2]}-${m[3]}${m[4].toUpperCase()}` : String(v || '').trim();
};

/** Etapa comercial del registro: cotizacion, pedido o venta. */
const etapa = (p) => (p.calc_vendido ? 'Venta' : p.estado === COTIZACION ? 'Cotización' : 'Pedido');

/** Tabla `cliente`: nombre, pais, tipodocumento, documento, telefono, correo,
 *  direccion, estado. */
export default function Clientes() {
  const { db, stats } = useData();

  const detalle = (r) => (
    <div>
      <div className="detail-grid">
        <div className="detail-item"><div className="dl">Nombre o razón social</div><div className="dv">{r.nombre}</div></div>
        <div className="detail-item"><div className="dl">País</div><div className="dv">{r.pais}</div></div>
        <div className="detail-item"><div className="dl">{r.tipodocumento || 'Documento'}</div><div className="dv">{r.documento}</div></div>
        <div className="detail-item"><div className="dl">Correo electrónico</div><div className="dv">{r.correo || '—'}</div></div>
        <div className="detail-item"><div className="dl">Teléfono</div><div className="dv">{r.telefono || '—'}</div></div>
        <div className="detail-item"><div className="dl">Dirección</div><div className="dv">{r.direccion || '—'}</div></div>
        <div className="detail-item"><div className="dl">Estado</div><div className="dv"><Badge>{r.estado}</Badge></div></div>
      </div>

      <h3 className="det-section">Historial comercial</h3>
      <MiniTabla
        filas={db.pedidos.filter((p) => p.id_cliente === r.id).sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion))}
        vacio="El cliente todavía no tiene cotizaciones, pedidos ni ventas."
        columnas={[
          { label: 'Código', render: (p) => p.calc_codigo },
          { label: 'Tipo', render: (p) => <Badge tono="neutral" dot={false}>{etapa(p)}</Badge> },
          { label: 'Fecha de creación', render: (p) => fecha(p.fecha_creacion) },
          { label: 'Total', align: 'right', render: (p) => <span className="money">{money(p.calc_total)}</span> },
          { label: 'Saldo pendiente', align: 'right', render: (p) => <span className="money">{money(p.calc_saldo)}</span> },
          { label: 'Estado', render: (p) => <Badge>{p.estado}</Badge> },
        ]}
      />
    </div>
  );

  return (
    <CrudPage
      titulo="Clientes"
      subtitulo="Clubes, ligas, academias y equipos: datos de contacto e historial de cotizaciones, pedidos y ventas."
      icono="users"
      modulo="Clientes"
      coleccion="clientes"
      renderDetalle={detalle}
      entidad="clientes"
      singular="cliente"
      searchKeys={['nombre', 'documento', 'correo', 'telefono', 'pais']}
      eliminacion={{
        validar: (r) => (r.calc_pedidos > 0
          ? `${r.nombre} tiene ${r.calc_pedidos} cotización(es), pedido(s) o venta(s) registradas. Para conservar su historial, desactívelo en lugar de eliminarlo.`
          : null),
      }}
      filtros={[
        { key: 'pais', label: 'País', options: [...new Set(db.clientes.map((c) => c.pais))].sort((a, b) => a.localeCompare(b, 'es')) },
        { key: 'tipodocumento', label: 'Tipo de documento', options: TIPOS_NICARAGUA },
        { key: 'estado', label: 'Estado', options: ESTADOS_REGISTRO },
      ]}
      defaults={{ pais: PAIS_POR_DEFECTO, tipodocumento: 'Cédula', estado: 'Activo' }}
      resumen={[
        <KpiCard key="a" label="Clientes registrados" value={db.clientes.length} icon="users" tono="primary" />,
        <KpiCard key="b" label="Pedidos acumulados" value={stats.totalPedidos} icon="clipboard" tono="info" />,
        <KpiCard key="c" label="Saldo por cobrar" value={stats.porCobrar} prefix="C$ " icon="alert" tono="warning" />,
      ]}
      columnas={[
        {
          key: 'nombre', label: 'Cliente', mobile: 'title',
          render: (r) => (
            <div className="row">
              <span className="avatar" style={{ background: 'var(--secondary)' }}>{iniciales(r.nombre)}</span>
              <div>
                <div className="cell-main">{r.nombre}</div>
                <div className="caption">{r.tipodocumento || 'Documento'}: {r.documento} · {r.pais}</div>
              </div>
            </div>
          ),
        },
        { key: 'telefono', label: 'Teléfono', mobile: 'meta', render: (r) => <span className="muted row" style={{ gap: 6 }}><Icon name="phone" size={14} /> {r.telefono || '—'}</span> },
        { key: 'correo', label: 'Correo', render: (r) => <span className="muted">{r.correo}</span> },
        { key: 'direccion', label: 'Dirección', render: (r) => <span className="caption">{r.direccion || '—'}</span> },
        { key: 'calc_pedidos', label: 'Pedidos', align: 'center', mobile: 'value', render: (r) => <span className="badge badge-info">{r.calc_pedidos}</span> },
        { key: 'estado', label: 'Estado', mobile: 'meta', render: (r) => <EstadoCell row={r} coleccion="clientes" modulo="Clientes" options={ESTADOS_REGISTRO} /> },
      ]}
      /* El formato se exige al registrar o al cambiar el numero: los clientes
         que ya existian con otro formato se pueden seguir editando. */
      validarExtra={(v, modo, actual) => {
        if (!tiposPara(v.pais).includes(v.tipodocumento)) return { tipodocumento: 'Seleccione un tipo de documento válido para el país.' };
        const doc = String(v.documento || '').trim();
        if (!doc || (modo === 'editar' && doc === actual?.documento)) return null;
        if (doc.length < DOC.min || doc.length > DOC.max) return { documento: `El documento debe tener entre ${DOC.min} y ${DOC.max} caracteres.` };
        return CEDULA_VALIDA.test(doc) ? null : { documento: 'El documento solo admite letras, números y guiones.' };
      }}
      beforeSave={(d) => ({ ...d, documento: d.tipodocumento === 'Cédula' ? formatoCedula(d.documento) : String(d.documento || '').trim() })}
      campos={[
        { name: 'nombre', label: 'Nombre o razón social', type: 'text', required: true, noSpecial: true, minLength: 3, maxLength: 80 },
        {
          name: 'pais', label: 'País', type: 'select', options: PAISES, required: true, buscarPlaceholder: 'Buscar país…',
          /* Al cambiar de pais, el tipo de documento vuelve al primero que admite. */
          alCambiar: (v, setVal, values) => {
            if (!tiposPara(v).includes(values.tipodocumento)) setVal('tipodocumento', tiposPara(v)[0], false);
          },
        },
        {
          name: 'tipodocumento', type: 'component', full: false,
          render: ({ value, onChange, error, values, bloqueado }) => (
            <Field
              f={{ name: 'tipodocumento', label: 'Tipo de documento', type: 'select', required: true, options: tiposPara(values.pais), hint: 'Según el país del cliente.' }}
              value={value} error={error} readOnly={bloqueado} onChange={onChange}
            />
          ),
        },
        {
          name: 'documento', label: 'Número de documento', type: 'text', required: true, unique: true, minLength: DOC.min, maxLength: DOC.max,
          placeholder: '001-010190-0001A', hint: `Entre ${DOC.min} y ${DOC.max} caracteres: letras, números y guiones.`,
        },
        { name: 'correo', label: 'Correo electrónico', type: 'email', required: true, unique: true, hint: 'No puede repetirse: la columna es única.' },
        { name: 'telefono', label: 'Teléfono', type: 'tel' },
        { name: 'direccion', label: 'Dirección', type: 'text', full: true, maxLength: 150 },
        { name: 'estado', label: 'Estado', type: 'switch', full: true, soloEditar: true, hint: 'Un cliente inactivo conserva sus pedidos y abonos, pero ya no se propone para pedidos nuevos.' },
      ]}
    />
  );
}
