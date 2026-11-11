import { Router } from 'express';
import { query } from '../db/pool.js';
import { puede, tiene } from '../middleware/auth.js';

const router = Router();

/*
 * GET /api/datos
 *
 * Todo lo que el frontend necesita para dibujar el sistema, en una sola
 * peticion: el servidor de Render tarda en despertar y varias peticiones
 * seguidas multiplicarian la espera. Devuelve las tablas con sus nombres de
 * la base de datos; el frontend las traduce en src/shared/api/adaptador.js.
 *
 * Cada coleccion sale solo si el rol tiene alguno de los modulos que la usan
 * (`modulos`); sin `modulos` es un catalogo que ve cualquier usuario. Las que
 * no le corresponden llegan vacias.
 *
 * Los adjuntos (diseño del pedido y comprobante del abono) no viajan aqui:
 * solo su huella (`diseno_md5`, `comprobante_md5`). El frontend los pide una
 * vez a GET /api/adjuntos y los conserva mientras la huella no cambie.
 */
const VENTAS = ['Cotizaciones', 'Pedidos', 'Ventas', 'Abonos'];
const CONSULTAS = {
  permisos: { sql: 'SELECT * FROM permiso ORDER BY id_permiso' },
  privilegios: { sql: 'SELECT * FROM privilegio ORDER BY id_privilegio' },
  unidades_medida: { sql: 'SELECT * FROM unidad_medida ORDER BY id_unidad_medida' },
  estados_pedido: { sql: 'SELECT * FROM estado_pedido ORDER BY orden' },
  estados_compra: { sql: 'SELECT * FROM estado_compra ORDER BY id_estado_compra' },
  tipos_documento: { sql: 'SELECT * FROM tipo_documento ORDER BY id_tipo_documento' },
  metodos_pago: { sql: 'SELECT * FROM metodo_pago ORDER BY id_metodo_pago' },
  tallas: { sql: 'SELECT * FROM talla ORDER BY orden' },

  tipos_insumo: {
    modulos: ['Categorías de insumo', 'Insumos', 'Proveedores', 'Compras', 'Productos'],
    sql: 'SELECT * FROM tipo_insumo ORDER BY id_tipo_insumo',
  },

  /* Sin Roles ni Usuarios, cada quien recibe solo su propio rol. */
  roles: {
    sql: `
      SELECT r.*,
        COALESCE((SELECT array_agg(id_permiso ORDER BY id_permiso) FROM rolxpermiso WHERE id_rol = r.id_rol), '{}') AS permisos,
        COALESCE((SELECT array_agg(id_privilegio ORDER BY id_privilegio) FROM rolxprivilegio WHERE id_rol = r.id_rol), '{}') AS privilegios
      FROM rol r WHERE $1 OR r.id_rol = $2 ORDER BY r.id_rol DESC`,
    params: (u) => [tiene(u, ['Roles', 'Usuarios']), u.id_rol],
  },

  /* Nunca sale el hash de la contrasena. Con Usuarios se ve todo; con
     Movimientos o Roles, solo el nombre, el correo y el rol (el responsable
     de cada cambio, los usuarios de cada rol); sin ninguno, solo el propio
     usuario. */
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
    params: (u) => [tiene(u, ['Usuarios']), tiene(u, ['Movimientos', 'Roles']), u.id_usuario],
  },

  insumos: {
    modulos: ['Insumos', 'Categorías de insumo', 'Proveedores', 'Compras', 'Productos', ...VENTAS],
    sql: `
      SELECT i.*, s.stock FROM insumo i JOIN v_insumo_stock s ON s.id_insumo = i.id_insumo
      ORDER BY i.id_insumo DESC`,
  },

  proveedores: {
    modulos: ['Proveedores', 'Compras', 'Insumos', 'Categorías de insumo'],
    sql: 'SELECT * FROM proveedor ORDER BY id_proveedor DESC',
  },
  clientes: { modulos: ['Clientes', ...VENTAS], sql: 'SELECT * FROM cliente ORDER BY id_cliente DESC' },

  compras: {
    modulos: ['Compras', 'Insumos', 'Proveedores'],
    sql: `
      SELECT c.*,
        COALESCE((SELECT json_agg(json_build_object('id_insumo', d.id_insumo, 'cantidad', d.cantidad, 'precio_unitario', d.precio_unitario) ORDER BY d.id_insumo)
                  FROM detalle_compra_insumo d WHERE d.id_compra = c.id_compra), '[]') AS detalles
      FROM compra c ORDER BY c.id_compra DESC`,
  },

  categorias_producto: {
    modulos: ['Categorías de producto', 'Productos'],
    sql: 'SELECT * FROM categoria_producto ORDER BY id_categoria_producto DESC',
  },

  productos: {
    modulos: ['Productos', 'Categorías de producto', 'Insumos', ...VENTAS],
    sql: `
      SELECT pr.*,
        COALESCE((SELECT json_agg(json_build_object('id_insumo', r.id_insumo, 'cantidad', r.cantidad) ORDER BY r.id_insumo)
                  FROM receta_producto r WHERE r.id_producto = pr.id_producto), '[]') AS receta
      FROM producto pr ORDER BY pr.id_producto DESC`,
  },

  pedidos: {
    modulos: [...VENTAS, 'Clientes', 'Productos', 'Insumos'],
    sql: `
      SELECT p.id_pedido, p.id_cliente, p.id_estado_pedido, p.id_vendedor, p.fecha_creacion, p.fecha_inicio,
             p.fecha_entrega, p.descripcion, p.diseno_md5,
        COALESCE((SELECT json_agg(json_build_object('id_insumo', d.id_insumo, 'cantidad', d.cantidad, 'precio_unitario', d.precio_unitario, 'de_receta', d.de_receta) ORDER BY d.id_insumo)
                  FROM detalle_pedido_insumo d WHERE d.id_pedido = p.id_pedido), '[]') AS insumos,
        COALESCE((SELECT json_agg(json_build_object('id_producto', d.id_producto, 'cantidad', d.cantidad, 'precio_unitario', d.precio_unitario, 'defectuosas', d.defectuosas) ORDER BY d.id_producto)
                  FROM detalle_pedido_producto d WHERE d.id_pedido = p.id_pedido), '[]') AS productos,
        COALESCE((SELECT json_agg(json_build_object('id_estado_pedido', h.id_estado_pedido, 'fecha', h.fecha::date) ORDER BY h.fecha, h.id_historial)
                  FROM historial_estado_pedido h WHERE h.id_pedido = p.id_pedido), '[]') AS historial
      FROM pedido p ORDER BY p.id_pedido DESC`,
  },

  abonos: {
    modulos: VENTAS,
    sql: 'SELECT id_abono, id_pedido, id_metodo_pago, monto, fecha, comprobante_md5 FROM abono ORDER BY id_abono DESC',
  },

  /* Ajustes manuales de existencias (kardex): el detalle del insumo los
     muestra junto a las compras y los pedidos. */
  ajustes_inventario: {
    modulos: ['Insumos'],
    sql: `
      SELECT m.id_movimiento_inventario AS id, m.id_insumo, m.cantidad, m.fecha::date AS fecha,
             COALESCE(u.nombre_empleado, 'Sistema') AS responsable
      FROM movimiento_inventario m LEFT JOIN usuario u ON u.id_usuario = m.id_usuario
      WHERE m.origen = 'AJUSTE' ORDER BY m.id_movimiento_inventario DESC`,
  },

  /* Cambios de los registros y accesos al sistema en una sola lista, sin los
     adjuntos (los ultimos 500). */
  movimientos: {
    modulos: ['Movimientos'],
    sql: `
      SELECT id, tabla, id_registro, accion, sin_adjuntos(valor_anterior) AS valor_anterior,
             sin_adjuntos(valor_nuevo) AS valor_nuevo, id_usuario, fecha_cambio
      FROM (
        SELECT id_movimiento AS id, tabla, id_registro, accion, valor_anterior, valor_nuevo, id_usuario, fecha_cambio
        FROM movimientos
        UNION ALL
        SELECT 1000000000 + id_acceso, 'acceso', id_usuario, resultado, NULL,
               json_build_object('correo', correo, 'resultado',
                 CASE resultado WHEN 'LOGIN' THEN 'Ingreso exitoso' WHEN 'LOGOUT' THEN 'Sesión cerrada' ELSE 'Correo o contraseña incorrectos' END)::jsonb,
               id_usuario, fecha
        FROM acceso
        ORDER BY fecha_cambio DESC LIMIT 500
      ) t ORDER BY fecha_cambio DESC`,
  },
};

