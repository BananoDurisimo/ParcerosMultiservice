import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { conUsuario, query, ErrorNegocio } from '../db/pool.js';
import { puede } from '../middleware/auth.js';

/*
 * Escritura de todos los modulos: POST /api/:coleccion, PUT /api/:coleccion/:id
 * y DELETE /api/:coleccion/:id.
 *
 * - `campos` es la lista blanca de columnas: nada fuera de ella llega al SQL.
 * - `estado` son las columnas que cambia quien solo tiene «Cambiar estado» o
 *   «Anular» (sin «Editar»); quien solo tiene «Editar» no las puede tocar.
 * - `soloCrear` son columnas que se fijan al crear y ya no se editan.
 * - `modulos` son los permisos que dan acceso a la coleccion. Crear exige
 *   «Agregar», modificar «Editar» y/o «Cambiar estado»/«Anular», y eliminar
 *   «Eliminar» en alguno de ellos. El pedido pertenece al modulo de su etapa
 *   (ver `modulosDe`).
 * - Cada operacion corre en una transaccion con el usuario de la peticion,
 *   para que los triggers de auditoria e inventario lo registren. Lo que una
 *   operacion arrastra (el abono inicial de un pedido, el estado del pedido
 *   al abonar, los abonos de un pedido eliminado) va en esa misma transaccion.
 */
