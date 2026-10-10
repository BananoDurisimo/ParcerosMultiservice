import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { conUsuario, query } from '../db/pool.js';
import { puede } from '../middleware/auth.js';

/*
 * Escritura de todos los modulos: POST /api/:coleccion, PUT /api/:coleccion/:id
 * y DELETE /api/:coleccion/:id.
 *
 * - `campos` es la lista blanca de columnas: nada fuera de ella llega al SQL.
 * - `modulos` son los permisos que dan acceso a la coleccion. Crear exige
 *   "Agregar", modificar exige "Editar", "Cambiar estado" o "Anular" y
 *   eliminar exige "Eliminar" en alguno de ellos.
 * - Cada operacion corre en una transaccion con el usuario de la peticion,
 *   para que los triggers de auditoria e inventario lo registren.
 */
const COLECCIONES = {
  clientes: {
    tabla: 'cliente', pk: 'id_cliente', modulos: ['Clientes'],
    campos: ['id_tipo_documento', 'nombre', 'documento', 'telefono', 'correo', 'direccion', 'activo'],
  },
  proveedores: {
    tabla: 'proveedor', pk: 'id_proveedor', modulos: ['Proveedores'],
    campos: ['id_tipo_insumo', 'nombre', 'nombre_persona_contacto', 'nit', 'telefono', 'correo', 'direccion', 'activo'],
  },
  insumos: {
    tabla: 'insumo', pk: 'id_insumo', modulos: ['Insumos'],
    campos: ['id_tipo_insumo', 'id_unidad_medida', 'nombre', 'stock_minimo', 'precio_unitario', 'activo'],
  },
  roles: { tabla: 'rol', pk: 'id_rol', modulos: ['Roles'], campos: ['nombre', 'activo'] },
  usuarios: {
    tabla: 'usuario', pk: 'id_usuario', modulos: ['Usuarios'],
    campos: ['id_rol', 'nombre_usuario', 'correo_empresarial', 'nombre_empleado', 'documento', 'telefono', 'cargo', 'fecha_ingreso', 'activo'],
  },
  compras: {
    tabla: 'compra', pk: 'id_compra', modulos: ['Compras'],
    campos: ['id_proveedor', 'id_estado_compra', 'fecha', 'fecha_entrega'],
  },
  pedidos: {
    tabla: 'pedido', pk: 'id_pedido', modulos: ['Cotizaciones', 'Pedidos', 'Ventas', 'Abonos'],
    campos: ['id_cliente', 'id_estado_pedido', 'id_vendedor', 'fecha_creacion', 'fecha_inicio', 'fecha_entrega', 'descripcion', 'ruta_imagen_diseno'],
  },
  abonos: {
    tabla: 'abono', pk: 'id_abono', modulos: ['Abonos', 'Cotizaciones', 'Pedidos', 'Ventas'],
    campos: ['id_pedido', 'id_metodo_pago', 'monto', 'fecha', 'ruta_comprobante'],
  },
  categorias_producto: {
    tabla: 'categoria_producto', pk: 'id_categoria_producto', modulos: ['Categorías de producto'],
    campos: ['nombre', 'descripcion', 'activo'],
  },
  productos: {
    tabla: 'producto', pk: 'id_producto', modulos: ['Productos'],
    campos: ['id_categoria_producto', 'id_talla', 'id_insumo_tela', 'nombre', 'precio_venta', 'activo'],
  },
};

const AGREGAR = ['Agregar'];
const MODIFICAR = ['Editar', 'Cambiar estado', 'Anular'];
const ELIMINAR = ['Eliminar'];
/* Datos de Mi cuenta que cualquier usuario puede cambiar de si mismo. */
const PERFIL = ['nombre_empleado', 'nombre_usuario', 'correo_empresarial', 'telefono'];

/** Cadenas vacias como NULL: el formulario envia '' en fechas y opcionales. */
const limpiar = (campos, body) =>
  Object.fromEntries(campos.filter((k) => body[k] !== undefined).map((k) => [k, body[k] === '' ? null : body[k]]));

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
  /* Las existencias no se guardan: un cambio en el formulario se registra
     como un ajuste de inventario por la diferencia. */
  insumos: async (db, fila, body) => {
    if (body.stock === undefined || body.stock === '') return;
    const { rows: [s] } = await db.query('SELECT stock FROM v_insumo_stock WHERE id_insumo=$1', [fila.id_insumo]);
    const diferencia = Math.round((Number(body.stock) - Number(s.stock)) * 100) / 100;
    if (diferencia) {
      await db.query(
        "INSERT INTO movimiento_inventario(id_insumo,cantidad,origen,id_usuario) VALUES ($1,$2,'AJUSTE',app_user_id())",
        [fila.id_insumo, diferencia]
      );
    }
  },
  compras: (db, fila, body) =>
    reemplazarLineas(db, 'detalle_compra_insumo', 'id_compra', fila.id_compra, body.detalles, ['id_insumo', 'cantidad', 'precio_unitario']),
  /* El pedido guarda tres detalles: los productos que se cobran, los insumos
     de personalizacion (con precio) y la copia de la receta de los productos
     (`de_receta`, precio 0): esta ultima solo descuenta inventario. La receta
     se copia al guardar para que editarla despues no cambie pedidos viejos. */
  pedidos: async (db, fila, body) => {
    await reemplazarLineas(db, 'detalle_pedido_producto', 'id_pedido', fila.id_pedido, body.productos, ['id_producto', 'cantidad', 'precio_unitario']);
    await reemplazarLineas(db, 'detalle_pedido_insumo', 'id_pedido', fila.id_pedido, body.insumos, ['id_insumo', 'cantidad', 'precio_unitario'], { de_receta: false });
    await reemplazarLineas(
      db, 'detalle_pedido_insumo', 'id_pedido', fila.id_pedido,
      Array.isArray(body.insumos_receta) ? body.insumos_receta.map((l) => ({ ...l, precio_unitario: 0 })) : undefined,
      ['id_insumo', 'cantidad', 'precio_unitario'], { de_receta: true }
    );
  },
  productos: (db, fila, body) =>
    reemplazarLineas(db, 'receta_producto', 'id_producto', fila.id_producto, body.receta, ['id_insumo', 'cantidad']),
};