router.get('/datos', async (req, res, next) => {
  try {
    const nombres = Object.keys(CONSULTAS);
    const resultados = await Promise.all(nombres.map((n) => {
      const c = CONSULTAS[n];
      if (c.modulos && !tiene(req.user, c.modulos)) return { rows: [] };
      return query(c.sql, c.params?.(req.user));
    }));
    res.json(Object.fromEntries(nombres.map((n, i) => [n, resultados[i].rows])));
  } catch (e) { next(e); }
});

/*
 * GET /api/adjuntos?pedidos=1,2&abonos=5
 * Devuelve { pedidos: { 1: 'data:…' }, abonos: { 5: 'data:…' } }.
 * El diseño lo recibe quien puede verlo, descargarlo o editar el registro; el
 * comprobante, igual. A los demas se les responde vacio.
 */
const ids = (texto) => [...new Set(String(texto || '').split(',').map(Number).filter(Number.isInteger))].slice(0, 500);
const mapa = (rows) => Object.fromEntries(rows.map((r) => [r.id, r.archivo]));

router.get('/adjuntos', async (req, res, next) => {
  try {
    const u = req.user;
    const verDiseno = puede(u, ['Cotizaciones', 'Pedidos', 'Ventas'], ['Ver diseño', 'Descargar diseño', 'Descargar cotización', 'Agregar', 'Editar']);
    const verComprobante = puede(u, ['Abonos', 'Ventas'], ['Ver comprobante', 'Descargar comprobante'])
      || puede(u, ['Abonos'], ['Agregar', 'Editar']);
    const pedidos = verDiseno ? ids(req.query.pedidos) : [];
    const abonos = verComprobante ? ids(req.query.abonos) : [];
    const [p, a] = await Promise.all([
      pedidos.length
        ? query('SELECT id_pedido AS id, ruta_imagen_diseno AS archivo FROM pedido WHERE id_pedido = ANY($1) AND ruta_imagen_diseno IS NOT NULL', [pedidos])
        : { rows: [] },
      abonos.length
        ? query('SELECT id_abono AS id, ruta_comprobante AS archivo FROM abono WHERE id_abono = ANY($1) AND ruta_comprobante IS NOT NULL', [abonos])
        : { rows: [] },
    ]);
    res.json({ pedidos: mapa(p.rows), abonos: mapa(a.rows) });
  } catch (e) { next(e); }
});

export default router;
