import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from './Icon.jsx';
import DataTable from './ui/DataTable.jsx';
import Modal from './ui/Modal.jsx';
import ConfirmDialog from './ui/ConfirmDialog.jsx';
import { Field, ItemsEditor, normOpciones, validar } from './ui/Form.jsx';
import { exportarPdf, exportarExcel, generarReporte } from '@shared/lib/exportar.js';
import { useData } from '@shared/context/DataContext.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';
import { etiquetaFila, AGREGAR, EDITAR, VER_DETALLE, CAMBIAR_ESTADO, ANULAR, ELIMINAR, EXPORTAR } from '@shared/data/mock.js';

/**
 * Pagina CRUD reutilizable: cabecera, resumen, tabla, formulario y detalle.
 *
 * `modulo` es el permiso (tabla `permiso`) de la pantalla: los botones de
 * agregar, editar, ver detalle, cambiar estado y anular solo aparecen si el
 * rol del usuario tiene el privilegio correspondiente en ese modulo.
 *
 * Eliminar (privilegio «Eliminar») borra la fila tras una confirmacion. Cada
 * modulo puede pasar `eliminacion` para impedirlo cuando otros registros
 * dependen de la fila (`validar` devuelve el motivo), para explicar en la
 * confirmacion lo que va a pasar (`mensaje`) o para borrar a su manera, por
 * ejemplo en cascada (`alEliminar`). Ademas, el modulo de compras recibe la
 * prop `anulacion` para dar de baja el documento sin borrarlo, dejandolo en
 * la base de datos con su estado en "Anulada".
 *
 * Formulario en dos columnas: los campos con `col: 'izq'` van a la columna
 * izquierda y el resto a la derecha (p. ej. los insumos del pedido a un lado
 * y el desglose, la descripcion y el diseño al otro).
 *
 * `abrirCon`: valores con que abrir de una vez el formulario de agregar (p. ej.
 * el abono de una cotizacion, desde el listado de cotizaciones). Con
 * `?nuevo=1` en la direccion (accesos rapidos del inicio) se abre el
 * formulario de agregar vacio.
 *
 * `exportacion` (privilegio «Exportar»): agrega a la tabla «Exportar» (PDF o
 * Excel) y «Reporte». { columnas, indicadores(filas), grupos(filas) } con el
 * formato de shared/lib/exportar.js; las filas son las que muestra la tabla.
 */
