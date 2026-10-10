import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import Badge from '@shared/components/ui/Badge.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import MiniTabla from '@shared/components/ui/MiniTabla.jsx';
import RecetaProducto, { costoReceta } from '@features/productos/components/RecetaProducto.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, fecha, ESTADOS_REGISTRO } from '@shared/data/mock.js';

const unidadDe = (i) => i?.calc_abreviatura || i?.calc_unidad || '';

/**
 * Tabla `producto`: el producto base que se vende, armado como prenda
 * (categoria) + talla + tela, p. ej. «Jersey XL Drift». Tiene su precio de
 * venta y su receta (receta_producto): los insumos que gasta una unidad.
 *
 * Al agregarlo a un pedido, el pedido cobra el precio de venta y descuenta
 * del inventario la receta multiplicada por la cantidad. La personalizacion
 * (estampado, colores, diseño) se agrega aparte en el pedido.
 *
 * El formulario guia al usuario: al elegir la tela esta entra sola a la
 * receta, y el nombre se propone a partir de la categoria, la talla y la tela
 * (se puede cambiar).
 */
export default function Productos() {
  const { db, opciones } = useData();
  const categorias = opciones('categorias_producto');
  const tallas = db.tallas.map((t) => ({ value: t.id, label: t.nombre }));
  const esTela = (i) => i.calc_tipo === 'Tela';
  const telas = opciones('insumos', (i) => `${i.nombre} (${unidadDe(i)})`).filter((o) => {
    const i = db.insumos.find((x) => x.id === o.value);
    /* Si todavia no hay insumos de tipo Tela, se ofrecen todos. */
    return !db.insumos.some(esTela) || esTela(i);
  });

  const nombreDe = (id, lista) => lista.find((o) => String(o.value) === String(id))?.label?.replace(/ \([^)]*\)$/, '') || '';
  /** Nombre propuesto: «Jersey XL Drift». */
  const nombreAuto = (v) => [nombreDe(v.id_categoria_producto, categorias), nombreDe(v.id_talla, tallas), nombreDe(v.id_insumo_tela, telas)].filter(Boolean).join(' ');

  /* Al cambiar categoria, talla o tela se vuelve a proponer el nombre,
     salvo que el usuario ya haya escrito uno propio. */
  const proponerNombre = (campo) => (v, setVal, values) => {
    const nuevos = { ...values, [campo]: v };
    if (!values.nombre || values.nombre === nombreAuto(values)) setVal('nombre', nombreAuto(nuevos), false);
  };

  const detalle = (r) => {
    const usos = db.pedidos.filter((p) => (p.productos || []).some((l) => l.id_producto === r.id));
    return (
      <div>
        <div className="detail-grid">
          <div className="detail-item"><div className="dl">Producto</div><div className="dv">{r.nombre}</div></div>
          <div className="detail-item"><div className="dl">Categoría</div><div className="dv">{r.calc_categoria}</div></div>
          <div className="detail-item"><div className="dl">Talla</div><div className="dv">{r.calc_talla}</div></div>
          <div className="detail-item"><div className="dl">Tela</div><div className="dv">{r.calc_tela}</div></div>
          <div className="detail-item"><div className="dl">Precio de venta</div><div className="dv money">{money(r.precio_venta)}</div></div>
          <div className="detail-item"><div className="dl">Costo de la receta</div><div className="dv money">{money(r.calc_costo)}</div></div>
          <div className="detail-item"><div className="dl">Margen por unidad</div><div className="dv money" style={{ color: r.calc_margen < 0 ? 'var(--error-fg)' : undefined }}>{money(r.calc_margen)}</div></div>
          <div className="detail-item"><div className="dl">Estado</div><div className="dv"><Badge>{r.estado}</Badge></div></div>
        </div>

        <h3 className="det-section">Receta por unidad</h3>
        <MiniTabla
          filas={r.receta || []}
          vacio="El producto no tiene receta."
          columnas={[
            { label: 'Insumo', render: (l) => db.insumos.find((i) => i.id === l.id_insumo)?.nombre || '—' },
            { label: 'Cantidad', align: 'right', render: (l) => `${l.cantidad} ${unidadDe(db.insumos.find((i) => i.id === l.id_insumo))}` },
            { label: 'Precio actual', align: 'right', render: (l) => <span className="money">{money(db.insumos.find((i) => i.id === l.id_insumo)?.precio_unitario)}</span> },
            { label: 'Costo', align: 'right', render: (l) => <span className="money">{money(l.cantidad * Number(db.insumos.find((i) => i.id === l.id_insumo)?.precio_unitario || 0))}</span> },
          ]}
        />

        <h3 className="det-section">Cotizaciones y pedidos con este producto</h3>
        <MiniTabla
          filas={usos}
          vacio="Todavía no se ha cotizado ni pedido."
          columnas={[
            { label: 'Código', render: (p) => p.calc_codigo },
            { label: 'Cliente', render: (p) => p.calc_cliente },
            { label: 'Fecha', render: (p) => fecha(p.fecha_creacion) },
            { label: 'Unidades', align: 'right', render: (p) => p.productos.find((l) => l.id_producto === r.id)?.cantidad },
            { label: 'Estado', render: (p) => <Badge>{p.estado}</Badge> },
          ]}
        />
      </div>
    );
  };

  const resumenPrecio = (v) => {
    const costo = costoReceta(v.receta, db.insumos);
    const precio = Number(v.precio_venta || 0);
    return (
      <div className="pedido-total">
        <div><span>Costo de la receta (precio actual de los insumos)</span><strong className="money">{money(costo)}</strong></div>
        <div><span>Precio de venta</span><strong className="money">{money(precio)}</strong></div>
        <div className="is-total">
          <span>Margen por unidad</span>
          <strong className="money" style={{ color: precio - costo < 0 ? 'var(--error-fg)' : undefined }}>{money(precio - costo)}</strong>
        </div>
      </div>
    );
  };

  return (
    <CrudPage
      titulo="Productos"
      subtitulo="Productos base (prenda + talla + tela) con su precio de venta y la receta de insumos que gasta cada unidad."
      icono="shirt"
      modulo="Productos"
      coleccion="productos"
      entidad="productos"
      singular="producto"
      renderDetalle={detalle}
      searchKeys={['nombre', 'calc_categoria', 'calc_talla', 'calc_tela', 'calc_receta_txt']}
      filtros={[
        { key: 'id_categoria_producto', label: 'Categoría', options: categorias },
        { key: 'id_talla', label: 'Talla', options: tallas },
        { key: 'id_insumo_tela', label: 'Tela', options: telas },
        { key: 'estado', label: 'Estado', options: ESTADOS_REGISTRO },
      ]}
      defaults={{ receta: [], estado: 'Activo', nombre: '' }}
      eliminacion={{
        validar: (r) => (r.calc_pedidos
          ? `${r.nombre} figura en ${r.calc_pedidos} cotización(es) o pedido(s). Para conservar ese historial, desactívelo en lugar de eliminarlo.`
          : null),
      }}
      resumen={[
        <KpiCard key="a" label="Productos registrados" value={db.productos.length} icon="shirt" tono="primary" />,
        <KpiCard key="b" label="Activos para pedidos" value={db.productos.filter((p) => p.estado === 'Activo').length} icon="checkC" tono="success" />,
        <KpiCard key="c" label="Con margen negativo" value={db.productos.filter((p) => p.calc_margen < 0).length} icon="alert" tono="warning" />,
      ]}
      columnas={[
        {
          key: 'nombre', label: 'Producto', mobile: 'title',
          render: (r) => (
            <div>
              <div className="cell-main">{r.nombre}</div>
              <div className="caption">{r.calc_categoria} · Talla {r.calc_talla}</div>
            </div>
          ),
        },
        { key: 'calc_tela', label: 'Tela', mobile: 'meta', render: (r) => <span className="badge badge-neutral">{r.calc_tela}</span> },
        { key: 'calc_lineas_receta', label: 'Insumos en receta', align: 'center', render: (r) => <span className="badge badge-info">{r.calc_lineas_receta}</span> },
        { key: 'calc_costo', label: 'Costo', align: 'right', render: (r) => <span className="money">{money(r.calc_costo)}</span> },
        { key: 'precio_venta', label: 'Precio de venta', align: 'right', mobile: 'value', render: (r) => <span className="money">{money(r.precio_venta)}</span> },
        { key: 'estado', label: 'Estado', mobile: 'meta', render: (r) => <EstadoCell row={r} coleccion="productos" modulo="Productos" options={ESTADOS_REGISTRO} /> },
      ]}
      campos={[
        {
          name: 'receta', type: 'component', col: 'izq',
          render: ({ value, onChange, error, values, bloqueado }) => (
            <RecetaProducto value={value || []} onChange={onChange} error={error} idTela={values.id_insumo_tela} readOnly={bloqueado} />
          ),
        },
        { name: 'sec_datos', type: 'custom', full: true, render: () => <div className="form-section">1. Prenda, talla y tela</div> },
        {
          name: 'id_categoria_producto', label: 'Categoría (prenda)', type: 'select', options: categorias, required: true,
          alCambiar: proponerNombre('id_categoria_producto'),
        },
        { name: 'id_talla', label: 'Talla', type: 'select', options: tallas, required: true, alCambiar: proponerNombre('id_talla') },
        {
          name: 'id_insumo_tela', label: 'Tela', type: 'select', options: telas, required: true, full: true,
          hint: 'Al elegirla se agrega a la receta: indique cuánta tela gasta una unidad.',
          /* La tela entra sola a la receta (y la anterior sale si no se le puso cantidad). */
          alCambiar: (v, setVal, values) => {
            proponerNombre('id_insumo_tela')(v, setVal, values);
            const receta = (values.receta || []).filter((l) => !(String(l.id_insumo) === String(values.id_insumo_tela) && !Number(l.cantidad)));
            if (v !== '' && !receta.some((l) => String(l.id_insumo) === String(v))) receta.unshift({ id_insumo: v, cantidad: '' });
            setVal('receta', receta, false);
          },
        },
        { name: 'sec_venta', type: 'custom', full: true, render: () => <div className="form-section">2. Nombre y precio</div> },
        {
          name: 'nombre', label: 'Nombre del producto', type: 'text', required: true, noSpecial: true, unique: true, maxLength: 100, full: true,
          placeholder: 'Ej.: Jersey XL Drift', hint: 'Se propone con la categoría, la talla y la tela; puede cambiarlo.',
        },
        { name: 'precio_venta', label: 'Precio de venta (C$)', type: 'money', required: true, min: 0, full: true, hint: 'Lo que se cobra por unidad de la prenda base. La personalización se cobra aparte en el pedido.' },
        { name: 'resumen_precio', type: 'custom', full: true, render: (v) => resumenPrecio(v) },
        { name: 'estado', label: 'Estado', type: 'switch', full: true, soloEditar: true, hint: 'Un producto inactivo ya no se ofrece en cotizaciones ni pedidos nuevos.' },
      ]}
      validarExtra={(v, modo, actual) => {
        const errs = {};
        const receta = v.receta || [];
        if (!receta.length) errs.receta = 'Agregue al menos la tela con la cantidad que gasta una unidad.';
        else if (receta.some((l) => l.cantidad === '' || !(Number(l.cantidad) > 0))) errs.receta = 'Todas las cantidades de la receta deben ser mayores que cero.';
        else if (v.id_insumo_tela && !receta.some((l) => String(l.id_insumo) === String(v.id_insumo_tela))) errs.receta = 'La receta debe incluir la tela del producto.';
        const repetido = db.productos.find((p) => p.id !== actual?.id
          && String(p.id_categoria_producto) === String(v.id_categoria_producto)
          && String(p.id_talla) === String(v.id_talla)
          && String(p.id_insumo_tela) === String(v.id_insumo_tela));
        if (repetido) errs.id_insumo_tela = `Ya existe ese producto: ${repetido.nombre}.`;
        return errs;
      }}
      beforeSave={(d) => ({ ...d, receta: (d.receta || []).map((l) => ({ id_insumo: l.id_insumo, cantidad: Number(l.cantidad) })) })}
    />
  );
}
