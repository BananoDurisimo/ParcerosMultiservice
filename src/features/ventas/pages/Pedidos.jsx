import CrudPage from '@shared/components/CrudPage.jsx';
import EstadoCell from '@shared/components/ui/EstadoCell.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import Icon from '@shared/components/Icon.jsx';
import { ItemsView } from '@shared/components/ui/Form.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, fecha, hoyISO, ESTADOS_PEDIDO, ESTADOS_PEDIDO_TODOS, PEDIDO_ANULADO } from '@shared/data/mock.js';

/** Tabla `pedido` (id_cliente, estado, fecha_inicio, descripcion) con dos detalles:
 *  - detalle_pedido (id_varianteproducto, cantidad, precio_unitario, subtotal):
 *    apunta a la variante -producto + talla-, nunca al producto completo.
 *  - detalle_pedido_insumo (id_insumo, cantidad, precio_unitario, subtotal):
 *    los materiales que se gastan en la personalizacion descrita.
 *  El total y lo abonado no son columnas: se derivan de ambos detalles y de abono.
 *
 *  Un pedido vigente compromete inventario: al guardarlo, sus lineas se
 *  descuentan de las existencias de la variante y del insumo, y al anularlo se
 *  devuelven. Por eso no se puede pedir mas de lo que hay. */

const subtotalLineas = (lineas = []) =>
  lineas.reduce((s, l) => s + Number(l.cantidad || 0) * Number(l.precio_unitario || 0), 0);

/** Desglose del total: se usa en el formulario (en vivo) y en el detalle. */
function ResumenTotal({ productos, insumos }) {
  return (
    <div className="pedido-total">
      <div><span>Productos base</span><strong className="money">{money(productos)}</strong></div>
      <div><span>Insumos de la personalización</span><strong className="money">{money(insumos)}</strong></div>
      <div className="is-total"><span>Total del pedido</span><strong className="money">{money(productos + insumos)}</strong></div>
    </div>
  );
}