export default function CrudPage({
  titulo,
  subtitulo,
  icono,
  modulo,
  coleccion,
  /* Filas a listar; por defecto toda la coleccion. */
  filas,
  entidad,
  singular,
  columnas,
  campos,
  filtros = [],
  searchKeys = [],
  defaults = {},
  pageSize = 8,
  resumen = null,
  /* Contenido entre la cabecera y la tabla (p. ej. las pestañas de Pedidos). */
  subnav = null,
  renderDetalle,
  beforeSave,
  /* Guardado propio del modulo: recibe los datos ya validados y se encarga de
     persistirlos y de avisar. Si no viene, se crea o actualiza la fila. */
  alGuardar,
  pageActions,
  etiquetaRegistro,
  validarExtra,
  conDetalle = true,
  conCrear = true,
  puedeEditarFila = () => true,
  accionesExtra,
  tablaCompacta = false,
  emptyText,
  anulacion = null, // { valor, campo = 'estado', mensaje(reg), validar(reg) }
  eliminacion = {}, // { validar(reg), mensaje(reg), alEliminar(reg) }
  abrirCon = null,
  alAbrirCon,
  exportacion = null,
}) {
  const { db, create, update, remove } = useData();
  const { puedeAccion } = useAuth();
  const toast = useToast();
  const rows = filas || db[coleccion];

  const puedeCrear = conCrear && puedeAccion(modulo, AGREGAR);
  const puedeEditar = puedeAccion(modulo, EDITAR);
  const puedeVer = conDetalle && puedeAccion(modulo, VER_DETALLE);
  const puedeEstado = puedeAccion(modulo, CAMBIAR_ESTADO);
  const puedeEliminar = puedeAccion(modulo, ELIMINAR);
  const puedeExportar = !!exportacion && puedeAccion(modulo, EXPORTAR);

  const [modo, setModo] = useState(null); // 'crear' | 'editar' | 'ver'
  const [actual, setActual] = useState(null);
  const [values, setValues] = useState({});
  /* Validacion en tiempo real: los errores se recalculan con cada cambio y
     se muestran en el campo apenas el usuario lo toca. Los campos que no ha
     tocado se marcan recien al intentar guardar. */
  const [tocados, setTocados] = useState({});
  const [intentado, setIntentado] = useState(false);
  const [anular, setAnular] = useState(null);
  const [eliminar, setEliminar] = useState(null);

  /* Anular no borra la fila: solo cambia su estado, de modo que el documento
     siga apareciendo en los listados y en el historial de movimientos. Como es
     una baja y no una etapa mas, el valor de anulacion no figura entre las
     opciones del campo: se llega a el por el boton, con confirmacion. */
  const campoAnulacion = anulacion?.campo || 'estado';
  const estaAnulado = (r) => !!anulacion && r?.[campoAnulacion] === anulacion.valor;

  /* Campos marcados `soloEditar`: no se piden al crear (el registro nace con
     el valor de `defaults`). Campos `soloCrear`: se piden al crear y al editar
     se muestran bloqueados; con `ocultarAlEditar` ni siquiera se muestran.
     El estado solo aparece si el rol puede cambiarlo. */
  const camposFormulario = campos
    .filter((f) => !(f.soloEditar && modo === 'crear'))
    .filter((f) => !(f.ocultarAlEditar && modo === 'editar'))
    .filter((f) => !(f.name === 'estado' && modo === 'editar' && !puedeEstado))
    .map((f) =>
      estaAnulado(actual) && f.name === campoAnulacion && f.options && !f.options.includes(anulacion.valor)
        ? { ...f, options: [...f.options, anulacion.valor] }
        : f
    );

  const reiniciarValidacion = () => { setTocados({}); setIntentado(false); };
  const abrirCrear = (iniciales) => { setValues({ ...defaults, ...iniciales }); reiniciarValidacion(); setActual(null); setModo('crear'); };
  const abrirEditar = (r) => { setValues({ ...r }); reiniciarValidacion(); setActual(r); setModo('editar'); };
  const abrirVer = (r) => { setActual(r); setModo('ver'); };
  const cerrar = () => { setModo(null); setActual(null); reiniciarValidacion(); };

  /* `tocar = false` cambia el valor sin marcar el campo (p. ej. cuando el
     sistema lo reinicia por otro campo y el usuario aun no lo ha diligenciado). */
  const setVal = (name, v, tocar = true) => {
    setValues((s) => ({ ...s, [name]: v }));
    if (tocar) setTocados((t) => (t[name] ? t : { ...t, [name]: true }));
  };

  /* Un campo puede ajustar otros al cambiar (`alCambiar`): por ejemplo, al
     elegir otro pedido se reinicia el monto del abono. */
  const cambiarCampo = (f, v) => {
    setVal(f.name, v);
    f.alCambiar?.(v, setVal, values);
  };

  /* Abre el formulario de agregar ya diligenciado cuando otra pantalla lo pide. */
  useEffect(() => {
    if (!abrirCon) return;
    if (puedeCrear) abrirCrear(abrirCon);
    else toast.error(`Su rol no tiene permiso para agregar ${entidad}.`, 'Acción no permitida');
    alAbrirCon?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirCon]);

  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('nuevo') !== '1') return;
    if (puedeCrear) abrirCrear();
    const resto = new URLSearchParams(params);
    resto.delete('nuevo');
    setParams(resto, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  /** Campos `unique`: el valor no puede repetirse en otra fila (sin distinguir mayusculas). */
  const repetidos = (vals) => {
    const norm = (v) => String(v ?? '').trim().toLowerCase();
    const errs = {};
    campos.forEach((f) => {
      if (!f.unique || !norm(vals[f.name])) return;
      if (db[coleccion].some((r) => r.id !== actual?.id && norm(r[f.name]) === norm(vals[f.name]))) {
        errs[f.name] = `Ya existe un ${singular} con este ${(f.label || 'valor').toLowerCase()}.`;
      }
    });
    return errs;
  };

  const calcularErrores = (vals) => {
    const errs = { ...repetidos(vals), ...validar(camposFormulario, vals), ...(validarExtra ? validarExtra(vals, modo, actual) : null) };
    Object.keys(errs).forEach((k) => errs[k] === undefined && delete errs[k]);
    return errs;
  };

  const formularioAbierto = modo === 'crear' || modo === 'editar';
  const erroresVivos = formularioAbierto ? calcularErrores(values) : {};
  const errors = intentado
    ? erroresVivos
    : Object.fromEntries(Object.entries(erroresVivos).filter(([k]) => tocados[k]));

  const guardar = () => {
    const errs = calcularErrores(values);
    const n = Object.keys(errs).length;
    if (n) {
      setIntentado(true);
      toast.error(
        n === 1 ? 'Hay 1 campo con error: corríjalo para poder guardar.' : `Hay ${n} campos con error: corríjalos para poder guardar.`,
        'Validación de campos'
      );
      /* Lleva la vista al primer campo con error. */
      requestAnimationFrame(() => {
        document.querySelector('.modal .field-error')?.closest('.field')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
      return;
    }
    /* El payload se arma unicamente con los campos declarados, que son las
       columnas reales de la tabla: asi los valores derivados (calc_*) que
       vienen en la fila al editar nunca se escriben en la "base de datos". */
    let data = modo === 'crear' ? { ...defaults } : {};
    camposFormulario.forEach((f) => {
      if (f.type === 'custom') return; // solo presentacion: no es una columna
      /* Un componente propio puede llenar varias columnas a la vez. */
      if (f.type === 'component' && f.columnas) {
        f.columnas.forEach((c) => { data[c] = values[c]; });
        return;
      }
      const v = values[f.name];
      data[f.name] = f.type === 'number' || f.type === 'money' ? Number(v || 0) : v;
    });
    if (beforeSave) data = beforeSave(data, modo, actual);

    if (alGuardar) {
      alGuardar(data, modo, actual);
    } else if (modo === 'crear') {
      create(coleccion, data);
      toast.success(`El registro de ${singular} se guardó correctamente.`);
    } else {
      update(coleccion, actual.id, data);
      toast.success(`El registro de ${singular} se actualizó correctamente.`);
    }
    cerrar();
  };

  const puedeAnular = !!anulacion && modo === 'editar' && !estaAnulado(actual) && puedeAccion(modulo, ANULAR);

  const confirmarAnulacion = () => {
    const motivo = anulacion.validar?.(anular);
    if (motivo) {
      toast.error(motivo, `No fue posible anular la ${singular}`);
      setAnular(null);
      return;
    }
    update(coleccion, anular.id, { [campoAnulacion]: anulacion.valor });
    toast.warning(`Se anuló el registro de ${singular}: ${etiqueta(anular)}.`, 'Registro anulado');
    setAnular(null);
    cerrar();
  };

  /** Resuelve el texto de un campo en el modal de detalle (los select y
      multiselect de llave foranea guardan ids, no nombres). */
  const pedirEliminar = (r) => {
    const motivo = eliminacion.validar?.(r);
    if (motivo) { toast.error(motivo, `No es posible eliminar el registro de ${singular}`); return; }
    setEliminar(r);
  };

  const confirmarEliminar = () => {
    const r = eliminar;
    /* Se vuelve a validar: entre abrir el dialogo y confirmar pudo cambiar algo. */
    const motivo = eliminacion.validar?.(r);
    if (motivo) {
      toast.error(motivo, `No es posible eliminar el registro de ${singular}`);
    } else {
      if (eliminacion.alEliminar) eliminacion.alEliminar(r);
      else remove(coleccion, r.id);
      toast.success(`Se eliminó el registro de ${singular}: ${etiqueta(r)}.`, 'Registro eliminado');
      if (actual?.id === r.id) cerrar();
    }
    setEliminar(null);
  };

  const textoDetalle = (f, v) => {
    if (v === undefined || v === null || v === '') return '—';
    if (f.type === 'select' || f.type === 'multiselect') {
      const opts = normOpciones(f.options || []);
      const nombre = (x) => opts.find((o) => String(o.value) === String(x))?.label ?? x;
      return Array.isArray(v) ? (v.map(nombre).join(', ') || '—') : nombre(v);
    }
    return Array.isArray(v) ? v.join(', ') : String(v);
  };

  const etiqueta = (r) => (r ? (etiquetaRegistro ? etiquetaRegistro(r) : etiquetaFila(r)) : '—');

  const dividido = camposFormulario.some((f) => f.col === 'izq');
  const izquierda = camposFormulario.filter((f) => f.col === 'izq');
  const derecha = camposFormulario.filter((f) => f.col !== 'izq');

  const renderCampo = (f) => {
    const bloqueado = !!f.soloCrear && modo === 'editar';
    if (f.type === 'custom') {
      /* Bloque de solo lectura calculado con los valores del formulario
         (por ejemplo, el total en vivo de una cotizacion). */
      return <div key={f.name} className={`field ${f.full ? 'full' : ''}`}>{f.render(values, modo, actual)}</div>;
    }
    if (f.type === 'component') {
      return (
        <div key={f.name} className={`field ${f.full === false ? '' : 'full'}`}>
          {f.render({ value: values[f.name], onChange: (v) => cambiarCampo(f, v), error: errors[f.name], errors, values, setVal, modo, actual, bloqueado })}
        </div>
      );
    }
    if (f.type === 'items') {
      return <ItemsEditor key={f.name} f={f} value={values[f.name] || []} error={errors[f.name]} readOnly={bloqueado} onChange={(v) => cambiarCampo(f, v)} />;
    }
    return (
      <Field
        key={f.name}
        f={f}
        value={values[f.name]}
        error={errors[f.name]}
        readOnly={bloqueado}
        onChange={(v) => cambiarCampo(f, v)}
      />
    );
  };
  const editable = (r) => puedeEditar && puedeEditarFila(r);

  const exportar = (formato, filasTabla, filtrosTabla) => {
    if (!filasTabla.length) {
      toast.warning(`No hay ${entidad} para exportar con la búsqueda y los filtros actuales.`, 'Nada que exportar');
      return;
    }
    const doc = {
      titulo,
      archivo: entidad,
      filtros: filtrosTabla,
      columnas: exportacion.columnas,
      filas: filasTabla,
      ...(formato === 'pdf' ? {} : {
        indicadores: exportacion.indicadores?.(filasTabla) || [],
        grupos: exportacion.grupos?.(filasTabla) || [],
      }),
    };
    if (formato === 'pdf') exportarPdf(doc);
    else if (formato === 'excel') exportarExcel(doc);
    else generarReporte(doc);
    const que = { pdf: 'el PDF', excel: 'el Excel', reporte: 'el reporte' }[formato];
    toast.success(`Se generó ${que} con ${filasTabla.length} ${entidad}.`, formato === 'reporte' ? 'Reporte generado' : 'Exportación lista');
  };

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

      {subnav}

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
        onCreate={puedeCrear ? () => abrirCrear() : undefined}
        createLabel={`Agregar ${singular}`}
        onView={puedeVer ? abrirVer : undefined}
        onEdit={puedeEditar ? abrirEditar : undefined}
        puedeEditarFila={puedeEditarFila}
        onDelete={puedeEliminar ? pedirEliminar : undefined}
        accionesExtra={accionesExtra}
        onExportar={puedeExportar ? exportar : undefined}
        emptyText={emptyText}
      />

      {/* Formulario crear / editar */}
      <Modal
        open={modo === 'crear' || modo === 'editar'}
        onClose={cerrar}
        size={dividido ? 'xl' : campos.some((c) => c.type === 'items' || c.type === 'component') ? 'lg' : ''}
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

        {dividido ? (
          <div className="form-split">
            <div className="form-col">{izquierda.map(renderCampo)}</div>
            <div className="form-col form-col-der"><div className="form-grid">{derecha.map(renderCampo)}</div></div>
          </div>
        ) : (
          <div className="form-grid">{camposFormulario.map(renderCampo)}</div>
        )}
      </Modal>

      {/* Detalle */}
      <Modal
        open={puedeVer && modo === 'ver'}
        onClose={cerrar}
        title={`Detalle de ${singular}`}
        subtitle={etiqueta(actual)}
        size={renderDetalle || campos.some((c) => c.type === 'items') ? 'lg' : ''}
        footer={
          <>
            {actual && puedeEliminar && (
              <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={() => pedirEliminar(actual)}>
                <Icon name="trash" size={16} /> Eliminar
              </button>
            )}
            <button className="btn" onClick={cerrar}>Cerrar</button>
            {actual && editable(actual) && (
              <button className="btn btn-warning" onClick={() => abrirEditar(actual)}>
                <Icon name="edit" size={16} /> Editar
              </button>
            )}
          </>
        }
      >
        {actual && (renderDetalle ? renderDetalle(actual) : (
          <div className="detail-grid">
            {campos.filter((f) => !['items', 'custom', 'component'].includes(f.type) && !f.ocultarEnDetalle).map((f) => (
              <div className="detail-item" key={f.name}>
                <div className="dl">{f.label}</div>
                <div className="dv">{textoDetalle(f, actual[f.name])}</div>
              </div>
            ))}
          </div>
        ))}
      </Modal>

      <ConfirmDialog
        open={!!eliminar}
        onClose={() => setEliminar(null)}
        onConfirm={confirmarEliminar}
        titulo={`Eliminar ${singular}`}
        confirmLabel="Eliminar"
        icono="trash"
        mensaje={
          eliminar && (eliminacion.mensaje
            ? eliminacion.mensaje(eliminar)
            : `Se eliminará el registro de ${singular} "${etiqueta(eliminar)}". Esta acción no se puede deshacer.`)
        }
      />

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
