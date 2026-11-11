/*
 * Modelo de cada coleccion que la API escribe (POST/PUT/DELETE /api/:coleccion).
 * El esquema completo de la base de datos esta en ./migrations.
 *
 * - `tabla` y `pk`: tabla de PostgreSQL y su llave primaria.
 * - `campos` es la lista blanca de columnas: nada fuera de ella llega al SQL.
 * - `modulos` son los permisos que dan acceso a la coleccion. Crear exige
 *   «Agregar», modificar «Editar» y/o «Cambiar estado»/«Anular», y eliminar
 *   «Eliminar» en alguno de ellos.
 * - `estado` son las columnas que cambia quien tiene «Cambiar estado» o
 *   «Anular»; quien solo tiene «Editar» no las toca, y quien no tiene
 *   «Editar» solo cambia esas. Por defecto, `activo`.
 * - `soloCrear` son columnas que se fijan al crear y ya no se editan.
 * - `archivo`: columna con un adjunto (data URL de hasta 5 MB). No viaja en
 *   GET /api/datos ni en las respuestas de escritura: se pide aparte con
 *   GET /api/archivos/:coleccion/:id y exige alguna de sus `acciones` en
 *   alguno de sus `modulos` (por defecto, los de la coleccion). `tipos` son
 *   los formatos que acepta.
 */
const IMAGEN = 'image\\/(jpeg|png|webp)';

export const COLECCIONES = {
  clientes: {
    tabla: 'cliente', pk: 'id_cliente', modulos: ['Clientes'],
    campos: ['id_tipo_documento', 'pais', 'nombre', 'documento', 'telefono', 'correo', 'direccion', 'activo'],
  },
  proveedores: {
    tabla: 'proveedor', pk: 'id_proveedor', modulos: ['Proveedores'],
    campos: ['id_tipo_insumo', 'tipo_proveedor', 'nombre', 'telefono', 'pais', 'activo'],
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
    tabla: 'compra', pk: 'id_compra', modulos: ['Órdenes de pedido'],
    campos: ['id_proveedor', 'id_estado_compra', 'numero_factura', 'fecha', 'fecha_entrega', 'motivo_anulacion'],
    estado: ['id_estado_compra', 'motivo_anulacion'],
  },
  pedidos: {
    tabla: 'pedido', pk: 'id_pedido', modulos: ['Cotizaciones', 'Pedidos', 'Ventas'],
    campos: ['id_cliente', 'id_estado_pedido', 'id_vendedor', 'fecha_creacion', 'fecha_inicio', 'fecha_entrega', 'descripcion', 'ruta_imagen_diseno'],
    /* El cambio de etapa lleva su fecha (inicio o entrega). */
    estado: ['id_estado_pedido', 'fecha_inicio', 'fecha_entrega'],
    archivo: {
      columna: 'ruta_imagen_diseno', tipos: IMAGEN, modulos: ['Cotizaciones', 'Pedidos', 'Ventas', 'Abonos'],
      acciones: ['Ver diseño', 'Descargar diseño', 'Descargar cotización', 'Ver detalle'],
    },
  },
  abonos: {
    tabla: 'abono', pk: 'id_abono', modulos: ['Abonos'],
    campos: ['id_pedido', 'id_metodo_pago', 'monto', 'fecha', 'ruta_comprobante', 'anulado', 'motivo_anulacion'],
    estado: ['anulado', 'motivo_anulacion'],
    /* El monto de un abono registrado no cambia: un error se corrige
       anulandolo y registrandolo de nuevo. */
    soloCrear: ['id_pedido', 'monto'],
    archivo: {
      columna: 'ruta_comprobante', tipos: `(${IMAGEN}|application\\/pdf)`, modulos: ['Abonos', 'Cotizaciones', 'Pedidos', 'Ventas'],
      acciones: ['Ver comprobante', 'Descargar comprobante', 'Ver detalle'],
    },
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

/* Datos de Mi cuenta que cualquier usuario puede cambiar de si mismo. */
export const PERFIL = ['nombre_empleado', 'correo_empresarial', 'telefono'];

/* Acciones (privilegios) que exige cada operacion. */
export const AGREGAR = ['Agregar'];
export const EDITAR = ['Editar'];
export const CAMBIAR_ESTADO = ['Cambiar estado', 'Anular'];
export const ELIMINAR = ['Eliminar'];

/* Estados del pedido que ya son una venta: no se eliminan (018). */
export const ESTADOS_VENTA = ['Pedido completado', 'Pedido entregado / vendido'];
