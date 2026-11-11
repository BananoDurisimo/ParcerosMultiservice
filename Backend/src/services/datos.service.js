import { query } from '../config/db.js';
import { HttpError, noEncontrado } from '../errors/HttpError.js';
import { tiene } from '../middlewares/auth.middleware.js';

/*
 * GET /api/datos
 *
 * Todo lo que el frontend necesita para dibujar el sistema, en una sola
 * peticion: el servidor de Render tarda en despertar y varias peticiones
 * seguidas multiplicarian la espera. Devuelve las tablas con sus nombres de
 * la base de datos; el frontend las traduce en src/data/mappers/adaptador.js.
 *
 * Los adjuntos (diseño del pedido y comprobante del abono) no viajan aqui:
 * solo `tiene_diseno` / `tiene_comprobante`. Son data URL de hasta 5 MB y el
 * frontend vuelve a pedir estos datos tras cada cambio; enviarlos cada vez
 * agotaba la transferencia del servidor. Se piden con obtenerArchivo().
 *
 * Cada coleccion sale solo si el rol tiene alguno de los modulos que la usan
 * (`modulos`); sin `modulos` es un catalogo que ve cualquier usuario. Las que
 * no le corresponden llegan vacias. `params(usuario)` son los valores de la
 * consulta cuando depende de quien pregunta.
 */
