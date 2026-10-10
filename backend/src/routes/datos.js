import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

/*
 * GET /api/datos
 *
 * Todo lo que el frontend necesita para dibujar el sistema, en una sola
 * peticion: el servidor de Render tarda en despertar y varias peticiones
 * seguidas multiplicarian la espera. Devuelve las tablas con sus nombres de
 * la base de datos; el frontend las traduce en src/shared/api/adaptador.js.
 */
const CONSULTAS = {
  permisos: 'SELECT * FROM permiso ORDER BY id_permiso',
  privilegios: 'SELECT * FROM privilegio ORDER BY id_privilegio',
  tipos_insumo: 'SELECT * FROM tipo_insumo ORDER BY id_tipo_insumo',
  unidades_medida: 'SELECT * FROM unidad_medida ORDER BY id_unidad_medida',
  estados_pedido: 'SELECT * FROM estado_pedido ORDER BY orden',
  estados_compra: 'SELECT * FROM estado_compra ORDER BY id_estado_compra',
  tipos_documento: 'SELECT * FROM tipo_documento ORDER BY id_tipo_documento',
  metodos_pago: 'SELECT * FROM metodo_pago ORDER BY id_metodo_pago',

  roles: `
    SELECT r.*,
      COALESCE((SELECT array_agg(id_permiso ORDER BY id_permiso) FROM rolxpermiso WHERE id_rol = r.id_rol), '{}') AS permisos,
      COALESCE((SELECT array_agg(id_privilegio ORDER BY id_privilegio) FROM rolxprivilegio WHERE id_rol = r.id_rol), '{}') AS privilegios
    FROM rol r ORDER BY r.id_rol DESC`,

  // Sin el hash de la contrasena.
  usuarios: `
    SELECT id_usuario, id_rol, nombre_usuario, correo_empresarial, nombre_empleado, documento,
           telefono, cargo, fecha_ingreso, activo
    FROM usuario ORDER BY id_usuario DESC`,

  insumos: `
    SELECT i.*, s.stock FROM insumo i JOIN v_insumo_stock s ON s.id_insumo = i.id_insumo
    ORDER BY i.id_insumo DESC`,

  proveedores: 'SELECT * FROM proveedor ORDER BY id_proveedor DESC',
  clientes: 'SELECT * FROM cliente ORDER BY id_cliente DESC',

  compras: `
    SELECT c.*,
      COALESCE((SELECT json_agg(json_build_object('id_insumo', d.id_insumo, 'cantidad', d.cantidad, 'precio_unitario', d.precio_unitario) ORDER BY d.id_insumo)
                FROM detalle_compra_insumo d WHERE d.id_compra = c.id_compra), '[]') AS detalles
    FROM compra c ORDER BY c.id_compra DESC`,

  tallas: 'SELECT * FROM talla ORDER BY orden',
  categorias_producto: 'SELECT * FROM categoria_producto ORDER BY id_categoria_producto DESC',

  productos: `
    SELECT pr.*,
      COALESCE((SELECT json_agg(json_build_object('id_insumo', r.id_insumo, 'cantidad', r.cantidad) ORDER BY r.id_insumo)
                FROM receta_producto r WHERE r.id_producto = pr.id_producto), '[]') AS receta
    FROM producto pr ORDER BY pr.id_producto DESC`,

  pedidos: `
    SELECT p.*,
      COALESCE((SELECT json_agg(json_build_object('id_insumo', d.id_insumo, 'cantidad', d.cantidad, 'precio_unitario', d.precio_unitario, 'de_receta', d.de_receta) ORDER BY d.id_insumo)
                FROM detalle_pedido_insumo d WHERE d.id_pedido = p.id_pedido), '[]') AS insumos,
      COALESCE((SELECT json_agg(json_build_object('id_producto', d.id_producto, 'cantidad', d.cantidad, 'precio_unitario', d.precio_unitario) ORDER BY d.id_producto)
                FROM detalle_pedido_producto d WHERE d.id_pedido = p.id_pedido), '[]') AS productos,
      COALESCE((SELECT json_agg(json_build_object('id_estado_pedido', h.id_estado_pedido, 'fecha', h.fecha::date) ORDER BY h.fecha, h.id_historial)
                FROM historial_estado_pedido h WHERE h.id_pedido = p.id_pedido), '[]') AS historial
    FROM pedido p ORDER BY p.id_pedido DESC`,

  abonos: 'SELECT * FROM abono ORDER BY id_abono DESC',

  // Cambios de los registros y accesos al sistema en una sola lista.
  movimientos: `
    SELECT * FROM (
      SELECT id_movimiento AS id, tabla, id_registro, accion, valor_anterior, valor_nuevo, id_usuario, fecha_cambio
      FROM movimientos
      UNION ALL
      SELECT 1000000000 + id_acceso, 'acceso', id_usuario, resultado, NULL,
             json_build_object('correo', correo, 'resultado',
               CASE resultado WHEN 'LOGIN' THEN 'Ingreso exitoso' WHEN 'LOGOUT' THEN 'Sesión cerrada' ELSE 'Correo o contraseña incorrectos' END)::jsonb,
             id_usuario, fecha
      FROM acceso
    ) t ORDER BY fecha_cambio DESC LIMIT 500`,
};

router.get('/datos', async (req, res, next) => {
  try {
    const nombres = Object.keys(CONSULTAS);
    const resultados = await Promise.all(nombres.map((n) => query(CONSULTAS[n])));
    res.json(Object.fromEntries(nombres.map((n, i) => [n, resultados[i].rows])));
  } catch (e) { next(e); }
});

export default router;
