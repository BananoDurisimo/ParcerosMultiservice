import bcrypt from 'bcryptjs';
import { conUsuario, query } from '../config/db.js';
import { HttpError, noEncontrado } from '../errors/HttpError.js';
import { COLECCIONES, ESTADOS_VENTA } from '../models/colecciones.js';
import { validarArchivo } from '../validators/crud.validator.js';
import { limpiar } from '../utils/helpers.js';
import { notificarEstadoPedido } from './correo.service.js';

/*
 * Escritura de todos los modulos. Cada operacion corre en una transaccion con
 * el usuario de la peticion, para que los triggers de inventario lo registren.
 * Lo que una operacion arrastra (el abono inicial de un pedido, la etapa del
 * pedido al registrar o anular un abono) va en esa misma transaccion: se
 * guarda todo o no se guarda nada.
 */

const insertar = async (db, cfg, data) => {
  const k = Object.keys(data);
  if (!k.length) throw new HttpError(400, 'No se recibieron datos para guardar.');
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
      [id, ...columnas.map((c) => l?.[c]), ...Object.values(fijos)]
    );
  }
};

const estadoPedido = (orden) => `(SELECT id_estado_pedido FROM estado_pedido WHERE orden = ${orden})`;
const etapaYSaldo = async (db, idPedido) => (await db.query(
  `SELECT e.orden, t.total, t.abonado, t.saldo FROM pedido p
     JOIN estado_pedido e ON e.id_estado_pedido = p.id_estado_pedido
     JOIN v_pedido_total t ON t.id_pedido = p.id_pedido
    WHERE p.id_pedido = $1`,
  [idPedido]
)).rows[0];

/**
 * Un abono mueve la etapa de su pedido: el primero inicia la cotizacion (si
 * hay existencias; si no, sigue como cotizacion) y el que salda un pedido en
 * «falta pago» lo deja «completado».
 */
const avanzarPorAbono = async (db, idPedido, fecha) => {
  const p = await etapaYSaldo(db, idPedido);
  if (p?.orden === 1) {
    await db.query('SAVEPOINT inicio_pedido');
    try {
      await db.query(`UPDATE pedido SET id_estado_pedido = ${estadoPedido(2)}, fecha_inicio = $2 WHERE id_pedido = $1`, [idPedido, fecha]);
    } catch (e) {
      if (e.code !== 'P0001') throw e; // P0001: inventario insuficiente
      await db.query('ROLLBACK TO SAVEPOINT inicio_pedido');
    }
  } else if (p?.orden === 3 && p.saldo <= 0.005) {
    await db.query(`UPDATE pedido SET id_estado_pedido = ${estadoPedido(4)} WHERE id_pedido = $1`, [idPedido]);
  }
};

/**
 * Anular un abono no puede dejar al pedido sin respaldo: los de una venta
 * entregada son su soporte y un pedido en produccion necesita uno vigente.
 * Si el pedido estaba completado, vuelve a «falta pago».
 */
const retrocederPorAnulacion = async (db, idPedido) => {
  const p = await etapaYSaldo(db, idPedido);
  if (p.orden === 5) throw new HttpError(400, 'El pedido ya se entregó: sus abonos son el soporte de la venta.');
  if (p.orden > 1 && p.abonado <= 0) throw new HttpError(400, 'Es el único abono vigente de un pedido en producción: no se puede anular.');
  if (p.orden === 4) await db.query(`UPDATE pedido SET id_estado_pedido = ${estadoPedido(3)} WHERE id_pedido = $1`, [idPedido]);
};