/* Antes de eliminar un documento se devuelve su efecto en el inventario. */
const ANTES_DE_ELIMINAR = {
  compras: (db, id) => db.query('DELETE FROM movimiento_inventario WHERE id_compra=$1', [id]),
  pedidos: (db, id) => db.query('DELETE FROM movimiento_inventario WHERE id_pedido=$1', [id]),
};

const router = Router();

const configDe = (req, res) => {
  const cfg = COLECCIONES[req.params.coleccion];
  if (!cfg) res.status(404).json({ message: 'Ruta no encontrada.' });
  return cfg;
};

router.post('/:coleccion', async (req, res, next) => {
  const cfg = configDe(req, res); if (!cfg) return;
  if (!puede(req.user, cfg.modulos, AGREGAR)) return res.status(403).json({ message: 'No tiene permisos para esta acción.' });
  if (req.params.coleccion === 'usuarios' && String(req.body.contrasena || '').length < 6) {
    return res.status(400).json({ campo: 'contrasena', message: 'La contraseña debe tener al menos 6 caracteres.' });
  }
  try {
    const data = limpiar(cfg.campos, req.body);
    if (req.params.coleccion === 'usuarios') data.contrasena_hash = await bcrypt.hash(String(req.body.contrasena), 12);
    if (req.params.coleccion === 'pedidos' && !data.id_vendedor) data.id_vendedor = req.user.id_usuario;
    const fila = await conUsuario(req.user.id_usuario, async (db) => {
      const nueva = await insertar(db, cfg, data);
      await DESPUES[req.params.coleccion]?.(db, nueva, req.body);
      return nueva;
    });
    res.status(201).json(fila);
  } catch (e) { next(e); }
});

router.put('/:coleccion/:id', async (req, res, next) => {
  const cfg = configDe(req, res); if (!cfg) return;
  const id = Number(req.params.id);
  let campos = cfg.campos;
  if (!puede(req.user, cfg.modulos, MODIFICAR)) {
    /* Sin permiso sobre Usuarios, cada quien solo edita su propio perfil. */
    if (req.params.coleccion !== 'usuarios' || id !== req.user.id_usuario) {
      return res.status(403).json({ message: 'No tiene permisos para esta acción.' });
    }
    campos = PERFIL;
  }
  try {
    /* El rol Administrador (y el rol de quien hace la peticion) no se puede inactivar:
       dejaria el sistema sin nadie que pueda entrar a reactivarlo. */
    if (req.params.coleccion === 'roles' && req.body.activo === false) {
      const { rows: [rol] } = await query('SELECT nombre FROM rol WHERE id_rol=$1', [id]);
      if (rol?.nombre === 'Administrador' || id === req.user.id_rol) {
        return res.status(400).json({ message: 'El rol Administrador no se puede inactivar.' });
      }
    }
    const fila = await conUsuario(req.user.id_usuario, async (db) => {
      const actual = await actualizar(db, cfg, id, limpiar(campos, req.body));
      if (!actual) return null;
      if (campos !== PERFIL) await DESPUES[req.params.coleccion]?.(db, actual, req.body);
      return actual;
    });
    if (!fila) return res.status(404).json({ message: 'Registro no encontrado.' });
    res.json(fila);
  } catch (e) { next(e); }
});

router.delete('/:coleccion/:id', async (req, res, next) => {
  const cfg = configDe(req, res); if (!cfg) return;
  if (!puede(req.user, cfg.modulos, ELIMINAR)) return res.status(403).json({ message: 'No tiene permisos para esta acción.' });
  const id = Number(req.params.id);
  if (req.params.coleccion === 'usuarios' && id === req.user.id_usuario) {
    return res.status(400).json({ message: 'No puede eliminar su propio usuario.' });
  }
  try {
    const borradas = await conUsuario(req.user.id_usuario, async (db) => {
      await ANTES_DE_ELIMINAR[req.params.coleccion]?.(db, id);
      return (await db.query(`DELETE FROM ${cfg.tabla} WHERE ${cfg.pk}=$1`, [id])).rowCount;
    });
    if (!borradas) return res.status(404).json({ message: 'Registro no encontrado.' });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
