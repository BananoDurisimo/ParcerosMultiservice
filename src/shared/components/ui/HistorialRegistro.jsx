import Icon from '@shared/components/Icon.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { fechaHora, TONO_ACCION, ICONO_ACCION } from '@shared/data/mock.js';

/**
 * Historial de cambios de un registro: las filas de `movimientos` de esa
 * tabla y ese id, de la mas reciente a la mas antigua, con quien hizo cada
 * cambio, cuando y que columnas cambiaron.
 */
export default function HistorialRegistro({ tabla, id, vacio = 'Este registro no tiene cambios registrados.' }) {
  const { db } = useData();
  const lista = db.movimientos
    .filter((m) => m.tabla === tabla && m.id_registro === id)
    .sort((a, b) => b.fecha_cambio.localeCompare(a.fecha_cambio));

  if (!lista.length) return <p className="caption">{vacio}</p>;

  return (
    <div className="items-box">
      {lista.map((m) => (
        <div className="items-row" key={m.id} style={{ gridTemplateColumns: '1fr', gap: 4 }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className={`badge badge-${TONO_ACCION[m.accion] || 'neutral'}`}>
              <Icon name={ICONO_ACCION[m.accion]} size={12} /> {m.calc_accion}
            </span>
            <span style={{ fontSize: 13 }}>{m.calc_usuario}</span>
            <span className="caption">{fechaHora(m.fecha_cambio)}</span>
          </div>
          {m.accion === 'UPDATE' && m.calc_cambios.length > 0 && (
            <div className="caption">
              {m.calc_cambios.map((c) => `${c.etiqueta}: ${c.antes} → ${c.despues}`).join(' · ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