const VENTAS = ['Cotizaciones', 'Pedidos', 'Ventas', 'Abonos'];
const COMPRAS = ['Órdenes de pedido', 'Insumos', 'Proveedores'];
const CONSULTAS = {
  permisos: { sql: 'SELECT * FROM permiso ORDER BY id_permiso' },
  privilegios: { sql: 'SELECT * FROM privilegio ORDER BY id_privilegio' },
  tipos_insumo: { modulos: ['Categorías de insumo', 'Productos', ...COMPRAS], sql: 'SELECT * FROM tipo_insumo ORDER BY id_tipo_insumo' },
  unidades_medida: { sql: 'SELECT * FROM unidad_medida ORDER BY id_unidad_medida' },
  estados_pedido: { sql: 'SELECT * FROM estado_pedido ORDER BY orden' },
  estados_compra: { sql: 'SELECT * FROM estado_compra ORDER BY id_estado_compra' },
  tipos_documento: { sql: 'SELECT * FROM tipo_documento ORDER BY id_tipo_documento' },
  metodos_pago: { sql: 'SELECT * FROM metodo_pago ORDER BY id_metodo_pago' },

  /* Sin Roles ni Usuarios, cada quien recibe solo su propio rol. */
  roles: {
    sql: `
      SELECT r.*,
        COALESCE((SELECT array_agg(id_permiso ORDER BY id_permiso) FROM rolxpermiso WHERE id_rol = r.id_rol), '{}') AS permisos,
        COALESCE((SELECT array_agg(id_privilegio ORDER BY id_privilegio) FROM rolxprivilegio WHERE id_rol = r.id_rol), '{}') AS privilegios
      FROM rol r WHERE $1::boolean OR r.id_rol = $2 ORDER BY r.id_rol DESC`,
    params: (u) => [tiene(u, ['Roles', 'Usuarios']), u.id_rol],
  },

  /* Nunca sale el hash de la contrasena. Con Usuarios se ve todo; con Roles,
     solo el nombre, el correo y el rol (los usuarios de cada rol); sin
     ninguno, solo el propio usuario. */
  usuarios: {
    sql: `
      SELECT id_usuario, id_rol, correo_empresarial, nombre_empleado, activo,
             CASE WHEN ver THEN id_tipo_documento END AS id_tipo_documento,
             CASE WHEN ver THEN documento END AS documento,
             CASE WHEN ver THEN telefono END AS telefono,
             CASE WHEN ver THEN cargo END AS cargo,
             CASE WHEN ver THEN fecha_ingreso END AS fecha_ingreso
      FROM usuario, LATERAL (SELECT ($1::boolean OR id_usuario = $3) AS ver) v
      WHERE ver OR $2::boolean ORDER BY id_usuario DESC`,
    params: (u) => [tiene(u, ['Usuarios']), tiene(u, ['Roles']), u.id_usuario],
  },

  insumos: { modulos: ['Categorías de insumo', 'Productos', ...COMPRAS, ...VENTAS], sql: `
    SELECT i.*, s.stock FROM insumo i JOIN v_insumo_stock s ON s.id_insumo = i.id_insumo
    ORDER BY i.id_insumo DESC` },

  proveedores: { modulos: ['Categorías de insumo', ...COMPRAS], sql: 'SELECT * FROM proveedor ORDER BY id_proveedor DESC' },
  clientes: { modulos: ['Clientes', ...VENTAS], sql: 'SELECT * FROM cliente ORDER BY id_cliente DESC' },

  compras: { modulos: [...COMPRAS, ...VENTAS], sql: `
    SELECT c.*,
      COALESCE((SELECT json_agg(json_build_object('id_insumo', d.id_insumo, 'cantidad', d.cantidad, 'precio_unitario', d.precio_unitario) ORDER BY d.id_insumo)
                FROM detalle_compra_insumo d WHERE d.id_compra = c.id_compra), '[]') AS detalles
    FROM compra c ORDER BY c.id_compra DESC` },

  tallas: { sql: 'SELECT * FROM talla ORDER BY orden' },
  categorias_producto: { modulos: ['Categorías de producto', 'Productos', ...VENTAS], sql: 'SELECT * FROM categoria_producto ORDER BY id_categoria_producto DESC' },

  productos: { modulos: ['Productos', 'Categorías de producto', 'Insumos', ...VENTAS], sql: `
    SELECT pr.*,
      COALESCE((SELECT json_agg(json_build_object('id_insumo', r.id_insumo, 'cantidad', r.cantidad) ORDER BY r.id_insumo)
                FROM receta_producto r WHERE r.id_producto = pr.id_producto), '[]') AS receta
    FROM producto pr ORDER BY pr.id_producto DESC` },

  pedidos: { modulos: [...VENTAS, 'Clientes', 'Productos', 'Insumos'], sql: `
    SELECT p.id_pedido, p.id_cliente, p.id_estado_pedido, p.id_vendedor, p.fecha_creacion, p.fecha_inicio,
      p.fecha_entrega, p.descripcion, COALESCE(p.ruta_imagen_diseno, '') <> '' AS tiene_diseno,
      COALESCE((SELECT json_agg(json_build_object('id_insumo', d.id_insumo, 'cantidad', d.cantidad, 'precio_unitario', d.precio_unitario, 'de_receta', d.de_receta, 'defectuosas', d.defectuosas) ORDER BY d.id_insumo)
                FROM detalle_pedido_insumo d WHERE d.id_pedido = p.id_pedido), '[]') AS insumos,
      COALESCE((SELECT json_agg(json_build_object('id_producto', d.id_producto, 'cantidad', d.cantidad, 'precio_unitario', d.precio_unitario, 'defectuosas', d.defectuosas) ORDER BY d.id_producto)
                FROM detalle_pedido_producto d WHERE d.id_pedido = p.id_pedido), '[]') AS productos,
      COALESCE((SELECT json_agg(json_build_object('id_estado_pedido', h.id_estado_pedido, 'fecha', h.fecha::date) ORDER BY h.fecha, h.id_historial)
                FROM historial_estado_pedido h WHERE h.id_pedido = p.id_pedido), '[]') AS historial
    FROM pedido p ORDER BY p.id_pedido DESC` },

  abonos: { modulos: VENTAS, sql: `
    SELECT id_abono, id_pedido, id_metodo_pago, monto, fecha, anulado, motivo_anulacion,
      COALESCE(ruta_comprobante, '') <> '' AS tiene_comprobante
    FROM abono ORDER BY id_abono DESC` },
};

/** Las consultas que le corresponden al usuario, en paralelo: { permisos: [...], roles: [...], ... }. */
export async function obtenerDatos(usuario) {
  const nombres = Object.keys(CONSULTAS);
  const resultados = await Promise.all(nombres.map((n) => {
    const c = CONSULTAS[n];
    if (c.modulos && !tiene(usuario, c.modulos)) return { rows: [] };
    return query(c.sql, c.params?.(usuario));
  }));
  return Object.fromEntries(nombres.map((n, i) => [n, resultados[i].rows]));
}

/** GET /api/archivos/:coleccion/:id: el adjunto de un registro ('' si no tiene). */
export async function obtenerArchivo(cfg, id) {
  if (!cfg?.archivo) throw new HttpError(404, 'Ruta no encontrada.');
  const { rows: [fila] } = await query(`SELECT ${cfg.archivo.columna} AS archivo FROM ${cfg.tabla} WHERE ${cfg.pk}=$1`, [id]);
  if (!fila) throw noEncontrado();
  return { archivo: fila.archivo || '' };
}