/* Lo que cada coleccion hace ademas de su propia fila. `nuevo`: es un POST;
   `previa`: la fila antes del cambio (PUT). */
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
  compras: async (db, fila, body, { nuevo }) => {
    if (nuevo && !(Array.isArray(body.detalles) && body.detalles.length)) {
      throw new HttpError(400, 'Agregue al menos un insumo a la orden.', 'detalle_insumos');
    }
    await reemplazarLineas(db, 'detalle_compra_insumo', 'id_compra', fila.id_compra, body.detalles, ['id_insumo', 'cantidad', 'precio_unitario']);
  },
  /* El pedido guarda tres detalles: los productos que se cobran, los insumos
     de personalizacion (con precio) y la copia de la receta de los productos
     (`de_receta`, precio 0): esta ultima solo descuenta inventario. La receta
     se copia al guardar para que editarla despues no cambie pedidos viejos.
     Las lineas solo se editan mientras el pedido es cotizacion o esta en
     proceso; despues se conservan como quedaron. */
  pedidos: async (db, fila, body, { nuevo }) => {
    const id = fila.id_pedido;
    const { orden } = await etapaYSaldo(db, id);
    if (nuevo && ![1, 2].includes(orden)) throw new HttpError(400, 'El registro solo puede crearse como cotización o como pedido en proceso.');
    if (orden <= 2) {
      await reemplazarLineas(
        db, 'detalle_pedido_producto', 'id_pedido', id,
        Array.isArray(body.productos) ? body.productos.map((l) => ({ ...l, defectuosas: Number(l?.defectuosas) || 0 })) : undefined,
        ['id_producto', 'cantidad', 'precio_unitario', 'defectuosas']
      );
      await reemplazarLineas(
        db, 'detalle_pedido_insumo', 'id_pedido', id,
        Array.isArray(body.insumos) ? body.insumos.map((l) => ({ ...l, defectuosas: Number(l?.defectuosas) || 0 })) : undefined,
        ['id_insumo', 'cantidad', 'precio_unitario', 'defectuosas'], { de_receta: false }
      );
      await reemplazarLineas(
        db, 'detalle_pedido_insumo', 'id_pedido', id,
        Array.isArray(body.insumos_receta) ? body.insumos_receta.map((l) => ({ ...l, precio_unitario: 0 })) : undefined,
        ['id_insumo', 'cantidad', 'precio_unitario'], { de_receta: true }
      );
    }
    /* El pedido que nace en proceso trae su abono inicial: van juntos o no va ninguno. */
    if (nuevo && orden === 2 && body.abono_inicial && typeof body.abono_inicial === 'object') {
      validarArchivo(COLECCIONES.abonos, body.abono_inicial);
      const abono = limpiar(COLECCIONES.abonos.campos, { ...body.abono_inicial, id_pedido: id, anulado: false, motivo_anulacion: undefined });
      await insertar(db, COLECCIONES.abonos, abono);
    }
    const { rows: [{ lineas }] } = await db.query(
      `SELECT (SELECT count(*) FROM detalle_pedido_producto WHERE id_pedido = $1)
            + (SELECT count(*) FROM detalle_pedido_insumo WHERE id_pedido = $1 AND NOT de_receta) AS lineas`,
      [id]
    );
    const t = await etapaYSaldo(db, id);
    if (!lineas) throw new HttpError(400, 'Agregue al menos un producto (o un insumo) al registro.', 'lineas');
    if (t.abonado > t.total + 0.005) throw new HttpError(400, 'El total no puede quedar por debajo de lo ya abonado.', 'lineas');
    if (nuevo && orden === 2 && t.abonado <= 0) throw new HttpError(400, 'El pedido necesita su abono inicial.', 'abono_monto');
  },
  abonos: async (db, fila, body, { nuevo, previa }) => {
    if (nuevo && !fila.anulado) await avanzarPorAbono(db, fila.id_pedido, fila.fecha);
    else if (previa && !previa.anulado && fila.anulado) await retrocederPorAnulacion(db, fila.id_pedido);
  },
  productos: (db, fila, body) =>
    reemplazarLineas(db, 'receta_producto', 'id_producto', fila.id_producto, body.receta, ['id_insumo', 'cantidad']),
};

