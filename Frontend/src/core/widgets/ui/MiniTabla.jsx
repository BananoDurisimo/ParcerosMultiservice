/**
 * Tabla de solo lectura para las secciones de un detalle (historial de
 * compras de un proveedor, abonos de un pedido…). Sin busqueda ni paginacion.
 * `columnas`: [{ label, render(fila), align }].
 */
export default function MiniTabla({ columnas, filas, vacio = 'Sin registros.' }) {
  if (!filas.length) return <p className="caption">{vacio}</p>;
  return (
    <div className="mini-scroll">
      <table className="tbl tbl-compacta">
        <thead>
          <tr>
            {columnas.map((c) => (
              <th key={c.label} style={{ textAlign: c.align || 'left' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f.id ?? i}>
              {columnas.map((c) => (
                <td key={c.label} style={{ textAlign: c.align || 'left' }}>{c.render(f)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
