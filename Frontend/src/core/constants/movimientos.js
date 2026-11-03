/* Historial de movimientos (tabla `movimientos`). */

/** Columna `accion`: INSERT/UPDATE/DELETE los llenan los triggers de cada
 *  tabla; LOGIN, LOGIN_FALLIDO y LOGOUT son la trazabilidad de los accesos. */
export const ACCIONES_MOVIMIENTO = ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGIN_FALLIDO', 'LOGOUT'];

export const ETIQUETA_ACCION = {
  INSERT: 'Creación',
  UPDATE: 'Modificación',
  DELETE: 'Eliminación',
  LOGIN: 'Inicio de sesión',
  LOGIN_FALLIDO: 'Intento fallido',
  LOGOUT: 'Cierre de sesión',
};

export const TONO_ACCION = { INSERT: 'success', UPDATE: 'warning', DELETE: 'error', LOGIN: 'info', LOGIN_FALLIDO: 'error', LOGOUT: 'neutral' };
export const ICONO_ACCION = { INSERT: 'plus', UPDATE: 'edit', DELETE: 'trash', LOGIN: 'logout', LOGIN_FALLIDO: 'lock', LOGOUT: 'logout' };

/** Columna `tabla`: nombre real de la tabla auditada -> modulo del sistema. */
export const MODULOS_AUDITADOS = {
  tipo_insumo: 'Categorías de insumo',
  unidad_medida: 'Unidades de medida',
  rol: 'Roles',
  permiso: 'Permisos',
  cliente: 'Clientes',
  proveedor: 'Proveedores',
  insumo: 'Insumos',
  usuario: 'Usuarios',
  compra: 'Compras',
  pedido: 'Pedidos',
  abono: 'Abonos',
  categoria_producto: 'Categorías de producto',
  producto: 'Productos',
  acceso: 'Accesos',
};

/** Etiqueta legible de las columnas que aparecen en valor_anterior / valor_nuevo. */
export const ETIQUETA_CAMPO = {
  nombre: 'Nombre',
  descripcion: 'Descripción',
  precio_unitario: 'Precio unitario',
  estado: 'Estado',
  stock: 'Existencias',
  stock_minimo: 'Existencias mínimas',
  cantidad: 'Cantidad',
  monto: 'Monto',
  fecha: 'Fecha',
  fecha_creacion: 'Fecha de creación',
  fecha_inicio: 'Fecha de inicio',
  fecha_entrega: 'Fecha de entrega',
  fecha_ingreso: 'Fecha de ingreso',
  telefono: 'Teléfono',
  correo: 'Correo',
  correo_empresarial: 'Correo empresarial',
  direccion: 'Dirección',
  documento: 'Documento',
  tipodocumento: 'Tipo de documento',
  nit: 'NIT',
  cargo: 'Cargo',
  nombre_empleado: 'Nombre del empleado',
  nombre_usuario: 'Nombre de usuario',
  nombrepersonacontacto: 'Persona de contacto',
  telefono_contacto: 'Teléfono del contacto',
  correo_contacto: 'Correo del contacto',
  metodo_pago: 'Método de pago',
  url_comprobante: 'Comprobante',
  imagen_diseno: 'Imagen del diseño',
  id_rol: 'Rol',
  id_cliente: 'Cliente',
  id_proveedor: 'Proveedor',
  id_pedido: 'Pedido',
  id_insumo: 'Insumo',
  id_tipo_insumo: 'Categoría de insumo',
  defectuosas: 'Prendas defectuosas',
  id_unidad_medida: 'Unidad de medida',
  permisos: 'Permisos',
  privilegios: 'Privilegios',
  insumos: 'Insumos de personalización',
  insumos_receta: 'Insumos de receta',
  productos: 'Productos',
  receta: 'Receta',
  precio_venta: 'Precio de venta',
  id_talla: 'Talla',
  id_insumo_tela: 'Tela',
  id_categoria_producto: 'Categoría',
  id_producto: 'Producto',
  detalle_insumos: 'Insumos adquiridos',
  resultado: 'Resultado',
};

/** Columnas que nunca se registran en el historial: la contrasena (nota del
 *  modelo de datos) y el seguimiento interno de etapas del pedido. */
export const CAMPOS_NO_AUDITADOS = ['contrasena', 'historial_estados'];
