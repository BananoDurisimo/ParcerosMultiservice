import Icon from '@shared/components/Icon.jsx';
import { iniciales } from '@shared/context/AuthContext.jsx';
import { fechaHora, TONO_ACCION, ICONO_ACCION } from '@shared/data/mock.js';

/**
 * Detalle de una fila de `movimientos`: quién hizo el cambio, en qué tabla,
 * cuándo y qué columnas se modificaron (valor_anterior vs. valor_nuevo).
 */
export default function MovimientoDetalle({ m }) {
  if (!m) return null;

  const esAlta = m.accion === 'INSERT';
  const esBaja = m.accion === 'DELETE';
  const tono = TONO_ACCION[m.accion] || 'neutral';

  const titulo = esAlta
    ? 'Valores registrados'
    : esBaja
      ? 'Valores eliminados'
      : 'Columnas modificadas';

  return (
    <div>
      <div className="row" style={{ gap: 10, marginBottom: 16 }}>
        <span className={`badge badge-${tono}`}>
          <Icon name={ICONO_ACCION[m.accion]} size={13} /> {m.calc_accion}
        </span>
        <span className="badge badge-primary">{m.calc_modulo}</span>
        <span className="caption">tabla <code>{m.tabla}</code> · registro #{m.id_registro}</span>
      </div>

      <div className="detail-grid">
        <div className="detail-item">
          <div className="dl">Registro afectado</div>
          <div className="dv">{m.calc_registro}</div>
        </div>
        <div className="detail-item">
          <div className="dl">Fecha y hora del cambio</div>
          <div className="dv">{fechaHora(m.fecha_cambio)}</div>
        </div>
        <div className="detail-item">
          <div className="dl">Responsable</div>
          <div className="dv row" style={{ gap: 8 }}>
            <span className="avatar">{iniciales(m.calc_usuario)}</span>
            <div>
              <div>{m.calc_usuario}</div>
              <div className="caption">@{m.calc_alias}</div>
            </div>
          </div>
        </div>
        <div className="detail-item">
          <div className="dl">Campos afectados</div>
          <div className="dv">{m.calc_total_cambios}</div>
        </div>
      </div>

      <h3 style={{ margin: '18px 0 10px' }}>{titulo}</h3>

      {m.calc_cambios.length === 0 ? (
        <div className="alert alert-info">
          El movimiento no registra diferencias entre el valor anterior y el nuevo.
        </div>
      ) : (
        <div className="table-scroll">
          <table className="diff-tbl">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Valor anterior</th>
                <th>Valor nuevo</th>
              </tr>
            </thead>
            <tbody>
              {m.calc_cambios.map((c) => (
                <tr key={c.campo}>
                  <td>
                    <div className="cell-main">{c.etiqueta}</div>
                    <div className="caption">{c.campo}</div>
                  </td>
                  <td><span className={esAlta ? 'muted' : 'diff-old'}>{c.antes}</span></td>
                  <td><span className={esBaja ? 'muted' : 'diff-new'}>{c.despues}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="caption" style={{ marginTop: 14 }}>
        Este registro lo generó automáticamente un trigger de la base de datos. La contraseña de los
        usuarios nunca se guarda en el historial.
      </p>
    </div>
  );
}
