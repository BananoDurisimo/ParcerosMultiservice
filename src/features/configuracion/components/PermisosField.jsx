import { useState } from 'react';
import Icon from '@shared/components/Icon.jsx';
import { useData } from '@shared/context/DataContext.jsx';

export const SIN_ACCIONES = 'Seleccione al menos una acción para este módulo.';

/**
 * Permisos y privilegios de un rol (tablas puente rolxpermiso y
 * rolxprivilegio). Cada permiso es un modulo del sistema; al marcarlo se
 * despliegan sus privilegios -las acciones dentro del modulo- para marcarlos
 * uno por uno. Al desmarcar el modulo se desmarcan tambien sus acciones.
 */
export default function PermisosField({ values, setVal, errors }) {
  const { db } = useData();
  const [q, setQ] = useState('');
  const permisos = values.permisos || [];
  const privilegios = values.privilegios || [];

  const texto = q.trim().toLowerCase();
  const visibles = texto ? db.permisos.filter((p) => p.nombre.toLowerCase().includes(texto)) : db.permisos;
  const accionesDe = (idPermiso) => db.privilegios.filter((x) => x.id_permiso === idPermiso);

  const alternarPermiso = (p) => {
    if (permisos.includes(p.id)) {
      const suyas = accionesDe(p.id).map((x) => x.id);
      setVal('permisos', permisos.filter((id) => id !== p.id));
      setVal('privilegios', privilegios.filter((id) => !suyas.includes(id)));
    } else {
      setVal('permisos', [...permisos, p.id]);
    }
  };

  const alternarAccion = (id) =>
    setVal('privilegios', privilegios.includes(id) ? privilegios.filter((x) => x !== id) : [...privilegios, id]);

  return (
    <>
      <label>Permisos y privilegios <span className="req">*</span></label>

      <div className="search-wrap ms-search">
        <span className="ico"><Icon name="search" size={15} /></span>
        <input
          className="input"
          type="text"
          value={q}
          placeholder="Buscar permiso…"
          aria-label="Buscar permiso"
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button type="button" className="icon-btn ms-limpiar" onClick={() => setQ('')} aria-label="Limpiar la búsqueda">
            <Icon name="x" size={14} />
          </button>
        )}
      </div>

      <div className="permiso-lista">
        {visibles.map((p) => {
          const on = permisos.includes(p.id);
          const acciones = accionesDe(p.id);
          const marcadas = acciones.filter((a) => privilegios.includes(a.id)).length;
          const sinAcciones = on && marcadas === 0 && !!errors.privilegios;
          return (
            <div key={p.id} className={`permiso-item ${on ? 'is-on' : ''}`}>
              <div className="between">
                <button type="button" className={`chip ${on ? 'is-on' : ''}`} onClick={() => alternarPermiso(p)}>
                  {on && <Icon name="check" size={12} />} {p.nombre}
                </button>
                {on && <span className="caption">{marcadas} de {acciones.length} acción(es)</span>}
              </div>
              {on && (
                <div className="acciones">
                  {acciones.map((a) => (
                    <button
                      type="button"
                      key={a.id}
                      className={`chip ${privilegios.includes(a.id) ? 'is-on' : ''}`}
                      onClick={() => alternarAccion(a.id)}
                    >
                      {privilegios.includes(a.id) && <Icon name="check" size={12} />} {a.nombre}
                    </button>
                  ))}
                </div>
              )}
              {sinAcciones && <span className="field-error" style={{ marginTop: 6 }}><Icon name="alert" size={12} /> {SIN_ACCIONES}</span>}
            </div>
          );
        })}
        {visibles.length === 0 && <span className="caption">No hay coincidencias para «{q.trim()}».</span>}
      </div>

      {errors.permisos && <span className="field-error"><Icon name="alert" size={12} /> {errors.permisos}</span>}
      {!errors.permisos && <span className="caption">{permisos.length} de {db.permisos.length} permiso(s) seleccionado(s)</span>}
    </>
  );
}