export default function Pedidos() {
  const { db, getStats, opciones } = useData();
  const stats = getStats('Mes');
  const clientes = opciones('clientes');
  const variantes = opciones('variantes', (v) => v.calc_etiqueta);
  /* Al armar el pedido conviene ver cuantas unidades hay de esa talla. */
  const variantesEditor = opciones('variantes', (v) => `${v.calc_etiqueta} · ${v.stock} disponibles`);

  /* En el detalle basta el nombre y la unidad; al elegir en el formulario
     conviene ver ademas cuanto hay disponible en inventario. */
  const unidad = (i) => i.calc_abreviatura || i.calc_unidad;
  const insumos = opciones('insumos', (i) => `${i.nombre} (${unidad(i)})`);
  const insumosEditor = opciones('insumos', (i) => `${i.nombre} (${unidad(i)}) · ${i.stock} disponibles`);

  /* Precio sugerido al elegir cada linea: el precio base del producto y el
     costo unitario del insumo. En ambos casos se puede ajustar a mano. */
  const precioVariante = (id) => db.variantes.find((x) => x.id === id)?.calc_precio;
  const precioInsumo = (id) => db.insumos.find((i) => i.id === id)?.precio_unitario;

  const codigo = (r) => `PED-${String(r.id).padStart(4, '0')}`;

  const detalle = (r) => {
    const pct = r.calc_total ? Math.round((r.calc_abonado / r.calc_total) * 100) : 0;
    const idx = ESTADOS_PEDIDO.indexOf(r.estado);

    return (
      <div>
        <div className="detail-grid">
          <div className="detail-item"><div className="dl">Pedido</div><div className="dv">{codigo(r)}</div></div>
          <div className="detail-item"><div className="dl">Cliente</div><div className="dv">{r.calc_cliente}</div></div>
          <div className="detail-item"><div className="dl">Fecha de inicio</div><div className="dv">{fecha(r.fecha_inicio)}</div></div>
          <div className="detail-item"><div className="dl">Estado</div><div className="dv">{r.estado}</div></div>
        </div>

        <h3 style={{ margin: '18px 0 10px' }}>Variantes del producto</h3>
        <ItemsView lineas={r.detalles || []} opciones={variantes} itemKey="id_varianteproducto" itemLabel="Variante (producto y talla)" />

        <h3 style={{ margin: '18px 0 10px' }}>Personalización</h3>
        <div className="pedido-desc">
          {r.descripcion || <span className="caption">Este pedido no tiene una descripción de la personalización.</span>}
        </div>

        <h3 style={{ margin: '18px 0 10px' }}>Insumos a utilizar</h3>
        <ItemsView
          lineas={r.insumos || []}
          opciones={insumos}
          itemKey="id_insumo"
          itemLabel="Insumo"
          vacio="No se registraron insumos para este pedido."
        />

        <div style={{ marginTop: 14 }}>
          <ResumenTotal productos={r.calc_total_productos} insumos={r.calc_total_insumos} />
        </div>

        <h3 style={{ margin: '18px 0 10px' }}>Estado financiero</h3>
        <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
          <div className="grow" style={{ minWidth: 190 }}>
            <div className="between caption" style={{ marginBottom: 5 }}>
              <span>Abonado: <strong className="strong">{money(r.calc_abonado)}</strong> de {money(r.calc_total)}</span>
              <span>{pct}%</span>
            </div>
            <div className={`bar ${r.calc_saldo === 0 ? 'ok' : 'warn'}`}><i style={{ width: pct + '%' }} /></div>
            <div className="caption" style={{ marginTop: 5 }}>Saldo pendiente: <strong className="strong">{money(r.calc_saldo)}</strong></div>
          </div>
        </div>

        <h3 style={{ margin: '18px 0 10px' }}>Abonos registrados</h3>
        <div className="items-box">
          <div className="items-row head"><span>Fecha</span><span>Método</span><span>Monto</span><span style={{ width: 34 }} /></div>
          {db.abonos.filter((a) => a.id_pedido === r.id).length === 0 && (
            <div style={{ padding: '14px 12px' }} className="caption">Este pedido aún no tiene abonos.</div>
          )}
          {db.abonos.filter((a) => a.id_pedido === r.id).map((a) => (
            <div className="items-row" key={a.id}>
              <span style={{ fontSize: 13 }}>{fecha(a.fecha)}</span>
              <span style={{ fontSize: 13 }}>{a.metodo_pago}</span>
              <span className="money" style={{ fontSize: 13 }}>{money(a.monto)}</span>
              <span style={{ width: 34 }} />
            </div>
          ))}
        </div>

        <h3 style={{ margin: '18px 0 10px' }}>Trazabilidad del pedido</h3>
        {r.estado === PEDIDO_ANULADO ? (
          <div className="alert alert-error">
            <Icon name="xC" size={20} />
            <div>Este pedido fue <strong>anulado</strong>: quedó fuera del flujo de trabajo y no suma en las ventas.</div>
          </div>
        ) : (
        <div className="timeline">
          {ESTADOS_PEDIDO.map((e, i) => (
            <div className={`tl-item ${i < idx ? 'done' : i > idx ? 'pend' : ''}`} key={e}>
              <div style={{ fontWeight: i === idx ? 600 : 400, fontSize: 13.5, color: i > idx ? 'var(--text-sec)' : 'var(--text)' }}>{e}</div>
              <div className="caption">{i < idx ? 'Etapa completada' : i === idx ? 'Etapa actual' : 'Pendiente'}</div>
            </div>
          ))}
        </div>
        )}
      </div>
    );
  };

  /* El pedido compromete inventario desde que entra en produccion: mientras es
     una cotizacion aprobada no descuenta nada. Por eso las existencias se
     revisan justo cuando el pedido pasa -o nace- en un estado que consume. */
  const consumeInventario = (estado) => ESTADOS_PEDIDO.indexOf(estado) >= 1;

  /**
   * Lineas que no alcanzan: [{ nombre, pide, hay }].
   * `anterior` es el pedido tal como esta guardado; si ya venia descontando,
   * lo suyo vuelve a contar como disponible para el mismo pedido.
   */
  const faltantes = (pedido, anterior) => {
    const yaDescontado = anterior && consumeInventario(anterior.estado) ? anterior : null;
    const out = [];

    const revisar = (campo, llave, coleccion, nombre) => {
      const pide = new Map();
      (pedido[campo] || []).forEach((l) => {
        pide.set(l[llave], (pide.get(l[llave]) || 0) + Number(l.cantidad || 0));
      });
      for (const [id, cantidad] of pide) {
        const fila = db[coleccion].find((x) => String(x.id) === String(id));
        if (!fila) continue;
        const propio = (yaDescontado?.[campo] || [])
          .filter((l) => String(l[llave]) === String(id))
          .reduce((s, l) => s + Number(l.cantidad || 0), 0);
        const hay = Number(fila.stock || 0) + propio;
        if (cantidad > hay) out.push({ campo, nombre: nombre(fila), pide: cantidad, hay });
      }
    };

    revisar('detalles', 'id_varianteproducto', 'variantes', (x) => x.calc_etiqueta);
    revisar('insumos', 'id_insumo', 'insumos', (x) => x.nombre);
    return out;
  };

  const listaFaltantes = (faltan) =>
    faltan.map((f) => `${f.nombre} (se piden ${f.pide} y hay ${f.hay})`).join('; ');

  /* Al guardar: solo se exige inventario si el pedido queda en un estado que
     consume. Una cotizacion aprobada se puede registrar sin existencias. */
  const validarExtra = (v, modo, actual) => {
    if (!consumeInventario(v.estado)) return null;
    const faltan = faltantes(v, actual);
    if (!faltan.length) return null;
    return {
      [faltan[0].campo]: `No hay existencias suficientes para poner el pedido en producción: ${listaFaltantes(faltan)}.`,
    };
  };

  /* Al cambiar el estado desde el listado: el pedido no entra en produccion si
     falta material (HU_080). Si ya venia consumiendo, avanzar de etapa no pide
     existencias nuevas. */
  const validarCambioEstado = (nuevo, row) => {
    if (!consumeInventario(nuevo) || consumeInventario(row.estado)) return null;
    const faltan = faltantes(row, row);
    return faltan.length ? `No hay existencias suficientes: ${listaFaltantes(faltan)}.` : null;
  };

  return (
    <CrudPage
      titulo="Pedidos"
      subtitulo="Trazabilidad completa desde la cotización aprobada hasta la entrega del pedido."
      icono="clipboard"
      coleccion="pedidos"
      entidad="pedidos"
      singular="pedido"
      searchKeys={['calc_cliente', 'estado', 'fecha_inicio', 'descripcion']}
      filtros={[
        { key: 'estado', label: 'Estado del pedido', options: ESTADOS_PEDIDO_TODOS },
        { key: 'id_cliente', label: 'Cliente', options: clientes },
      ]}
      defaults={{ detalles: [], insumos: [], descripcion: '', estado: 'Cotización aprobada', fecha_inicio: hoyISO() }}
      etiquetaRegistro={codigo}
      validarExtra={validarExtra}
      anulacion={{
        valor: PEDIDO_ANULADO,
        mensaje: (r) => `El pedido ${codigo(r)} de ${r.calc_cliente} quedará marcado como anulado: se conserva en el listado y en el historial, pero deja de sumar en las ventas y en el saldo por cobrar.`,
      }}
      resumen={[
        <KpiCard key="a" label="Ventas del mes" value={stats.ventasMes} prefix="C$ " icon="coin" tono="success" trend={stats.tendencias.ventas} />,
        <KpiCard key="b" label="Pedidos activos" value={stats.pedidosActivos} icon="clipboard" tono="primary" />,
        <KpiCard key="c" label="Por cobrar" value={stats.porCobrar} prefix="C$ " icon="alert" tono="warning" />,
      ]}
      renderDetalle={detalle}
      columnas={[
        { key: 'id', label: 'Pedido', mobile: 'title', render: (r) => <span className="cell-main">{codigo(r)}</span> },
        { key: 'calc_cliente', label: 'Cliente', mobile: 'meta', render: (r) => r.calc_cliente },
        { key: 'fecha_inicio', label: 'Fecha de inicio', mobile: 'meta', render: (r) => <span className="caption">{fecha(r.fecha_inicio)}</span> },
        { key: 'calc_total', label: 'Total', align: 'right', mobile: 'value', render: (r) => <span className="money">{money(r.calc_total)}</span> },
        {
          key: 'calc_abonado', label: 'Abonado', align: 'right',
          render: (r) => {
            const pct = r.calc_total ? Math.round((r.calc_abonado / r.calc_total) * 100) : 0;
            return (
              <div style={{ minWidth: 96 }}>
                <div className="caption right">{pct}%</div>
                <div className={`bar ${pct === 100 ? 'ok' : pct === 0 ? 'bad' : 'warn'}`}><i style={{ width: pct + '%' }} /></div>
              </div>
            );
          },
        },
        {
          /* Anular tiene su propia confirmacion en el formulario: el
             desplegable del listado solo recorre las etapas normales y se
             bloquea cuando el pedido ya esta anulado. */
          key: 'estado', label: 'Estado', mobile: 'meta',
          render: (r) => (
            <EstadoCell
              row={r}
              coleccion="pedidos"
              nombre={codigo(r)}
              etiqueta="estado del pedido"
              options={ESTADOS_PEDIDO}
              validarCambio={validarCambioEstado}
              disabled={r.estado === PEDIDO_ANULADO}
            />
          ),
        },
      ]}
      campos={[
        { name: 'id_cliente', label: 'Cliente', type: 'select', options: clientes, required: true },
        { name: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true },
        { name: 'estado', label: 'Estado del pedido', type: 'select', options: ESTADOS_PEDIDO, required: true },
        {
          name: 'detalles', label: '1. Variantes del producto', type: 'items', required: true,
          itemKey: 'id_varianteproducto', itemLabel: 'Variante (producto y talla)', options: variantesEditor,
          precioSugerido: precioVariante, totalLabel: 'Subtotal de productos',
          hint: 'Cada línea es una variante -el producto en una talla concreta-, no el producto completo. Al elegirla se sugiere el precio base del producto; puede ajustarlo.',
        },
        {
          name: 'descripcion', label: '2. Descripción de la personalización', type: 'textarea', full: true, required: true, maxLength: 600,
          placeholder: 'Ej.: escudo sublimado en el pecho, nombre y número de cada jugador en la espalda en negro, franjas rojas en las mangas…',
          hint: 'Qué se le va a realizar al producto base: diseño, colores, estampados, bordados, nombres y números.',
        },
        {
          name: 'insumos', label: '3. Insumos a utilizar', type: 'items',
          itemKey: 'id_insumo', itemLabel: 'Insumo', options: insumosEditor, decimales: true,
          precioSugerido: precioInsumo, totalLabel: 'Subtotal de insumos',
          hint: 'Materiales que se gastan en la personalización (tintas, botones, escudos…). Admite decimales, por ejemplo 1.5 litros.',
        },
        {
          name: 'resumen', type: 'custom', full: true,
          render: (v) => <ResumenTotal productos={subtotalLineas(v.detalles)} insumos={subtotalLineas(v.insumos)} />,
        },
      ]}
      beforeSave={(d) => {
        // detalle_pedido.subtotal y detalle_pedido_insumo.subtotal si se almacenan.
        // Se redondea a centavos: 1.5 L x 395.10 no debe dejar decimales sueltos.
        const conSubtotal = (l) => ({ ...l, subtotal: Math.round(l.cantidad * l.precio_unitario * 100) / 100 });
        return { ...d, detalles: (d.detalles || []).map(conSubtotal), insumos: (d.insumos || []).map(conSubtotal) };
      }}
    />
  );
}
