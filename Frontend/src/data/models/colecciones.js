/*
 * Modelos de datos del frontend: llave primaria de cada coleccion, tabla de
 * la base de datos que le corresponde y estado vacio de los datos.
 */

export const PK = {
  permisos: 'id_permiso', privilegios: 'id_privilegio', tipos_insumo: 'id_tipo_insumo',
  unidades_medida: 'id_unidad_medida', roles: 'id_rol', usuarios: 'id_usuario', insumos: 'id_insumo',
  proveedores: 'id_proveedor', compras: 'id_compra', clientes: 'id_cliente', pedidos: 'id_pedido',
  abonos: 'id_abono', tallas: 'id_talla', categorias_producto: 'id_categoria_producto',
  productos: 'id_producto',
};

/** Estado vacio mientras no hay sesion o mientras carga. */
export const VACIO = {
  catalogos: { tipos_documento: [], estados_pedido: [], estados_compra: [], metodos_pago: [] },
  permisos: [], privilegios: [], tipos_insumo: [], unidades_medida: [], roles: [], usuarios: [],
  insumos: [], proveedores: [], compras: [], clientes: [], pedidos: [], abonos: [],
  tallas: [], categorias_producto: [], productos: [],
};