const COLECCIONES = {
  clientes: {
    tabla: 'cliente', pk: 'id_cliente', modulos: ['Clientes'],
    campos: ['id_tipo_documento', 'nombre', 'documento', 'telefono', 'correo', 'direccion', 'activo'],
  },
  proveedores: {
    tabla: 'proveedor', pk: 'id_proveedor', modulos: ['Proveedores'],
    campos: ['id_tipo_insumo', 'nombre', 'telefono', 'pais', 'activo'],
  },
  insumos: {
    tabla: 'insumo', pk: 'id_insumo', modulos: ['Insumos'],
    campos: ['id_tipo_insumo', 'id_unidad_medida', 'nombre', 'stock_minimo', 'activo'],
  },
  roles: { tabla: 'rol', pk: 'id_rol', modulos: ['Roles'], campos: ['nombre', 'activo'] },
  usuarios: {
    tabla: 'usuario', pk: 'id_usuario', modulos: ['Usuarios'],
    campos: ['id_rol', 'id_tipo_documento', 'correo_empresarial', 'nombre_empleado', 'documento', 'telefono', 'cargo', 'fecha_ingreso', 'activo'],
  },
  compras: {
    tabla: 'compra', pk: 'id_compra', modulos: ['Compras'],
    campos: ['id_proveedor', 'id_estado_compra', 'fecha', 'fecha_entrega'],
    estado: ['id_estado_compra'],
  },
  pedidos: {
    tabla: 'pedido', pk: 'id_pedido', modulos: ['Cotizaciones', 'Pedidos', 'Ventas'],
    campos: ['id_cliente', 'id_estado_pedido', 'id_vendedor', 'fecha_creacion', 'fecha_inicio', 'fecha_entrega', 'descripcion', 'ruta_imagen_diseno'],
    /* El cambio de etapa lleva su fecha (inicio o entrega). */
    estado: ['id_estado_pedido', 'fecha_inicio', 'fecha_entrega'],
  },
  abonos: {
    tabla: 'abono', pk: 'id_abono', modulos: ['Abonos'],
    campos: ['id_pedido', 'id_metodo_pago', 'monto', 'fecha', 'ruta_comprobante'],
    /* El monto de un abono registrado no cambia: un error se corrige
       eliminando el abono y registrandolo de nuevo. */
    soloCrear: ['id_pedido', 'monto'],
  },
  tipos_insumo: {
    tabla: 'tipo_insumo', pk: 'id_tipo_insumo', modulos: ['Categorías de insumo'],
    campos: ['nombre', 'descripcion', 'activo'],
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
const EDITAR = ['Editar'];
const CAMBIAR_ESTADO = ['Cambiar estado', 'Anular'];
const ELIMINAR = ['Eliminar'];
const SIN_PERMISO = 'No tiene permisos para esta acción.';
/* Datos de Mi cuenta que cualquier usuario puede cambiar de si mismo. */
const PERFIL = ['nombre_empleado', 'correo_empresarial', 'telefono'];

/* Etapa del pedido (estado_pedido.orden) -> modulo que lo gestiona: la
   cotizacion (1) es de Cotizaciones; en proceso y falta pago (2, 3), de
   Pedidos; el completado (4) se ve en Pedidos y en Ventas; el entregado (5),
   en Ventas. */
const MODULOS_ETAPA = { 1: ['Cotizaciones'], 2: ['Pedidos'], 3: ['Pedidos'], 4: ['Pedidos', 'Ventas'], 5: ['Ventas'] };
const ordenDeEstado = async (idEstado) =>
  (await query('SELECT orden FROM estado_pedido WHERE id_estado_pedido = $1', [Number(idEstado) || 0])).rows[0]?.orden;
const ordenDePedido = async (id) =>
  (await query('SELECT e.orden FROM pedido p JOIN estado_pedido e ON e.id_estado_pedido = p.id_estado_pedido WHERE p.id_pedido = $1', [id])).rows[0]?.orden;

/** Cadenas sin espacios sobrantes y vacias como NULL: el formulario envia ''
 *  en fechas y opcionales. */
const limpiar = (campos, body) =>
  Object.fromEntries(campos.filter((k) => body[k] !== undefined).map((k) => {
    const v = typeof body[k] === 'string' ? body[k].trim() : body[k];
    return [k, v === '' ? null : v];
  }));

/* Adjuntos: data URL de una imagen (o PDF en el comprobante) de hasta 5 MB,
   que en base64 son unos 7 millones de caracteres. */
const ADJUNTO = {
  ruta_imagen_diseno: /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/,
  ruta_comprobante: /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/]+=*$/,
};

/** Validaciones que no dependen de la base de datos. */
const validar = (coleccion, data, body) => {
  for (const [campo, formato] of Object.entries(ADJUNTO)) {
    /* Un adjunto se quita enviando null. La cadena vacia no lo toca: es lo que
       envia una pestaña con la version anterior del frontend, que ya no
       recibe el archivo en el listado y lo borraria sin querer. */
    if (body[campo] === '') delete data[campo];
    const v = data[campo];
    if (v != null && (typeof v !== 'string' || v.length > 7_100_000 || !formato.test(v))) {
      throw new ErrorNegocio('El archivo adjunto no es válido: debe ser una imagen JPG, PNG o WEBP (o PDF en el comprobante) de máximo 5 MB.', campo);
    }
  }
  if (coleccion === 'usuarios') {
    if (typeof data.correo_empresarial === 'string') data.correo_empresarial = data.correo_empresarial.toLowerCase();
    if (body.contrasena !== undefined && body.contrasena !== '' && String(body.contrasena).length < 6) {
      throw new ErrorNegocio('La contraseña debe tener al menos 6 caracteres.', 'contrasena');
    }
  }
  if (coleccion === 'insumos' && body.stock !== undefined && body.stock !== '') {
    const stock = Number(body.stock);
    if (!Number.isFinite(stock) || stock < 0) throw new ErrorNegocio('Las existencias deben ser un número de cero en adelante.', 'stock');
  }
};

const insertar = async (db, cfg, data) => {
  const k = Object.keys(data);
  if (!k.length) throw new ErrorNegocio('No se recibieron datos para guardar.');
  const { rows } = await db.query(
    `INSERT INTO ${cfg.tabla} (${k.join(',')}) VALUES (${k.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING ${cfg.pk}`,
    Object.values(data)
  );
  return rows[0];
};

const actualizar = async (db, cfg, id, data) => {
  const k = Object.keys(data);
  if (!k.length) {
    const { rows } = await db.query(`SELECT ${cfg.pk} FROM ${cfg.tabla} WHERE ${cfg.pk}=$1`, [id]);
    return rows[0];
  }
  const { rows } = await db.query(
    `UPDATE ${cfg.tabla} SET ${k.map((c, i) => `${c}=$${i + 1}`).join(',')} WHERE ${cfg.pk}=$${k.length + 1} RETURNING ${cfg.pk}`,
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

/**
 * Un abono mueve la etapa de su pedido: el primero inicia la cotizacion (si
 * hay existencias; si no, sigue como cotizacion) y el que salda un pedido en
 * «falta pago» lo deja «completado».
 */
const avanzarPorAbono = async (db, idPedido, fecha) => {
  const { rows: [p] } = await db.query(
    `SELECT e.orden, t.saldo FROM pedido p
       JOIN estado_pedido e ON e.id_estado_pedido = p.id_estado_pedido
       JOIN v_pedido_total t ON t.id_pedido = p.id_pedido
      WHERE p.id_pedido = $1`,
    [idPedido]
  );
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

/* Lo que cada coleccion hace ademas de su propia fila. `nuevo`: es un POST. */
const DESPUES = {
  roles: async (db, id, body) => {
    if (!Array.isArray(body.permisos)) return;
    await db.query('DELETE FROM rolxpermiso WHERE id_rol=$1', [id]); // el trigger quita sus privilegios
    for (const p of body.permisos) await db.query('INSERT INTO rolxpermiso VALUES ($1,$2)', [id, p]);
    for (const p of body.privilegios || []) await db.query('INSERT INTO rolxprivilegio VALUES ($1,$2)', [id, p]);
  },
  usuarios: async (db, id, body) => {
    if (body.contrasena) {
      await db.query('UPDATE usuario SET contrasena_hash=$1 WHERE id_usuario=$2', [await bcrypt.hash(String(body.contrasena), 12), id]);
    }
  },
  /* Las existencias no se guardan: un cambio en el formulario se registra
     como un ajuste de inventario por la diferencia. */
  insumos: async (db, id, body) => {
    if (body.stock === undefined || body.stock === '') return;
    const { rows: [s] } = await db.query('SELECT stock FROM v_insumo_stock WHERE id_insumo=$1', [id]);
    const diferencia = Math.round((Number(body.stock) - Number(s.stock)) * 100) / 100;
    if (diferencia) {
      await db.query(
        "INSERT INTO movimiento_inventario(id_insumo,cantidad,origen,id_usuario) VALUES ($1,$2,'AJUSTE',app_user_id())",
        [id, diferencia]
      );
    }
  },
  compras: async (db, id, body, { nuevo }) => {
    if (nuevo && !(Array.isArray(body.detalles) && body.detalles.length)) {
      throw new ErrorNegocio('Agregue al menos un insumo a la compra.', 'detalle_insumos');
    }
    await reemplazarLineas(db, 'detalle_compra_insumo', 'id_compra', id, body.detalles, ['id_insumo', 'cantidad', 'precio_unitario']);
  },
  /* El pedido guarda tres detalles: los productos que se cobran, los insumos
     de personalizacion (con precio) y la copia de la receta de los productos
     (`de_receta`, precio 0): esta ultima solo descuenta inventario. La receta
     se copia al guardar para que editarla despues no cambie pedidos viejos.
     Las lineas solo se editan mientras el pedido es cotizacion o esta en
     proceso; despues se conservan como quedaron. */
  pedidos: async (db, id, body, { nuevo }) => {
    const { rows: [{ orden }] } = await db.query(
      'SELECT e.orden FROM pedido p JOIN estado_pedido e ON e.id_estado_pedido = p.id_estado_pedido WHERE p.id_pedido = $1', [id]
    );
    if (orden <= 2) {
      await reemplazarLineas(
        db, 'detalle_pedido_producto', 'id_pedido', id,
        Array.isArray(body.productos) ? body.productos.map((l) => ({ ...l, defectuosas: Number(l?.defectuosas) || 0 })) : undefined,
        ['id_producto', 'cantidad', 'precio_unitario', 'defectuosas']
      );
      await reemplazarLineas(db, 'detalle_pedido_insumo', 'id_pedido', id, body.insumos, ['id_insumo', 'cantidad', 'precio_unitario'], { de_receta: false });
      await reemplazarLineas(
        db, 'detalle_pedido_insumo', 'id_pedido', id,
        Array.isArray(body.insumos_receta) ? body.insumos_receta.map((l) => ({ ...l, precio_unitario: 0 })) : undefined,
        ['id_insumo', 'cantidad', 'precio_unitario'], { de_receta: true }
      );
    }
    /* El pedido que nace en proceso trae su abono inicial: van juntos o no va ninguno. */
    if (nuevo && orden === 2 && body.abono_inicial) {
      const a = limpiar(COLECCIONES.abonos.campos, { ...body.abono_inicial, id_pedido: id });
      validar('abonos', a, {});
      await insertar(db, COLECCIONES.abonos, a);
    }
    const { rows: [t] } = await db.query(
      `SELECT total, abonado, (SELECT count(*) FROM detalle_pedido_producto WHERE id_pedido = $1)
              + (SELECT count(*) FROM detalle_pedido_insumo WHERE id_pedido = $1 AND NOT de_receta) AS lineas
         FROM v_pedido_total WHERE id_pedido = $1`,
      [id]
    );
    if (!t.lineas) throw new ErrorNegocio('Agregue al menos un producto (o un insumo) al registro.', 'lineas');
    if (t.abonado > t.total + 0.005) throw new ErrorNegocio('El total no puede quedar por debajo de lo ya abonado.', 'lineas');
    if (nuevo && orden >= 2 && t.abonado <= 0) throw new ErrorNegocio('El pedido necesita su abono inicial.', 'abono_monto');
  },
  abonos: async (db, id, body, { nuevo }) => {
    if (!nuevo) return;
    const { rows: [a] } = await db.query('SELECT id_pedido, fecha FROM abono WHERE id_abono = $1', [id]);
    await avanzarPorAbono(db, a.id_pedido, a.fecha);
  },
  productos: (db, id, body) =>
    reemplazarLineas(db, 'receta_producto', 'id_producto', id, body.receta, ['id_insumo', 'cantidad']),
};

/* Antes de eliminar un documento se deshace lo que arrastra. Lo que devuelven
   (una funcion) se ejecuta despues de borrar la fila. */
const ANTES_DE_ELIMINAR = {
  compras: async (db, id) => { await db.query('DELETE FROM movimiento_inventario WHERE id_compra=$1', [id]); },
  /* El pedido se va con sus abonos y devuelve sus insumos al inventario. */
  pedidos: async (db, id) => {
    await db.query('DELETE FROM abono WHERE id_pedido=$1', [id]);
    await db.query('DELETE FROM movimiento_inventario WHERE id_pedido=$1', [id]);
  },
  /* Un abono no se elimina si deja al pedido sin respaldo: los de una venta
     entregada son su soporte y un pedido en produccion necesita el inicial.
     Si el pedido estaba completado, vuelve a «falta pago». */
  abonos: async (db, id) => {
    const { rows: [a] } = await db.query(
      `SELECT a.id_pedido, e.orden, (SELECT count(*) FROM abono x WHERE x.id_pedido = a.id_pedido) AS abonos
         FROM abono a JOIN pedido p ON p.id_pedido = a.id_pedido
         JOIN estado_pedido e ON e.id_estado_pedido = p.id_estado_pedido
        WHERE a.id_abono = $1 FOR UPDATE OF p`,
      [id]
    );
    if (!a) return undefined;
    if (a.orden === 5) throw new ErrorNegocio('El pedido ya se entregó: sus abonos son el soporte de la venta.');
    if (a.orden > 1 && a.abonos <= 1) throw new ErrorNegocio('Es el abono inicial de un pedido en producción. Si el pedido no va, elimine el pedido.');
    return async () => {
      if (a.orden === 4) await db.query(`UPDATE pedido SET id_estado_pedido = ${estadoPedido(3)} WHERE id_pedido = $1`, [a.id_pedido]);
    };
  },
};

const router = Router();

/* El rol Administrador esta bloqueado: no se edita, no cambia de estado, no
   se elimina ni pierde permisos (la base de datos tambien lo impide, 008). */
const ROL_PROTEGIDO = 'El rol Administrador está protegido: no se puede modificar ni eliminar.';
const esRolAdministrador = async (coleccion, id) => {
  if (coleccion !== 'roles') return false;
  const { rows: [rol] } = await query('SELECT nombre FROM rol WHERE id_rol=$1', [id]);
  return rol?.nombre === 'Administrador';
};

/** Coleccion e id de la ruta, o respuesta 404. */
const ruta = (req, res) => {
  const coleccion = req.params.coleccion;
  const cfg = Object.hasOwn(COLECCIONES, coleccion) ? COLECCIONES[coleccion] : null;
  const id = req.params.id === undefined ? null : Number(req.params.id);
  if (!cfg || (id !== null && !(Number.isInteger(id) && id > 0)) || !req.body || typeof req.body !== 'object') {
    res.status(404).json({ message: cfg ? 'Registro no encontrado.' : 'Ruta no encontrada.' });
    return {};
  }
  return { coleccion, cfg, id };
};

/** Modulos que dan acceso al registro: el pedido depende de su etapa. */
const modulosDe = (coleccion, cfg, orden) => (coleccion === 'pedidos' ? MODULOS_ETAPA[orden] || [] : cfg.modulos);

router.post('/:coleccion', async (req, res, next) => {
  const { coleccion, cfg } = ruta(req, res); if (!cfg) return;
  try {
    const orden = coleccion === 'pedidos' ? await ordenDeEstado(req.body.id_estado_pedido) : null;
    /* Un registro de venta nace como cotizacion o como pedido en proceso. */
    if (coleccion === 'pedidos' && ![1, 2].includes(orden)) throw new ErrorNegocio('El registro solo puede crearse como cotización o como pedido en proceso.');
    if (!puede(req.user, modulosDe(coleccion, cfg, orden), AGREGAR)) return res.status(403).json({ message: SIN_PERMISO });
    if (coleccion === 'usuarios' && !req.body.contrasena) throw new ErrorNegocio('La contraseña debe tener al menos 6 caracteres.', 'contrasena');

    const data = limpiar(cfg.campos, req.body);
    validar(coleccion, data, req.body);
    if (coleccion === 'usuarios') data.contrasena_hash = await bcrypt.hash(String(req.body.contrasena), 12);
    if (coleccion === 'pedidos' && !data.id_vendedor) data.id_vendedor = req.user.id_usuario;
    const fila = await conUsuario(req.user.id_usuario, async (db) => {
      const nueva = await insertar(db, cfg, data);
      await DESPUES[coleccion]?.(db, nueva[cfg.pk], req.body, { nuevo: true });
      return nueva;
    });
    res.status(201).json(fila);
  } catch (e) { next(e); }
});

router.put('/:coleccion/:id', async (req, res, next) => {
  const { coleccion, cfg, id } = ruta(req, res); if (!cfg) return;
  try {
    const modulos = modulosDe(coleccion, cfg, coleccion === 'pedidos' ? await ordenDePedido(id) : null);
    const editar = puede(req.user, modulos, EDITAR);
    const cambiarEstado = puede(req.user, modulos, CAMBIAR_ESTADO);
    const columnasEstado = cfg.estado || (cfg.campos.includes('activo') ? ['activo'] : []);
    let campos;
    if (editar) campos = cambiarEstado ? cfg.campos : cfg.campos.filter((c) => !columnasEstado.includes(c));
    else if (cambiarEstado) campos = columnasEstado;
    /* Sin permiso sobre Usuarios, cada quien solo edita su propio perfil. */
    else if (coleccion === 'usuarios' && id === req.user.id_usuario) campos = PERFIL;
    else return res.status(403).json({ message: SIN_PERMISO });
    campos = campos.filter((c) => !cfg.soloCrear?.includes(c));

    if (await esRolAdministrador(coleccion, id)) return res.status(400).json({ message: ROL_PROTEGIDO });
    /* Ni el rol ni el usuario de quien hace la peticion se pueden inactivar: se quedaria sin acceso. */
    if (coleccion === 'roles' && req.body.activo === false && id === req.user.id_rol) {
      throw new ErrorNegocio('No puede inactivar el rol con el que inició sesión.');
    }
    if (coleccion === 'usuarios' && req.body.activo === false && id === req.user.id_usuario) {
      throw new ErrorNegocio('No puede inactivar el usuario con el que inició sesión.');
    }
    const data = limpiar(campos, req.body);
    validar(coleccion, data, editar ? req.body : {});
    const fila = await conUsuario(req.user.id_usuario, async (db) => {
      const actual = await actualizar(db, cfg, id, data);
      if (!actual) return null;
      if (editar) await DESPUES[coleccion]?.(db, id, req.body, { nuevo: false });
      return actual;
    });
    if (!fila) return res.status(404).json({ message: 'Registro no encontrado.' });
    res.json(fila);
  } catch (e) { next(e); }
});

router.delete('/:coleccion/:id', async (req, res, next) => {
  const { coleccion, cfg, id } = ruta(req, res); if (!cfg) return;
  try {
    const modulos = modulosDe(coleccion, cfg, coleccion === 'pedidos' ? await ordenDePedido(id) : null);
    if (!puede(req.user, modulos, ELIMINAR)) return res.status(403).json({ message: SIN_PERMISO });
    if (coleccion === 'usuarios' && id === req.user.id_usuario) throw new ErrorNegocio('No puede eliminar su propio usuario.');
    if (await esRolAdministrador(coleccion, id)) return res.status(400).json({ message: ROL_PROTEGIDO });
    const borradas = await conUsuario(req.user.id_usuario, async (db) => {
      const despues = await ANTES_DE_ELIMINAR[coleccion]?.(db, id);
      const n = (await db.query(`DELETE FROM ${cfg.tabla} WHERE ${cfg.pk}=$1`, [id])).rowCount;
      if (n) await despues?.();
      return n;
    });
    if (!borradas) return res.status(404).json({ message: 'Registro no encontrado.' });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