/* Lo que se ejecuta aunque el usuario solo pueda cambiar el estado. */
const SIEMPRE = new Set(['abonos']);

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

/* El correo de un usuario se guarda en minusculas: asi se busca al iniciar sesion. */
const normalizar = (coleccion, data) => {
  if (coleccion === 'usuarios' && typeof data.correo_empresarial === 'string') data.correo_empresarial = data.correo_empresarial.toLowerCase();
  return data;
};

const estadoDelPedido = async (id) =>
  (await query('SELECT id_estado_pedido FROM pedido WHERE id_pedido=$1', [id])).rows[0]?.id_estado_pedido;

export async function crear(coleccion, cfg, body, usuario) {
  const data = normalizar(coleccion, limpiar(cfg.campos, body));
  if (coleccion === 'usuarios') data.contrasena_hash = await bcrypt.hash(String(body.contrasena), 12);
  if (coleccion === 'pedidos' && !data.id_vendedor) data.id_vendedor = usuario.id_usuario;
  /* Un abono nace vigente. */
  if (coleccion === 'abonos') { data.anulado = false; delete data.motivo_anulacion; }
  const estadoPrevio = coleccion === 'abonos' ? await estadoDelPedido(Number(data.id_pedido) || 0) : null;
  const nueva = await conUsuario(usuario.id_usuario, async (db) => {
    const fila = await insertar(db, cfg, data);
    await DESPUES[coleccion]?.(db, fila, body, { nuevo: true });
    return fila;
  });
  if (coleccion === 'abonos') avisarSiCambio(nueva.id_pedido, estadoPrevio);
  return nueva;
}

/* Ya confirmada la transaccion se avisa al cliente; un fallo del correo no afecta la respuesta. */
const avisarSiCambio = (idPedido, estadoPrevio) => {
  if (!estadoPrevio) return;
  estadoDelPedido(idPedido)
    .then((actual) => (actual && actual !== estadoPrevio ? notificarEstadoPedido(idPedido) : null))
    .catch(console.error);
};

/** `campos` es la lista de columnas que se pueden cambiar (segun los
 *  privilegios, o PERFIL si el usuario solo edita su propio perfil) y
 *  `detalle` indica si tambien puede cambiar lo que cuelga del registro. */
export async function modificar(coleccion, cfg, id, body, usuario, campos = cfg.campos, detalle = true) {
  await protegerAdministrador(coleccion, id);
  /* Ni el rol ni el usuario de quien hace la peticion se pueden inactivar: se quedaria sin acceso. */
  if (coleccion === 'roles' && body.activo === false && id === usuario.id_rol) {
    throw new HttpError(400, 'No puede inactivar el rol con el que inició sesión.');
  }
  if (coleccion === 'usuarios' && body.activo === false && id === usuario.id_usuario) {
    throw new HttpError(400, 'No puede inactivar el usuario con el que inició sesión.');
  }
  const data = normalizar(coleccion, limpiar(campos, body));
  let idPedido = coleccion === 'pedidos' ? id : null;
  let estadoPrevio = null;
  const fila = await conUsuario(usuario.id_usuario, async (db) => {
    const { rows: [previa] } = await db.query(`SELECT * FROM ${cfg.tabla} WHERE ${cfg.pk}=$1`, [id]);
    if (!previa) return null;
    if (coleccion === 'abonos') idPedido = previa.id_pedido;
    if (idPedido) estadoPrevio = (await db.query('SELECT id_estado_pedido FROM pedido WHERE id_pedido=$1', [idPedido])).rows[0]?.id_estado_pedido;
    const actual = await actualizar(db, cfg, id, data);
    if (detalle || SIEMPRE.has(coleccion)) await DESPUES[coleccion]?.(db, actual, detalle ? body : {}, { nuevo: false, previa });
    return actual;
  });
  if (!fila) throw noEncontrado();
  avisarSiCambio(idPedido, estadoPrevio);
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
