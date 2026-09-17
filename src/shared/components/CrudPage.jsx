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
 * Pagina CRUD reutilizable: cabecera, resumen, tabla, formulario,
 * detalle y confirmacion de eliminacion. La usan los 11 modulos.
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
}) {
  const { db, create, update, remove } = useData();
  const toast = useToast();
  const rows = db[coleccion];

  const [modo, setModo] = useState(null); // 'crear' | 'editar' | 'ver'
  const [actual, setActual] = useState(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [borrar, setBorrar] = useState(null);

  const abrirCrear = () => { setValues({ ...defaults }); setErrors({}); setActual(null); setModo('crear'); };
  const abrirEditar = (r) => { setValues({ ...r }); setErrors({}); setActual(r); setModo('editar'); };
  const abrirVer = (r) => { setActual(r); setModo('ver'); };
  const cerrar = () => { setModo(null); setActual(null); setErrors({}); };

  const setVal = (name, v) => {
    setValues((s) => ({ ...s, [name]: v }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const guardar = () => {
    const errs = { ...validar(campos, values), ...(validarExtra ? validarExtra(values, modo, actual) : null) };
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

  const confirmarBorrado = () => {
    remove(coleccion, borrar.id);
    toast.warning(`Se eliminó el registro de ${singular} seleccionado.`, 'Registro eliminado');
    setBorrar(null);
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
        onCreate={abrirCrear}
        createLabel={`Agregar ${singular}`}
        onView={abrirVer}
        onEdit={abrirEditar}
        onDelete={setBorrar}
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
            <button className="btn" onClick={cerrar}>Cancelar</button>
            <button className="btn btn-primary" onClick={guardar}>
              <Icon name="check" size={16} /> {modo === 'crear' ? 'Guardar' : 'Actualizar'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          {campos.map((f) =>
            f.type === 'items' ? (
              <ItemsEditor key={f.name} f={f} value={values[f.name] || []} error={errors[f.name]} onChange={(v) => setVal(f.name, v)} />
            ) : (
              <Field key={f.name} f={f} value={values[f.name]} error={errors[f.name]} onChange={(v) => setVal(f.name, v)} />
            )
          )}
        </div>
      </Modal>

      {/* Detalle */}
      <Modal
        open={modo === 'ver'}
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
            {campos.filter((f) => f.type !== 'items' && !f.ocultarEnDetalle).map((f) => (
              <div className="detail-item" key={f.name}>
                <div className="dl">{f.label}</div>
                <div className="dv">{textoDetalle(f, actual[f.name])}</div>
              </div>
            ))}
          </div>
        ))}
      </Modal>

      <ConfirmDialog
        open={!!borrar}
        onClose={() => setBorrar(null)}
        onConfirm={confirmarBorrado}
        titulo={`Eliminar ${singular}`}
        mensaje={`Si elimina "${etiqueta(borrar)}", se eliminarán también los registros asociados. Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
