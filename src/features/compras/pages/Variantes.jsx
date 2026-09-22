import { useMemo } from 'react';
import CrudPage from '@shared/components/CrudPage.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import Icon from '@shared/components/Icon.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { money, fecha, UMBRAL_STOCK_BAJO } from '@shared/data/mock.js';

/**
 * Tabla `varianteproducto` (id_varianteproducto, id_producto, id_talla,
 * url_imagen, stock).
 *
 * El producto solo guarda nombre, categoria, precio y estado; es aqui donde se
 * divide en una fila por talla (XS, S, M, L, XL...). La variante es la que
 * lleva las existencias y la que se relaciona en los pedidos: el pedido nunca
 * apunta al producto, sino a la talla concreta que se va a confeccionar.
 */
export default function Variantes() {
  const { db, opciones } = useData();
  const productos = opciones('productos');
  const tallas = opciones('tallas');

  const rows = db.variantes;

  const resumen = useMemo(() => {
    const bajas = rows.filter((v) => v.stock <= UMBRAL_STOCK_BAJO).length;
    return {
      total: rows.length,
      unidades: rows.reduce((s, v) => s + Number(v.stock || 0), 0),
      bajas,
      valor: rows.reduce((s, v) => s + v.calc_valor, 0),
    };
  }, [rows]);

  /** Tono de las existencias: agotada, baja o suficiente. */
  const tonoStock = (n) => (n === 0 ? 'error' : n <= UMBRAL_STOCK_BAJO ? 'warning' : 'success');

  /* La pareja producto + talla no puede repetirse: en la base de datos esas
     dos llaves foraneas forman la clave unica de varianteproducto. */
  const validarExtra = (v, modo, actual) => {
    if (!v.id_producto || !v.id_talla) return null;
    const repetida = rows.some(
      (r) => r.id !== actual?.id && r.id_producto === v.id_producto && r.id_talla === v.id_talla
    );
    return repetida
      ? { id_talla: 'Este producto ya tiene una variante con esta talla.' }
      : null;
  };

  return (
    <CrudPage
      titulo="Variante producto"
      subtitulo="Divida cada producto del catálogo en sus tallas y controle las existencias de cada una."
      icono="box"
      coleccion="variantes"
      entidad="variantes"
      singular="variante"
      tablaCompacta
      searchKeys={['calc_producto', 'calc_talla', 'calc_etiqueta', 'calc_categoria']}
      filtros={[
        { key: 'id_producto', label: 'Producto', options: productos },
        { key: 'id_talla', label: 'Talla', options: tallas },
      ]}
      defaults={{ stock: 0, url_imagen: '' }}
      etiquetaRegistro={(r) => r.calc_etiqueta}
      validarExtra={validarExtra}
      resumen={[
        <KpiCard key="a" label="Variantes registradas" value={resumen.total} icon="box" tono="primary" />,
        <KpiCard key="b" label="Unidades en existencia" value={resumen.unidades} icon="package" tono="success" />,
        <KpiCard key="c" label="Variantes con stock bajo" value={resumen.bajas} icon="alert" tono="warning" />,
        <KpiCard key="d" label="Valor del inventario" value={resumen.valor} prefix="C$ " icon="coin" tono="info" />,
      ]}
      columnas={[
        {
          key: 'calc_producto', label: 'Producto', mobile: 'title',
          render: (r) => (
            <div>
              <div className="cell-main">{r.calc_producto}</div>
              <div className="caption">{r.calc_categoria}</div>
            </div>
          ),
        },
        {
          key: 'id_talla', label: 'Talla', align: 'center', mobile: 'meta',
          render: (r) => <span className="badge badge-primary">{r.calc_talla}</span>,
        },
        {
          key: 'stock', label: 'Existencias', align: 'center', mobile: 'value',
          render: (r) => <span className={`badge badge-${tonoStock(r.stock)}`}>{r.stock}</span>,
        },
        { key: 'calc_precio', label: 'Precio del producto', align: 'right', render: (r) => <span className="money">{money(r.calc_precio)}</span> },
        { key: 'calc_valor', label: 'Valor en existencia', align: 'right', render: (r) => <span className="money">{money(r.calc_valor)}</span> },
      ]}
      campos={[
        {
          name: 'id_producto', label: 'Producto', type: 'select', options: productos, required: true,
          hint: 'El precio y la categoría se toman del producto.',
        },
        {
          name: 'id_talla', label: 'Talla', type: 'select', options: tallas, required: true,
          hint: 'Una sola variante por talla en cada producto.',
        },
        { name: 'stock', label: 'Existencias', type: 'number', required: true, min: 0 },
        {
          name: 'url_imagen', label: 'Imagen de la variante', type: 'file', full: true,
          placeholder: 'https://… o suba una imagen',
        },
      ]}
      renderDetalle={(r) => {
        const ficha = db.fichas_tecnicas.filter((f) => f.id_varianteproducto === r.id);
        return (
          <div>
            <div className="detail-grid">
              <div className="detail-item"><div className="dl">Producto</div><div className="dv">{r.calc_producto}</div></div>
              <div className="detail-item"><div className="dl">Talla</div><div className="dv">{r.calc_talla}</div></div>
              <div className="detail-item"><div className="dl">Categoría</div><div className="dv">{r.calc_categoria}</div></div>
              <div className="detail-item"><div className="dl">Estado del producto</div><div className="dv">{r.calc_estado_producto}</div></div>
              <div className="detail-item"><div className="dl">Existencias</div><div className="dv">{r.stock}</div></div>
              <div className="detail-item"><div className="dl">Precio del producto</div><div className="dv money">{money(r.calc_precio)}</div></div>
              <div className="detail-item"><div className="dl">Valor en existencia</div><div className="dv money">{money(r.calc_valor)}</div></div>
            </div>

            {r.url_imagen && <img className="file-preview" src={r.url_imagen} alt={`Variante ${r.calc_etiqueta}`} />}

            {r.stock <= UMBRAL_STOCK_BAJO && (
              <div className={`alert alert-${r.stock === 0 ? 'error' : 'warning'}`} style={{ marginTop: 16 }}>
                <Icon name="alert" size={20} />
                <div>
                  {r.stock === 0
                    ? 'Esta variante está agotada: no hay unidades disponibles para nuevos pedidos.'
                    : `Quedan ${r.stock} unidades, por debajo del mínimo de ${UMBRAL_STOCK_BAJO}.`}
                </div>
              </div>
            )}

            <h3 style={{ margin: '18px 0 10px' }}>Ficha técnica</h3>
            <div className="items-box">
              <div className="items-row head"><span>Insumo</span><span>Cantidad</span><span>Costo</span><span style={{ width: 34 }} /></div>
              {ficha.length === 0 && (
                <div style={{ padding: '14px 12px' }} className="caption">
                  Esta variante todavía no tiene insumos en su ficha técnica.
                </div>
              )}
              {ficha.map((f) => (
                <div className="items-row" key={f.id}>
                  <span style={{ fontSize: 13 }}>{f.calc_insumo}</span>
                  <span style={{ fontSize: 13 }}>{f.cantidad}</span>
                  <span className="money" style={{ fontSize: 13 }}>{money(f.costo_total)}</span>
                  <span className="caption">{fecha(f.fecha)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }}
    />
  );
}
