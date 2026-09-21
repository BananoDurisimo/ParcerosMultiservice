import { useState } from 'react';
import Icon from './Icon.jsx';
import DataTable from './ui/DataTable.jsx';
import Modal from './ui/Modal.jsx';
import ConfirmDialog from './ui/ConfirmDialog.jsx';
import { Field, ItemsEditor, normOpciones, validar } from './ui/Form.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';
import { etiquetaFila } from '@shared/data/mock.js';

/**
 * Pagina CRUD reutilizable: cabecera, resumen, tabla, formulario y detalle.
 * La usan los 11 modulos.
 *
 * Los registros nunca se eliminan (no hay boton de borrar en la tabla): los
 * modulos que mueven dinero -compras y pedidos- reciben la prop `anulacion`
 * para dar de baja el documento desde el formulario de edicion, dejandolo en
 * la base de datos con su estado en "Anulada"/"Anulado".
 */
export default function CrudPage({
  titulo,
  subtitulo,
  icono,
  coleccion,
  entidad,
  singular,
  columnas,
  campos,
  filtros = [],
  searchKeys = [],
  defaults = {},
  pageSize = 8,
  resumen = null,
  renderDetalle,
  beforeSave,
  pageActions,
  etiquetaRegistro,
  validarExtra,
  conDetalle = true,
  tablaCompacta = false,
  anulacion = null, // { valor, campo = 'estado', mensaje(reg) }
}) {
  const { db, create, update } = useData();
  const toast = useToast();
  const rows = db[coleccion];

  const [modo, setModo] = useState(null); // 'crear' | 'editar' | 'ver'
  const [actual, setActual] = useState(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [anular, setAnular] = useState(null);

  const abrirCrear = () => { setValues({ ...defaults }); setErrors({}); setActual(null); setModo('crear'); };
  const abrirEditar = (r) => { setValues({ ...r }); setErrors({}); setActual(r); setModo('editar'); };
  const abrirVer = (r) => { setActual(r); setModo('ver'); };
  const cerrar = () => { setModo(null); setActual(null); setErrors({}); };

  const setVal = (name, v) => {
    setValues((s) => ({ ...s, [name]: v }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  /** Campos `unique`: el valor no puede repetirse en otra fila (sin distinguir mayusculas). */
  const repetidos = () => {
    const norm = (v) => String(v ?? '').trim().toLowerCase();
    const errs = {};
    campos.forEach((f) => {
      if (!f.unique || !norm(values[f.name])) return;
      if (rows.some((r) => r.id !== actual?.id && norm(r[f.name]) === norm(values[f.name]))) {
        errs[f.name] = 'Ya existe un registro con este valor.';
      }
    });
    return errs;
  };

  const guardar = () => {
    const errs = { ...repetidos(), ...validar(campos, values), ...(validarExtra ? validarExtra(values, modo, actual) : null) };
    Object.keys(errs).forEach((k) => errs[k] === undefined && delete errs[k]);
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error('Revise los campos marcados en el formulario.', 'Validación de campos');
      return;
    }
    /* El payload se arma unicamente con los campos declarados, que son las
       columnas reales de la tabla: asi los valores derivados (calc_*) que
       vienen en la fila al editar nunca se escriben en la "base de datos". */
    let data = { ...defaults };
    campos.forEach((f) => {
      if (f.type === 'custom') return; // solo presentacion: no es una columna
      const v = values[f.name];
      data[f.name] = f.type === 'number' || f.type === 'money' ? Number(v || 0) : v;
    });
    if (beforeSave) data = beforeSave(data, modo, actual);

    if (modo === 'crear') {
      create(coleccion, data);
      toast.success(`El registro de ${singular} se guardó correctamente.`);
    } else {
      update(coleccion, actual.id, data);
      toast.success(`El registro de ${singular} se actualizó correctamente.`);
    }
    cerrar();
  };

  /* Anular no borra la fila: solo cambia su estado, de modo que el documento
     siga apareciendo en los listados y en el historial de movimientos. */
  const campoAnulacion = anulacion?.campo || 'estado';
  const estaAnulado = (r) => !!anulacion && r?.[campoAnulacion] === anulacion.valor;
  const puedeAnular = !!anulacion && modo === 'editar' && !estaAnulado(actual);

  const confirmarAnulacion = () => {
    update(coleccion, anular.id, { [campoAnulacion]: anulacion.valor });
    toast.warning(`Se anuló el registro de ${singular}: ${etiqueta(anular)}.`, 'Registro anulado');
    setAnular(null);
    cerrar();
  };

  /** Resuelve el texto de un campo en el modal de detalle (los select y
      multiselect de llave foranea guardan ids, no nombres). */
  const textoDetalle = (f, v) => {
    if (v === undefined || v === null || v === '') return '—';
    if (f.type === 'select' || f.type === 'multiselect') {
      const opts = normOpciones(f.options || []);
      const nombre = (x) => opts.find((o) => String(o.value) === String(x))?.label ?? x;
      return Array.isArray(v) ? (v.map(nombre).join(', ') || '—') : nombre(v);
    }
    return Array.isArray(v) ? v.join(', ') : String(v);
  };

  const exportar = () => toast.info('El listado se exportará en formato PDF o Excel desde el módulo de reportes.', 'Exportación');

  const etiqueta = (r) => (r ? (etiquetaRegistro ? etiquetaRegistro(r) : etiquetaFila(r)) : '—');

  return (
    <div className="anim-page">
      <div className="page-head">
        <div>
          <h1 className="row" style={{ gap: 10 }}>
            <Icon name={icono} size={22} /> {titulo}
          </h1>
          <p className="sub">{subtitulo}</p>
          <div className="hero-rule" />
        </div>
        <div className="row">{pageActions}</div>
      </div>

      {resumen && (
        <div className="kpi-grid stagger" style={{ marginBottom: 16 }}>
          {resumen}
        </div>
      )}

      <DataTable
        columns={columnas}
        rows={rows}
        searchKeys={searchKeys}
        filters={filtros}
        entidad={entidad}
        pageSize={pageSize}
        compacta={tablaCompacta}
        onCreate={abrirCrear}
        createLabel={`Agregar ${singular}`}
        onView={conDetalle ? abrirVer : undefined}
        onEdit={abrirEditar}
        onExport={exportar}
      />

      {/* Formulario crear / editar */}
      <Modal
        open={modo === 'crear' || modo === 'editar'}
        onClose={cerrar}
        size={campos.some((c) => c.type === 'items') ? 'lg' : ''}
        title={modo === 'crear' ? `Agregar ${singular}` : `Editar ${singular}`}
        subtitle={modo === 'crear' ? 'Complete la información requerida.' : `Modificando: ${etiqueta(actual)}`}
        footer={
          <>
            {puedeAnular && (
              <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={() => setAnular(actual)}>
                <Icon name="xC" size={16} /> Anular {singular}
              </button>
            )}
            <button className="btn" onClick={cerrar}>Cancelar</button>
            <button className="btn btn-primary" onClick={guardar}>
              <Icon name="check" size={16} /> {modo === 'crear' ? 'Guardar' : 'Actualizar'}
            </button>
          </>
        }
      >
        {estaAnulado(actual) && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            <Icon name="xC" size={20} />
            <div>
              Estado actual: <strong>{anulacion.valor}</strong>. El registro se conserva como referencia y no se
              toma en cuenta en los totales; para reactivarlo cambie su estado.
            </div>
          </div>
        )}

        <div className="form-grid">
          {campos.map((f) =>
            f.type === 'custom' ? (
              /* Bloque de solo lectura calculado con los valores del formulario
                 (por ejemplo, el total en vivo de un pedido). */
              <div key={f.name} className={`field ${f.full ? 'full' : ''}`}>{f.render(values)}</div>
            ) : f.type === 'items' ? (
              <ItemsEditor key={f.name} f={f} value={values[f.name] || []} error={errors[f.name]} onChange={(v) => setVal(f.name, v)} />
            ) : (
              <Field key={f.name} f={f} value={values[f.name]} error={errors[f.name]} onChange={(v) => setVal(f.name, v)} />
            )
          )}
        </div>
      </Modal>

      {/* Detalle */}
      <Modal
        open={conDetalle && modo === 'ver'}
        onClose={cerrar}
        title={`Detalle de ${singular}`}
        subtitle={etiqueta(actual)}
        size={campos.some((c) => c.type === 'items') ? 'lg' : ''}
        footer={
          <>
            <button className="btn" onClick={cerrar}>Cerrar</button>
            <button className="btn btn-warning" onClick={() => abrirEditar(actual)}>
              <Icon name="edit" size={16} /> Editar
            </button>
          </>
        }
      >
        {actual && (renderDetalle ? renderDetalle(actual) : (
          <div className="detail-grid">
            {campos.filter((f) => f.type !== 'items' && f.type !== 'custom' && !f.ocultarEnDetalle).map((f) => (
              <div className="detail-item" key={f.name}>
                <div className="dl">{f.label}</div>
                <div className="dv">{textoDetalle(f, actual[f.name])}</div>
              </div>
            ))}
          </div>
        ))}
      </Modal>

      {anulacion && (
        <ConfirmDialog
          open={!!anular}
          onClose={() => setAnular(null)}
          onConfirm={confirmarAnulacion}
          titulo={`Anular ${singular}`}
          confirmLabel="Anular"
          icono="xC"
          mensaje={
            anular && anulacion.mensaje
              ? anulacion.mensaje(anular)
              : `El registro "${etiqueta(anular)}" pasará al estado "${anulacion.valor}" y dejará de contar en los totales. No se elimina de la base de datos.`
          }
        />
      )}
    </div>
  );
}
