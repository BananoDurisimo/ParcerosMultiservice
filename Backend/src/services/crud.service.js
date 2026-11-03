import bcrypt from 'bcryptjs';
import { conUsuario, query } from '../config/db.js';
import { HttpError, noEncontrado } from '../errors/HttpError.js';
import { ESTADOS_VENTA, PERFIL } from '../models/colecciones.js';
import { limpiar } from '../utils/helpers.js';
import { notificarEstadoPedido } from './correo.service.js';

/*
 * Escritura de todos los modulos. Cada operacion corre en una transaccion con
 * el usuario de la peticion, para que los triggers de auditoria e inventario
 * lo registren.
 */

const insertar = async (db, cfg, data) => {
  const k = Object.keys(data);
  const { rows } = await db.query(
    `INSERT INTO ${cfg.tabla} (${k.join(',')}) VALUES (${k.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING *`,
    Object.values(data)
  );
  return rows[0];
};

const actualizar = async (db, cfg, id, data) => {
  const k = Object.keys(data);
  if (!k.length) {
    const { rows } = await db.query(`SELECT * FROM ${cfg.tabla} WHERE ${cfg.pk}=$1`, [id]);
    return rows[0];
  }
  const { rows } = await db.query(
    `UPDATE ${cfg.tabla} SET ${k.map((c, i) => `${c}=$${i + 1}`).join(',')} WHERE ${cfg.pk}=$${k.length + 1} RETURNING *`,
    [...Object.values(data), id]
  );
  return rows[0];
};

/** Reemplaza las lineas de detalle de un documento. `fijos` son columnas con
 *  el mismo valor en todas las lineas, que ademas acotan cuales se borran
 *  (p. ej. solo las lineas de receta de un pedido). */
const reemplazarLineas = async (db, tabla, fk, id, lineas, columnas, fijos = {}) => {
  if (!Array.isArray(lineas)) return;
  const extra = Object.keys(fijos);
  await db.query(
    `DELETE FROM ${tabla} WHERE ${fk}=$1${extra.map((c, i) => ` AND ${c}=$${i + 2}`).join('')}`,
    [id, ...Object.values(fijos)]
  );
  const todas = [...columnas, ...extra];
  for (const l of lineas) {
    await db.query(
      `INSERT INTO ${tabla} (${fk},${todas.join(',')}) VALUES ($1,${todas.map((_, i) => '$' + (i + 2)).join(',')})`,
      [id, ...columnas.map((c) => l[c]), ...Object.values(fijos)]
    );
  }
};

/* Lo que cada coleccion hace ademas de su propia fila. */
const DESPUES = {
  roles: async (db, fila, body) => {
    if (!Array.isArray(body.permisos)) return;
    await db.query('DELETE FROM rolxpermiso WHERE id_rol=$1', [fila.id_rol]); // el trigger quita sus privilegios
    for (const p of body.permisos) await db.query('INSERT INTO rolxpermiso VALUES ($1,$2)', [fila.id_rol, p]);
    for (const p of body.privilegios || []) await db.query('INSERT INTO rolxprivilegio VALUES ($1,$2)', [fila.id_rol, p]);
  },
  usuarios: async (db, fila, body) => {
    if (body.contrasena) {
      await db.query('UPDATE usuario SET contrasena_hash=$1 WHERE id_usuario=$2', [await bcrypt.hash(String(body.contrasena), 12), fila.id_usuario]);
    }
  },
  /* Las existencias de un insumo no se digitan: solo cambian con las compras
     recibidas y los pedidos en elaboracion (kardex). */
  compras: (db, fila, body) =>
    reemplazarLineas(db, 'detalle_compra_insumo', 'id_compra', fila.id_compra, body.detalles, ['id_insumo', 'cantidad', 'precio_unitario']),
  /* El pedido guarda tres detalles: los productos que se cobran, los insumos
     de personalizacion (con precio) y la copia de la receta de los productos
     (`de_receta`, precio 0): esta ultima solo descuenta inventario. La receta
     se copia al guardar para que editarla despues no cambie pedidos viejos. */
  pedidos: async (db, fila, body) => {
    await reemplazarLineas(
      db, 'detalle_pedido_producto', 'id_pedido', fila.id_pedido,
      Array.isArray(body.productos) ? body.productos.map((l) => ({ ...l, defectuosas: Number(l.defectuosas) || 0 })) : undefined,
      ['id_producto', 'cantidad', 'precio_unitario', 'defectuosas']
    );
    await reemplazarLineas(
      db, 'detalle_pedido_insumo', 'id_pedido', fila.id_pedido,
      Array.isArray(body.insumos) ? body.insumos.map((l) => ({ ...l, defectuosas: Number(l.defectuosas) || 0 })) : undefined,
      ['id_insumo', 'cantidad', 'precio_unitario', 'defectuosas'], { de_receta: false }
    );
    await reemplazarLineas(
      db, 'detalle_pedido_insumo', 'id_pedido', fila.id_pedido,
      Array.isArray(body.insumos_receta) ? body.insumos_receta.map((l) => ({ ...l, precio_unitario: 0 })) : undefined,
      ['id_insumo', 'cantidad', 'precio_unitario'], { de_receta: true }
    );
  },
  productos: (db, fila, body) =>
    reemplazarLineas(db, 'receta_producto', 'id_producto', fila.id_producto, body.receta, ['id_insumo', 'cantidad']),
};

