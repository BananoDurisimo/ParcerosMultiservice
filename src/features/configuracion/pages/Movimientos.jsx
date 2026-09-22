import { useState, useMemo } from 'react';
import Icon from '@shared/components/Icon.jsx';
import DataTable from '@shared/components/ui/DataTable.jsx';
import Modal from '@shared/components/ui/Modal.jsx';
import KpiCard from '@shared/components/ui/KpiCard.jsx';
import MovimientoDetalle from '@features/configuracion/components/MovimientoDetalle.jsx';
import { iniciales } from '@shared/context/AuthContext.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import {
  fecha,
  hora,
  fechaHora,
  ACCIONES_MOVIMIENTO,
  ETIQUETA_ACCION,
  TONO_ACCION,
  ICONO_ACCION,
  MODULOS_AUDITADOS,
} from '@shared/data/mock.js';

/**
 * Tabla `movimientos`: historial unico de modificaciones de todos los modulos
 * (tabla, id_registro, accion, valor_anterior, valor_nuevo, id_usuario,
 * fecha_cambio).
 *
 * Las filas las insertan los triggers AFTER INSERT/UPDATE/DELETE de la base de
 * datos, por eso la pantalla es de solo consulta: se puede buscar, filtrar,
 * ordenar y ver el detalle, pero no crear, editar ni eliminar.
 */
export default function Movimientos() {
  const { db } = useData();
  const [actual, setActual] = useState(null);

  const rows = db.movimientos;

  const codigo = (r) => `MOV-${String(r.id).padStart(4, '0')}`;

  const totales = useMemo(
    () =>
      rows.reduce(
        (acc, m) => ({ ...acc, [m.accion]: (acc[m.accion] || 0) + 1 }),
        { INSERT: 0, UPDATE: 0, DELETE: 0 }
      ),
    [rows]
  );

  /* Movimientos que modificaron la columna `estado` de un registro ya existente
     (pedido, compra, producto o usuario). Solo cuentan los UPDATE: en un INSERT
     el registro nace con su estado inicial, no hay cambio que reportar. */
  const cambiosEstado = useMemo(
    () =>
      rows.filter((m) => m.accion === 'UPDATE' && m.calc_cambios.some((c) => c.campo === 'estado'))
        .length,
    [rows]
  );

  const opcionesModulo = useMemo(() => {
    const usadas = [...new Set(rows.map((m) => m.tabla))];
    return usadas
      .map((t) => ({ value: t, label: MODULOS_AUDITADOS[t] || t }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [rows]);

  const opcionesUsuario = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => m.set(r.id_usuario, r.calc_usuario));
    return [...m].map(([value, label]) => ({ value, label }));
  }, [rows]);

  return (
    <div className="anim-page">
      <div className="page-head">
        <div>
          <h1 className="row" style={{ gap: 10 }}>
            <Icon name="history" size={22} /> Movimientos
          </h1>
          <p className="sub">
            Historial de modificaciones de todos los módulos: quién hizo el cambio, en qué tabla,
            cuándo y qué valores se afectaron.
          </p>
          <div className="hero-rule" />
        </div>
      </div>

      <div className="kpi-grid stagger" style={{ marginBottom: 16 }}>
        <KpiCard label="Movimientos registrados" value={rows.length} icon="history" tono="primary" />
        <KpiCard label="Creaciones" value={totales.INSERT} icon="plus" tono="success" />
        <KpiCard label="Modificaciones" value={totales.UPDATE} icon="edit" tono="warning" />
        <KpiCard label="Cambios de estados" value={cambiosEstado} icon="refresh" tono="info" />
      </div>

      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <Icon name="info" size={18} />
        <div>
          Este historial es de <strong>solo consulta</strong>: la base de datos lo llena de forma
          automática cada vez que se crea, modifica o elimina un registro en cualquier módulo.
        </div>
      </div>

      <DataTable
        columns={[
          {
            key: 'id',
            label: 'Movimiento',
            render: (r) => <span className="cell-main">{codigo(r)}</span>,
          },
          {
            key: 'calc_modulo',
            label: 'Módulo',
            mobile: 'meta',
            render: (r) => <span className="badge badge-primary">{r.calc_modulo}</span>,
          },
          {
            key: 'calc_registro',
            label: 'Registro afectado',
            mobile: 'title',
            render: (r) => (
              <div>
                <div className="cell-main">{r.calc_registro}</div>
                <div className="caption">#{r.id_registro}</div>
              </div>
            ),
          },
          {
            key: 'accion',
            label: 'Acción',
            mobile: 'value',
            render: (r) => (
              <span className={`badge badge-${TONO_ACCION[r.accion] || 'neutral'}`}>
                <Icon name={ICONO_ACCION[r.accion]} size={12} /> {r.calc_accion}
              </span>
            ),
          },
          {
            key: 'calc_usuario',
            label: 'Responsable',
            mobile: 'meta',
            render: (r) => (
              <div className="row">
                <span className="avatar">{iniciales(r.calc_usuario)}</span>
                <div>
                  <div className="cell-main">{r.calc_usuario}</div>
                  <div className="caption">@{r.calc_alias}</div>
                </div>
              </div>
            ),
          },
          {
            key: 'fecha_cambio',
            label: 'Fecha y hora',
            render: (r) => (
              <div>
                <div className="caption">{fecha(r.calc_fecha)}</div>
                <div className="caption muted">{hora(r.fecha_cambio)}</div>
              </div>
            ),
          },
          {
            key: 'calc_total_cambios',
            label: 'Campos',
            align: 'center',
            render: (r) => <span className="badge badge-neutral">{r.calc_total_cambios}</span>,
          },
        ]}
        rows={rows}
        entidad="movimientos"
        pageSize={8}
        searchKeys={['calc_modulo', 'tabla', 'calc_registro', 'calc_usuario', 'calc_accion', 'fecha_cambio']}
        filters={[
          { key: 'tabla', label: 'Módulo', options: opcionesModulo },
          {
            key: 'accion',
            label: 'Acción',
            options: ACCIONES_MOVIMIENTO.map((a) => ({ value: a, label: ETIQUETA_ACCION[a] })),
          },
          { key: 'id_usuario', label: 'Responsable', options: opcionesUsuario },
          { key: 'calc_fecha', label: 'Fecha', options: [...new Set(rows.map((r) => r.calc_fecha))].map((f) => ({ value: f, label: fecha(f) })) },
        ]}
        onView={setActual}
        emptyText="No hay movimientos que coincidan con la búsqueda o los filtros aplicados."
      />

      <Modal
        open={!!actual}
        onClose={() => setActual(null)}
        size="lg"
        title={`Detalle del movimiento ${actual ? codigo(actual) : ''}`}
        subtitle={actual ? fechaHora(actual.fecha_cambio) : ''}
        footer={<button className="btn" onClick={() => setActual(null)}>Cerrar</button>}
      >
        <MovimientoDetalle m={actual} />
      </Modal>
    </div>
  );
}
