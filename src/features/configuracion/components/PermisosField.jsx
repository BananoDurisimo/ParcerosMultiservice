import { useState } from 'react';
import Icon from '@shared/components/Icon.jsx';
import { useData } from '@shared/context/DataContext.jsx';

export const SIN_ACCIONES = 'Seleccione al menos una acción para este módulo.';

/** Procesos del menu lateral: los permisos se agrupan igual que los modulos. */
const GRUPOS = [
  { titulo: 'Configuración', modulos: ['Roles', 'Usuarios', 'Movimientos'] },
  { titulo: 'Compras', modulos: ['Insumos', 'Proveedores', 'Compras'] },
  { titulo: 'Ventas', modulos: ['Clientes', 'Cotizaciones', 'Pedidos', 'Ventas', 'Abonos'] },
];

const ICONO = {
  Roles: 'shield', Usuarios: 'user', Movimientos: 'history',
  Insumos: 'package', Proveedores: 'truck', Compras: 'cart',
  Clientes: 'users', Cotizaciones: 'clipboard', Pedidos: 'box', Ventas: 'coin', Abonos: 'dollar',
};

/**
 * Permisos y privilegios de un rol (tablas puente rolxpermiso y
 * rolxprivilegio). Cada permiso es un modulo del sistema; al activarlo se
 * despliegan sus privilegios -las acciones dentro del modulo- para marcarlos
 * uno por uno. Al desactivar el modulo se desmarcan tambien sus acciones.
 */
export default function PermisosField({ values, setVal, errors }) {
  const { db } = useData();
  const [q, setQ] = useState('');
  const permisos = values.permisos || [];
  const privilegios = values.privilegios || [];

  const texto = q.trim().toLowerCase();
  const coincide = (p) => !texto || p.nombre.toLowerCase().includes(texto);
  const accionesDe = (idPermiso) => db.privilegios.filter((x) => x.id_permiso === idPermiso);
  const porNombre = (n) => db.permisos.find((p) => p.nombre === n);

  /* Los permisos que no esten en ningun grupo (si se agregan a futuro) no se pierden. */
  const agrupados = new Set(GRUPOS.flatMap((g) => g.modulos));
  const grupos = [
    ...GRUPOS.map((g) => ({ ...g, items: g.modulos.map(porNombre).filter(Boolean) })),
    { titulo: 'Otros', items: db.permisos.filter((p) => !agrupados.has(p.nombre)) },
  ]
    .map((g) => ({ ...g, items: g.items.filter(coincide) }))
    .filter((g) => g.items.length);

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

  /* Marca o desmarca de una vez todas las acciones de un modulo. */
  const alternarAccionesDe = (acciones, todas) => {
    const ids = acciones.map((a) => a.id);
    setVal('privilegios', todas
      ? privilegios.filter((id) => !ids.includes(id))
      : [...privilegios.filter((id) => !ids.includes(id)), ...ids]);
  };

  const totalAcciones = privilegios.filter((id) =>
    permisos.includes(db.privilegios.find((x) => x.id === id)?.id_permiso)
  ).length;

  /* Un solo boton marca todos los modulos con todas sus acciones, o los quita. */
  const todoMarcado =
    db.permisos.length > 0 &&
    permisos.length === db.permisos.length &&
    db.privilegios.every((pr) => privilegios.includes(pr.id));

  const alternarTodo = () => {
    if (todoMarcado) {
      setVal('permisos', []);
      setVal('privilegios', []);
    } else {
      setVal('permisos', db.permisos.map((p) => p.id));
      setVal('privilegios', db.privilegios.map((pr) => pr.id));
    }
  };

  return (
    <div className="perm">
      <div className="perm-top">
        <div>
          <div className="perm-label">Permisos y privilegios <span className="req">*</span></div>
          <div className="caption">Active los módulos a los que entra el rol y marque las acciones que puede hacer en cada uno.</div>
        </div>
        <label className="perm-buscar">
          <Icon name="search" size={15} />
          <input
            type="text"
            value={q}
            placeholder="Buscar permiso…"
            aria-label="Buscar permiso"
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button type="button" className="perm-limpiar" onClick={() => setQ('')} aria-label="Limpiar la búsqueda">
              <Icon name="x" size={13} />
            </button>
          )}
        </label>
      </div>

      <div className="perm-resumen">
        <span><strong>{permisos.length}</strong> de {db.permisos.length} permiso(s) seleccionado(s)</span>
        <span className="perm-punto" />
        <span><strong>{totalAcciones}</strong> acción(es)</span>
        <button
          type="button"
          className={`btn btn-sm perm-todo ${todoMarcado ? '' : 'btn-primary'}`}
          aria-pressed={todoMarcado}
          onClick={alternarTodo}
        >
          <Icon name={todoMarcado ? 'x' : 'checkC'} size={15} />
          {todoMarcado ? 'Quitar todos' : 'Seleccionar todos'}
        </button>
      </div>

      {grupos.map((g) => (
        <section key={g.titulo} className="perm-grupo">
          <div className="perm-grupo-titulo">{g.titulo}</div>
          <div className="perm-grid">
            {g.items.map((p) => {
              const on = permisos.includes(p.id);
              const acciones = accionesDe(p.id);
              const marcadas = acciones.filter((a) => privilegios.includes(a.id)).length;
              const sinAcciones = on && marcadas === 0 && !!errors.privilegios;
              return (
                <div key={p.id} className={`perm-card ${on ? 'is-on' : ''} ${sinAcciones ? 'has-error' : ''}`}>
                  <button
                    type="button"
                    className="perm-head"
                    data-permiso={p.nombre}
                    aria-pressed={on}
                    onClick={() => alternarPermiso(p)}
                  >
                    <span className="perm-ico"><Icon name={ICONO[p.nombre] || 'lock'} size={17} /></span>
                    <span className="perm-nombre">
                      <span>{p.nombre}</span>
                      <span className="caption">{on ? `${marcadas} de ${acciones.length} acción(es)` : `${acciones.length} acción(es) disponibles`}</span>
                    </span>
                    <span className="perm-switch" aria-hidden="true"><span /></span>
                  </button>

                  {on && (
                    <div className="perm-acciones">
                      {acciones.length > 1 && (
                        <button
                          type="button"
                          className={`perm-accion perm-todas ${marcadas === acciones.length ? 'is-on' : ''}`}
                          aria-pressed={marcadas === acciones.length}
                          onClick={() => alternarAccionesDe(acciones, marcadas === acciones.length)}
                        >
                          <Icon name={marcadas === acciones.length ? 'x' : 'checkC'} size={14} />
                          {marcadas === acciones.length ? 'Quitar todas' : 'Todas'}
                        </button>
                      )}
                      {acciones.map((a) => {
                        const marcada = privilegios.includes(a.id);
                        return (
                          <button
                            type="button"
                            key={a.id}
                            className={`perm-accion ${marcada ? 'is-on' : ''}`}
                            aria-pressed={marcada}
                            onClick={() => alternarAccion(a.id)}
                          >
                            <span className="perm-check">{marcada && <Icon name="check" size={11} stroke={2.6} />}</span>
                            {a.nombre}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {sinAcciones && (
                    <span className="field-error perm-error"><Icon name="alert" size={12} /> {SIN_ACCIONES}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {grupos.length === 0 && <div className="perm-vacio caption">No hay coincidencias para «{q.trim()}».</div>}

      {errors.permisos && <span className="field-error"><Icon name="alert" size={12} /> {errors.permisos}</span>}
    </div>
  );
}