/* Antes de eliminar un documento se devuelve su efecto en el inventario. Un
   pedido se elimina con sus abonos anulados (los vigentes se anulan antes). */
const ANTES_DE_ELIMINAR = {
  compras: (db, id) => db.query('DELETE FROM movimiento_inventario WHERE id_compra=$1', [id]),
  pedidos: async (db, id) => {
    await db.query('DELETE FROM movimiento_inventario WHERE id_pedido=$1', [id]);
    await db.query('DELETE FROM abono WHERE id_pedido=$1 AND anulado', [id]);
  },
};

/* El rol Administrador esta bloqueado: no se edita, no cambia de estado, no
   se elimina ni pierde permisos (la base de datos tambien lo impide, 008). */
const ROL_PROTEGIDO = 'El rol Administrador está protegido: no se puede modificar ni eliminar.';
const protegerAdministrador = async (coleccion, id) => {
  if (coleccion !== 'roles') return;
  const { rows: [rol] } = await query('SELECT nombre FROM rol WHERE id_rol=$1', [id]);
  if (rol?.nombre === 'Administrador') throw new HttpError(400, ROL_PROTEGIDO);
};

export async function crear(coleccion, cfg, body, usuario) {
  const data = limpiar(cfg.campos, body);
  if (coleccion === 'usuarios') data.contrasena_hash = await bcrypt.hash(String(body.contrasena), 12);
  if (coleccion === 'pedidos' && !data.id_vendedor) data.id_vendedor = usuario.id_usuario;
  return conUsuario(usuario.id_usuario, async (db) => {
    const nueva = await insertar(db, cfg, data);
    await DESPUES[coleccion]?.(db, nueva, body);
    return nueva;
  });
}

/** `campos` es la lista de columnas que se pueden cambiar (PERFIL si el
 *  usuario solo edita su propio perfil). */
export async function modificar(coleccion, cfg, id, body, usuario, campos = cfg.campos) {
  await protegerAdministrador(coleccion, id);
  /* El rol de quien hace la peticion no se puede inactivar: se quedaria sin acceso. */
  if (coleccion === 'roles' && body.activo === false && id === usuario.id_rol) {
    throw new HttpError(400, 'No puede inactivar el rol con el que inició sesión.');
  }
  const estadoPrevio = coleccion === 'pedidos'
    ? (await query('SELECT id_estado_pedido FROM pedido WHERE id_pedido=$1', [id])).rows[0]?.id_estado_pedido
    : null;
  const fila = await conUsuario(usuario.id_usuario, async (db) => {
    const actual = await actualizar(db, cfg, id, limpiar(campos, body));
    if (!actual) return null;
    if (campos !== PERFIL) await DESPUES[coleccion]?.(db, actual, body);
    return actual;
  });
  if (!fila) throw noEncontrado();
  /* Ya confirmada la transaccion se avisa al cliente; un fallo del correo no afecta la respuesta. */
  if (estadoPrevio && fila.id_estado_pedido !== estadoPrevio) notificarEstadoPedido(id).catch(console.error);
  return fila;
}

export async function eliminar(coleccion, cfg, id, usuario) {
  await protegerAdministrador(coleccion, id);
  if (coleccion === 'pedidos') {
    /* Un pedido terminado y pagado ya es una venta: no se elimina (018). */
    const { rows: [e] } = await query(
      'SELECT e.nombre FROM pedido p JOIN estado_pedido e ON e.id_estado_pedido = p.id_estado_pedido WHERE p.id_pedido=$1', [id]
    );
    if (e && ESTADOS_VENTA.includes(e.nombre)) throw new HttpError(400, 'Las ventas no se eliminan.');
    const { rows: [v] } = await query('SELECT count(*)::int AS n FROM abono WHERE id_pedido=$1 AND NOT anulado', [id]);
    if (v.n) throw new HttpError(400, `El pedido tiene ${v.n} abono(s) vigente(s): anúlelos antes de eliminarlo.`);
  }
  const borradas = await conUsuario(usuario.id_usuario, async (db) => {
    await ANTES_DE_ELIMINAR[coleccion]?.(db, id);
    return (await db.query(`DELETE FROM ${cfg.tabla} WHERE ${cfg.pk}=$1`, [id])).rowCount;
  });
  if (!borradas) throw noEncontrado();
}
