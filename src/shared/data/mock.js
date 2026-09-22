/**
 * Datos de ejemplo (mock) — capa de presentacion sin backend.
 *
 * Cada coleccion replica las columnas de su tabla en la base de datos.
 * La clave primaria se guarda como `id` (equivale a id_categoria, id_producto,
 * id_cliente, etc.) porque es la que usan DataContext y DataTable para
 * identificar la fila; las llaves foraneas si conservan su nombre real
 * (id_categoria, id_rol, id_proveedor…).
 *
 * Los valores que la base de datos NO almacena porque se calculan a partir de
 * otras tablas (total de una compra, saldo de un pedido, numero de pedidos de
 * un cliente…) no viven aqui: DataContext los deriva y los expone con el
 * prefijo `calc_`.
 */

export const money = (n) =>
  'C$ ' + Number(n || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const shortMoney = (n) => {
  const v = Number(n || 0);
  if (v >= 1000000) return 'C$ ' + (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return 'C$ ' + (v / 1000).toFixed(1) + 'K';
  return 'C$ ' + v.toFixed(0);
};

export const fecha = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/** Fecha local en formato ISO (yyyy-mm-dd), sin el corrimiento a UTC de toISOString(). */
export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "Hoy" del sistema. Los datos semilla giran alrededor de esta fecha; al
    conectar la API basta con devolver toISO(new Date()). */
export const FECHA_SISTEMA = '2026-08-30';
export const hoyISO = () => FECHA_SISTEMA;

/** Fecha y hora de un timestamp ISO ("2026-08-30T14:22:10") -> "30/08/2026, 02:22 p.m." */
export const fechaHora = (iso) => {
  if (!iso) return '—';
  const [dia, h24 = ''] = iso.split('T');
  if (!h24) return fecha(dia);
  const [h, m] = h24.split(':');
  const hh = Number(h);
  const sufijo = hh < 12 ? 'a.m.' : 'p.m.';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${fecha(dia)}, ${String(h12).padStart(2, '0')}:${m} ${sufijo}`;
};

/** Solo la hora de un timestamp ISO. */
export const hora = (iso) => (iso && iso.includes('T') ? iso.split('T')[1].slice(0, 5) : '—');

/** Etiqueta legible de una fila, sea cual sea la tabla. */
export const etiquetaFila = (r) =>
  r?.nombre || r?.nombre_empleado || r?.nombre_usuario || (r?.id ? `#${r.id}` : '—');

/* --------------------------------------------------------------
   Listas de valores para columnas varchar sin tabla propia
   -------------------------------------------------------------- */
export const ESTADOS_PEDIDO = [
  'Cotización aprobada',
  'Pedido en proceso',
  'Completado - falta pago',
  'Pedido completado',
  'Entregado / vendido',
];

/** Un pedido anulado sale del flujo de trabajo: no es una etapa mas de la
 *  trazabilidad, por eso se declara aparte y la linea de tiempo del detalle
 *  sigue recorriendo unicamente ESTADOS_PEDIDO. */
export const PEDIDO_ANULADO = 'Anulado';
export const ESTADOS_PEDIDO_TODOS = [...ESTADOS_PEDIDO, PEDIDO_ANULADO];

export const ESTADOS_COMPRA = ['Recibida', 'En tránsito', 'Anulada'];
export const COMPRA_ANULADA = 'Anulada';
export const ESTADOS_REGISTRO = ['Activo', 'Inactivo'];
export const TIPOS_DOCUMENTO = ['Cédula', 'RUC', 'Pasaporte', 'Cédula de residencia'];
export const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque'];

/* --------------------------------------------------------------
   Historial de movimientos (tabla `movimientos`)
   -------------------------------------------------------------- */
/** Columna `accion`: la llenan los triggers AFTER INSERT/UPDATE/DELETE. */
export const ACCIONES_MOVIMIENTO = ['INSERT', 'UPDATE', 'DELETE'];

export const ETIQUETA_ACCION = {
  INSERT: 'Creación',
  UPDATE: 'Modificación',
  DELETE: 'Eliminación',
};

export const TONO_ACCION = { INSERT: 'success', UPDATE: 'warning', DELETE: 'error' };
export const ICONO_ACCION = { INSERT: 'plus', UPDATE: 'edit', DELETE: 'trash' };

/** Columna `tabla`: nombre real de la tabla auditada -> modulo del sistema. */
export const MODULOS_AUDITADOS = {
  categoria: 'Categorías',
  talla: 'Tallas',
  tipo_insumo: 'Tipos de insumo',
  unidad_medida: 'Unidades de medida',
  rol: 'Roles',
  permiso: 'Permisos',
  cliente: 'Clientes',
  proveedor: 'Proveedores',
  producto: 'Productos',
  insumo: 'Insumos',
  usuario: 'Usuarios',
  varianteproducto: 'Variantes de producto',
  compra: 'Compras',
  pedido: 'Pedidos',
  abono: 'Abonos',
};

/** Etiqueta legible de las columnas que aparecen en valor_anterior / valor_nuevo. */
export const ETIQUETA_CAMPO = {
  nombre: 'Nombre',
  descripcion: 'Descripción',
  precio: 'Precio',
  precio_unitario: 'Precio unitario',
  estado: 'Estado',
  stock: 'Existencias',
  cantidad: 'Cantidad',
  monto: 'Monto',
  fecha: 'Fecha',
  fecha_inicio: 'Fecha de inicio',
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
  metodo_pago: 'Método de pago',
  url_comprobante: 'Comprobante',
  url_imagen: 'Imagen',
  id_rol: 'Rol',
  id_categoria: 'Categoría',
  id_cliente: 'Cliente',
  id_proveedor: 'Proveedor',
  id_producto: 'Producto',
  id_talla: 'Talla',
  id_pedido: 'Pedido',
  id_insumo: 'Insumo',
  id_tipo_insumo: 'Tipo de insumo',
  id_unidad_medida: 'Unidad de medida',
  permisos: 'Permisos',
  detalles: 'Productos',
  insumos: 'Insumos',
};

/** La contrasena nunca se registra en el historial (nota del modelo de datos). */
export const CAMPOS_NO_AUDITADOS = ['contrasena'];

const textoValor = (v) =>
  v === undefined || v === null || v === '' ? '—' : Array.isArray(v) ? v.join(', ') : String(v);

/**
 * Compara valor_anterior contra valor_nuevo y devuelve solo las columnas que
 * cambiaron: [{ campo, etiqueta, antes, despues }].
 */
export const camposCambiados = (anterior, nuevo) => {
  const claves = [...new Set([...Object.keys(anterior || {}), ...Object.keys(nuevo || {})])].filter(
    (k) => !CAMPOS_NO_AUDITADOS.includes(k)
  );
  return claves
    .map((campo) => ({
      campo,
      etiqueta: ETIQUETA_CAMPO[campo] || campo,
      antes: textoValor(anterior?.[campo]),
      despues: textoValor(nuevo?.[campo]),
    }))
    .filter((c) => c.antes !== c.despues);
};

export const ESTADO_TONO = {
  Activo: 'success',
  Inactivo: 'neutral',
  Recibida: 'success',
  'En tránsito': 'info',
  Anulada: 'error',
  Anulado: 'error',
  'Cotización aprobada': 'info',
  'Pedido en proceso': 'warning',
  'Completado - falta pago': 'warning',
  'Pedido completado': 'info',
  'Entregado / vendido': 'success',
};

/** Color de los graficos del dashboard segun el metodo de pago del abono. */
export const COLOR_METODO_PAGO = {
  Efectivo: 'var(--success)',
  Transferencia: 'var(--info)',
  Tarjeta: 'var(--primary)',
  Cheque: 'var(--warning)',
};

/** Color de la dona del dashboard segun el tipo de insumo comprado. */
export const COLOR_TIPO_INSUMO = {
  Tela: 'var(--info)',
  Estampado: 'var(--success)',
  Accesorio: 'var(--warning)',
  Hilo: 'var(--primary)',
};

/** Umbral de presentacion: la tabla `insumo` no guarda stock minimo, asi que
 *  las alertas de inventario se calculan contra este valor fijo. */
export const UMBRAL_STOCK_BAJO = 20;

export const seed = {
  /* ---------- Catalogos ---------- */
  // Tabla: permiso (id_permiso, nombre)
  permisos: [
    { id: 1, nombre: 'Roles' },
    { id: 2, nombre: 'Usuarios' },
    { id: 3, nombre: 'Insumos' },
    { id: 4, nombre: 'Categorías' },
    { id: 5, nombre: 'Productos' },
    { id: 6, nombre: 'Proveedores' },
    { id: 7, nombre: 'Compras' },
    { id: 8, nombre: 'Clientes' },
    { id: 9, nombre: 'Pedidos' },
    { id: 10, nombre: 'Abonos' },
    { id: 11, nombre: 'Reportes' },
    { id: 12, nombre: 'Movimientos' },
  ],

  // Tabla: talla (id_talla, nombre)
  tallas: [
    { id: 1, nombre: 'XS' },
    { id: 2, nombre: 'S' },
    { id: 3, nombre: 'M' },
    { id: 4, nombre: 'L' },
    { id: 5, nombre: 'XL' },
    { id: 6, nombre: 'XXL' },
  ],

  // Tabla: tipo_insumo (id_tipo, nombre)
  tipos_insumo: [
    { id: 1, nombre: 'Tela' },
    { id: 2, nombre: 'Hilo' },
    { id: 3, nombre: 'Estampado' },
    { id: 4, nombre: 'Accesorio' },
  ],

  // Tabla: unidad_medida (id_unidad_medida, nombre, abreviatura)
  unidades_medida: [
    { id: 1, nombre: 'Metro', abreviatura: 'm' },
    { id: 2, nombre: 'Yarda', abreviatura: 'yd' },
    { id: 3, nombre: 'Unidad', abreviatura: 'u' },
    { id: 4, nombre: 'Rollo', abreviatura: 'rollo' },
    { id: 5, nombre: 'Kilogramo', abreviatura: 'kg' },
    { id: 6, nombre: 'Docena', abreviatura: 'doc' },
    { id: 7, nombre: 'Litro', abreviatura: 'L' },
  ],

  /* ---------- Configuracion ---------- */
  // Tabla: rol (id_rol, nombre) + rolxpermiso (id_rol, id_permiso)
  roles: [
    { id: 1, nombre: 'Administrador', permisos: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], estado: 'Activo' },
    { id: 2, nombre: 'Gerente', permisos: [7, 8, 9, 10, 11, 12], estado: 'Activo' },
    { id: 3, nombre: 'Vendedor', permisos: [5, 8, 9, 10], estado: 'Activo' },
    { id: 4, nombre: 'Almacenista', permisos: [3, 4, 6, 7], estado: 'Activo' },
    { id: 5, nombre: 'Operario de producción', permisos: [9], estado: 'Inactivo' },
  ],

  // Tabla: usuario
  usuarios: [
    { id: 1, id_rol: 1, nombre_usuario: 'dperez', contrasena: '123456', correo_empresarial: 'dperez@parceros.ni', nombre_empleado: 'Diana Pérez Molina', documento: '0011809900011A', telefono: '8992 0326', cargo: 'Administradora general', fecha_ingreso: '2023-02-06', estado: 'Activo' },
    { id: 2, id_rol: 2, nombre_usuario: 'lecheverri', contrasena: '123456', correo_empresarial: 'lecheverri@parceros.ni', nombre_empleado: 'Lina Echeverri González', documento: '0012207880022B', telefono: '8845 1120', cargo: 'Gerente comercial', fecha_ingreso: '2023-05-15', estado: 'Activo' },
    { id: 3, id_rol: 3, nombre_usuario: 'mgutierrez', contrasena: '123456', correo_empresarial: 'mgutierrez@parceros.ni', nombre_empleado: 'Marlon Gutiérrez Ruiz', documento: '0011504910033C', telefono: '8712 4409', cargo: 'Asesor de ventas', fecha_ingreso: '2024-01-08', estado: 'Activo' },
    { id: 4, id_rol: 3, nombre_usuario: 'scastillo', contrasena: '123456', correo_empresarial: 'scastillo@parceros.ni', nombre_empleado: 'Sofía Castillo Rivas', documento: '0010203950044D', telefono: '8630 7781', cargo: 'Asesora de ventas', fecha_ingreso: '2024-03-11', estado: 'Activo' },
    { id: 5, id_rol: 4, nombre_usuario: 'amendoza', contrasena: '123456', correo_empresarial: 'amendoza@parceros.ni', nombre_empleado: 'Alberto Mendoza Paz', documento: '0012811870055E', telefono: '8901 2233', cargo: 'Jefe de almacén', fecha_ingreso: '2023-08-21', estado: 'Activo' },
    { id: 6, id_rol: 4, nombre_usuario: 'kjiron', contrasena: '123456', correo_empresarial: 'kjiron@parceros.ni', nombre_empleado: 'Karla Jirón Soza', documento: '0010907930066F', telefono: '8455 6612', cargo: 'Auxiliar de almacén', fecha_ingreso: '2024-06-03', estado: 'Inactivo' },
    { id: 7, id_rol: 3, nombre_usuario: 'jherrera', contrasena: '123456', correo_empresarial: 'jherrera@parceros.ni', nombre_empleado: 'Julio Herrera Lacayo', documento: '0011712890077G', telefono: '8377 9010', cargo: 'Asesor de ventas', fecha_ingreso: '2025-02-17', estado: 'Activo' },
    { id: 8, id_rol: 1, nombre_usuario: 'asequeira', contrasena: '123456', correo_empresarial: 'asequeira@parceros.ni', nombre_empleado: 'Ana Sequeira Toruño', documento: '0010506920088H', telefono: '8288 4455', cargo: 'Administradora de sistemas', fecha_ingreso: '2023-11-02', estado: 'Activo' },
  ],

  /* ---------- Compras ---------- */
  // Tabla: insumo (id_insumo, nombre, id_tipo_insumo, id_unidad_medida, stock, precio_unitario)
  insumos: [
    { id: 1, nombre: 'Tela Dry-Fit', id_tipo_insumo: 1, id_unidad_medida: 2, stock: 278, precio_unitario: 145 },
    { id: 2, nombre: 'Tela Lycra', id_tipo_insumo: 1, id_unidad_medida: 2, stock: 130, precio_unitario: 180 },
    { id: 3, nombre: 'Tela Mesh deportiva', id_tipo_insumo: 1, id_unidad_medida: 2, stock: 0, precio_unitario: 165 },
    { id: 4, nombre: 'Tela Micro-perforada', id_tipo_insumo: 1, id_unidad_medida: 2, stock: 64, precio_unitario: 190 },
    { id: 5, nombre: 'Hilo poliéster', id_tipo_insumo: 2, id_unidad_medida: 4, stock: 92, precio_unitario: 65 },
    { id: 6, nombre: 'Vinil textil', id_tipo_insumo: 3, id_unidad_medida: 1, stock: 14, precio_unitario: 210 },
    { id: 7, nombre: 'Tinta sublimación', id_tipo_insumo: 3, id_unidad_medida: 3, stock: 46, precio_unitario: 320 },
    { id: 8, nombre: 'Botones metálicos', id_tipo_insumo: 4, id_unidad_medida: 6, stock: 310, precio_unitario: 40 },
    { id: 9, nombre: 'Cierre nylon 20cm', id_tipo_insumo: 4, id_unidad_medida: 3, stock: 8, precio_unitario: 22 },
    { id: 10, nombre: 'Elástico 3cm', id_tipo_insumo: 4, id_unidad_medida: 1, stock: 175, precio_unitario: 18 },
    { id: 11, nombre: 'Escudos bordados', id_tipo_insumo: 4, id_unidad_medida: 6, stock: 88, precio_unitario: 55 },
    { id: 13, nombre: 'Tinta textil negra', id_tipo_insumo: 3, id_unidad_medida: 7, stock: 24, precio_unitario: 380 },
    { id: 14, nombre: 'Tinta textil roja', id_tipo_insumo: 3, id_unidad_medida: 7, stock: 18, precio_unitario: 395 },
  ],

  // Tabla: categoria (id_categoria, nombre)
  categorias: [
    { id: 1, nombre: 'Uniformes deportivos' },
    { id: 2, nombre: 'Uniformes de ciclismo' },
    { id: 3, nombre: 'Uniformes de baloncesto' },
    { id: 4, nombre: 'Chaquetas deportivas' },
    { id: 5, nombre: 'Accesorios' },
    { id: 6, nombre: 'Jerseys con patrocinador' },
  ],

  // Tabla: producto (id_producto, id_categoria, nombre, descripcion, precio, estado)
  productos: [
    { id: 1, id_categoria: 1, nombre: 'Camiseta deportiva sublimada', descripcion: 'Camiseta en tela Dry-Fit con sublimación full color.', precio: 420 },
    { id: 2, id_categoria: 1, nombre: 'Short deportivo Dry-Fit', descripcion: 'Short liviano con pretina elástica y cordón ajustable.', precio: 310 },
    { id: 3, id_categoria: 2, nombre: 'Jersey de ciclismo manga larga', descripcion: 'Jersey con cierre completo y tela transpirable.', precio: 560 },
    { id: 4, id_categoria: 2, nombre: 'Licra de ciclismo con badana', descripcion: 'Licra con badana acolchada y bandas de silicona.', precio: 480 },
    { id: 5, id_categoria: 4, nombre: 'Chaqueta cortaviento', descripcion: 'Chaqueta impermeable con forro interno y capucha.', precio: 950 },
    { id: 6, id_categoria: 3, nombre: 'Uniforme de baloncesto completo', descripcion: 'Camiseta sin mangas y short según el diseño del equipo.', precio: 780 },
    { id: 7, id_categoria: 5, nombre: 'Gorra personalizada', descripcion: 'Gorra de seis paneles con bordado frontal.', precio: 195 },
    { id: 8, id_categoria: 1, nombre: 'Medias deportivas altas', descripcion: 'Medias de compresión con franjas del equipo.', precio: 130 },
    { id: 9, id_categoria: 1, nombre: 'Sudadera deportiva', descripcion: 'Sudadera de algodón perchado con estampado.', precio: 690 },
    { id: 10, id_categoria: 5, nombre: 'Bolso deportivo', descripcion: 'Bolso de lona reforzada con compartimento para calzado.', precio: 640 },
    { id: 11, id_categoria: 2, nombre: 'Enterizo de ciclismo', descripcion: 'Enterizo sublimado de una pieza con badana.', precio: 520 },
  ],

  // Tabla: varianteproducto (id_varianteproducto, id_producto, id_talla, url_imagen, stock)
  variantes: [
    { id: 1, id_producto: 1, id_talla: 2, url_imagen: '', stock: 12 },
    { id: 2, id_producto: 1, id_talla: 3, url_imagen: '', stock: 15 },
    { id: 3, id_producto: 1, id_talla: 4, url_imagen: '', stock: 10 },
    { id: 4, id_producto: 1, id_talla: 5, url_imagen: '', stock: 8 },
    { id: 5, id_producto: 2, id_talla: 2, url_imagen: '', stock: 20 },
    { id: 6, id_producto: 2, id_talla: 3, url_imagen: '', stock: 22 },
    { id: 7, id_producto: 2, id_talla: 4, url_imagen: '', stock: 18 },
    { id: 8, id_producto: 3, id_talla: 3, url_imagen: '', stock: 7 },
    { id: 9, id_producto: 3, id_talla: 4, url_imagen: '', stock: 9 },
    { id: 10, id_producto: 3, id_talla: 5, url_imagen: '', stock: 8 },
    { id: 11, id_producto: 3, id_talla: 6, url_imagen: '', stock: 4 },
    { id: 12, id_producto: 4, id_talla: 2, url_imagen: '', stock: 14 },
    { id: 13, id_producto: 4, id_talla: 3, url_imagen: '', stock: 16 },
    { id: 14, id_producto: 4, id_talla: 4, url_imagen: '', stock: 12 },
    { id: 15, id_producto: 4, id_talla: 5, url_imagen: '', stock: 10 },
    { id: 16, id_producto: 5, id_talla: 3, url_imagen: '', stock: 4 },
    { id: 17, id_producto: 5, id_talla: 4, url_imagen: '', stock: 5 },
    { id: 18, id_producto: 5, id_talla: 5, url_imagen: '', stock: 3 },
    { id: 19, id_producto: 6, id_talla: 1, url_imagen: '', stock: 8 },
    { id: 20, id_producto: 6, id_talla: 2, url_imagen: '', stock: 10 },
    { id: 21, id_producto: 6, id_talla: 3, url_imagen: '', stock: 9 },
    { id: 22, id_producto: 6, id_talla: 4, url_imagen: '', stock: 7 },
    { id: 23, id_producto: 7, id_talla: 3, url_imagen: '', stock: 90 },
    { id: 24, id_producto: 8, id_talla: 2, url_imagen: '', stock: 46 },
    { id: 25, id_producto: 8, id_talla: 3, url_imagen: '', stock: 50 },
    { id: 26, id_producto: 8, id_talla: 4, url_imagen: '', stock: 44 },
    { id: 27, id_producto: 9, id_talla: 3, url_imagen: '', stock: 6 },
    { id: 28, id_producto: 9, id_talla: 4, url_imagen: '', stock: 7 },
    { id: 29, id_producto: 9, id_talla: 5, url_imagen: '', stock: 5 },
    { id: 30, id_producto: 10, id_talla: 3, url_imagen: '', stock: 7 },
    { id: 31, id_producto: 11, id_talla: 2, url_imagen: '', stock: 9 },
    { id: 32, id_producto: 11, id_talla: 3, url_imagen: '', stock: 12 },
    { id: 33, id_producto: 11, id_talla: 4, url_imagen: '', stock: 11 },
    { id: 34, id_producto: 11, id_talla: 5, url_imagen: '', stock: 9 },
  ],

  // Tabla: proveedor
  proveedores: [
    { id: 1, nombre: 'Textiles Nicaragua S.A', nombrepersonacontacto: 'Roberto Solís', id_tipo_insumo: 1, telefono: '2278 4410', correo: 'ventas@textilesni.com', direccion: 'Km 8 Carretera Norte, Managua', nit: 'J0310000451' },
    { id: 2, nombre: 'Distribuidora El Cosido', nombrepersonacontacto: 'Marta Aguilar', id_tipo_insumo: 2, telefono: '2255 9032', correo: 'contacto@elcosido.ni', direccion: 'Mercado Oriental, Módulo 22', nit: 'J0310000672' },
    { id: 3, nombre: 'Impresiones Managua', nombrepersonacontacto: 'Jorge Núñez', id_tipo_insumo: 3, telefono: '2299 1187', correo: 'info@impresionesmga.com', direccion: 'Bolonia, de la Rotonda 2c al sur', nit: 'J0310000893' },
    { id: 4, nombre: 'Accesorios del Norte', nombrepersonacontacto: 'Elena Vílchez', id_tipo_insumo: 4, telefono: '2712 3345', correo: 'ventas@accnorte.ni', direccion: 'Estelí, Barrio El Calvario', nit: 'J0310001014' },
    { id: 5, nombre: 'Bordados Estelí', nombrepersonacontacto: 'Luis Zamora', id_tipo_insumo: 4, telefono: '2713 8890', correo: 'bordados.esteli@gmail.com', direccion: 'Estelí, Av. Central', nit: 'J0310001235' },
    { id: 6, nombre: 'Confecciones del Sur', nombrepersonacontacto: 'Ada Miranda', id_tipo_insumo: 1, telefono: '2552 4471', correo: 'confeccionessur@ni.com', direccion: 'Rivas, Barrio San Francisco', nit: 'J0310001456' },
  ],

  /* Tabla: compra (id_compra, id_proveedor, fecha, estado)
     Las lineas replican detalle_compra_insumo y detalle_compra_producto. */
  compras: [
    { id: 1, id_proveedor: 1, fecha: '2026-08-28', estado: 'Recibida', detalle_insumos: [{ id_insumo: 1, cantidad: 120, precio_unitario: 145 }, { id_insumo: 2, cantidad: 40, precio_unitario: 180 }], detalle_productos: [] },
    { id: 2, id_proveedor: 3, fecha: '2026-08-25', estado: 'Recibida', detalle_insumos: [{ id_insumo: 6, cantidad: 25, precio_unitario: 210 }], detalle_productos: [] },
    { id: 3, id_proveedor: 2, fecha: '2026-08-21', estado: 'Recibida', detalle_insumos: [{ id_insumo: 5, cantidad: 60, precio_unitario: 65 }, { id_insumo: 10, cantidad: 100, precio_unitario: 18 }], detalle_productos: [] },
    { id: 4, id_proveedor: 4, fecha: '2026-08-18', estado: 'En tránsito', detalle_insumos: [{ id_insumo: 9, cantidad: 150, precio_unitario: 22 }], detalle_productos: [] },
    { id: 5, id_proveedor: 1, fecha: '2026-08-14', estado: 'Recibida', detalle_insumos: [{ id_insumo: 4, cantidad: 80, precio_unitario: 190 }], detalle_productos: [] },
    { id: 6, id_proveedor: 5, fecha: '2026-08-09', estado: 'Recibida', detalle_insumos: [{ id_insumo: 11, cantidad: 40, precio_unitario: 55 }], detalle_productos: [] },
    { id: 7, id_proveedor: 3, fecha: '2026-08-04', estado: 'Anulada', detalle_insumos: [{ id_insumo: 7, cantidad: 12, precio_unitario: 320 }], detalle_productos: [] },
    { id: 8, id_proveedor: 2, fecha: '2026-07-30', estado: 'Recibida', detalle_insumos: [{ id_insumo: 5, cantidad: 45, precio_unitario: 65 }], detalle_productos: [] },
    { id: 9, id_proveedor: 6, fecha: '2026-07-24', estado: 'Recibida', detalle_insumos: [{ id_insumo: 1, cantidad: 90, precio_unitario: 145 }], detalle_productos: [{ id_varianteproducto: 23, cantidad: 40, precio_unitario: 120 }] },
    { id: 10, id_proveedor: 4, fecha: '2026-07-18', estado: 'Recibida', detalle_insumos: [{ id_insumo: 8, cantidad: 200, precio_unitario: 40 }], detalle_productos: [] },
  ],

  /* ---------- Ventas ---------- */
  // Tabla: cliente
  clientes: [
    { id: 1, nombre: 'Club Deportivo Los Andes', tipodocumento: 'RUC', documento: 'J0310000123', telefono: '8712 3344', correo: 'losandes@club.ni', direccion: 'Managua, Villa Fontana' },
    { id: 2, nombre: 'Club de Ciclismo Pedal Nica', tipodocumento: 'RUC', documento: 'J0310000455', telefono: '2277 9911', correo: 'directiva@pedalnica.ni', direccion: 'Managua, Altamira' },
    { id: 3, nombre: 'Liga Municipal de Baloncesto Masaya', tipodocumento: 'RUC', documento: 'J0310000788', telefono: '2255 3321', correo: 'liga@basketmasaya.ni', direccion: 'Masaya, Centro' },
    { id: 4, nombre: 'Marcia Ortega Bermúdez', tipodocumento: 'Cédula', documento: '0012509880012B', telefono: '8877 1290', correo: 'marcia.ortega@gmail.com', direccion: 'Granada, Calle La Calzada' },
    { id: 5, nombre: 'Tigres de Rivas Béisbol Club', tipodocumento: 'RUC', documento: 'J0310000992', telefono: '2552 7788', correo: 'tigres@beisbolrivas.ni', direccion: 'Rivas, Barrio Central' },
    { id: 6, nombre: 'Academia FC Juvenil', tipodocumento: 'RUC', documento: 'J0310001177', telefono: '8990 4412', correo: 'fcjuvenil@correo.ni', direccion: 'León, Sutiaba' },
    { id: 7, nombre: 'Liga de Béisbol Carretera Sur', tipodocumento: 'RUC', documento: 'J0310001344', telefono: '2266 5510', correo: 'directiva@beisbolcsur.ni', direccion: 'Managua, Carretera Sur' },
    { id: 8, nombre: 'Danilo Espinoza Cruz', tipodocumento: 'Cédula', documento: '0011806770018C', telefono: '8433 2277', correo: 'danilo.espinoza@gmail.com', direccion: 'Estelí, Barrio Milenio' },
    { id: 9, nombre: 'Liga de Softbol Femenino Estelí', tipodocumento: 'RUC', documento: 'J0310001566', telefono: '2713 4402', correo: 'softbolfem@ligaesteli.ni', direccion: 'Estelí, Km 3 Carretera Panamericana' },
  ],

  /* Tabla: pedido (id_pedido, id_cliente, estado, fecha_inicio, descripcion)
     `detalles` replica detalle_pedido (productos base) e `insumos` replica
     detalle_pedido_insumo (materiales que se gastan en la personalizacion). */
  pedidos: [
    { id: 1, id_cliente: 6, estado: 'Pedido en proceso', fecha_inicio: '2026-08-30', detalles: [{ id_varianteproducto: 2, cantidad: 25, precio_unitario: 420, subtotal: 10500 }, { id_varianteproducto: 6, cantidad: 25, precio_unitario: 310, subtotal: 7750 }], descripcion: 'Escudo de la academia sublimado en el pecho, nombre y número en la espalda, franjas rojas en las mangas.', insumos: [{ id_insumo: 7, cantidad: 2, precio_unitario: 320, subtotal: 640 }, { id_insumo: 14, cantidad: 1.5, precio_unitario: 395, subtotal: 592.5 }, { id_insumo: 11, cantidad: 5, precio_unitario: 55, subtotal: 275 }] },
    { id: 2, id_cliente: 2, estado: 'Pedido en proceso', fecha_inicio: '2026-08-27', detalles: [{ id_varianteproducto: 21, cantidad: 40, precio_unitario: 780, subtotal: 31200 }], descripcion: 'Jersey y licra sublimados con el diseño del club; logos de patrocinadores en la espalda.', insumos: [{ id_insumo: 7, cantidad: 3, precio_unitario: 320, subtotal: 960 }, { id_insumo: 13, cantidad: 2, precio_unitario: 380, subtotal: 760 }] },
    { id: 3, id_cliente: 5, estado: 'Pedido completado', fecha_inicio: '2026-08-24', detalles: [{ id_varianteproducto: 13, cantidad: 18, precio_unitario: 480, subtotal: 8640 }], descripcion: 'Nombre del equipo en letras bordadas al frente y número en la espalda.', insumos: [] },
    { id: 4, id_cliente: 1, estado: 'Entregado / vendido', fecha_inicio: '2026-08-20', detalles: [{ id_varianteproducto: 3, cantidad: 30, precio_unitario: 420, subtotal: 12600 }, { id_varianteproducto: 25, cantidad: 30, precio_unitario: 130, subtotal: 3900 }], descripcion: 'Camisetas y medias con los colores del club; número sublimado en camiseta y short.', insumos: [] },
    { id: 5, id_cliente: 3, estado: 'Completado - falta pago', fecha_inicio: '2026-08-18', detalles: [{ id_varianteproducto: 9, cantidad: 12, precio_unitario: 560, subtotal: 6720 }], descripcion: 'Camiseta sin mangas y short en mesh, con número y logo de la liga.', insumos: [] },
    { id: 6, id_cliente: 9, estado: 'Cotización aprobada', fecha_inicio: '2026-08-15', detalles: [{ id_varianteproducto: 32, cantidad: 22, precio_unitario: 520, subtotal: 11440 }], descripcion: 'Camisola entallada con nombre y número sublimados en negro y rojo; botones metálicos al frente.', insumos: [{ id_insumo: 13, cantidad: 2, precio_unitario: 380, subtotal: 760 }, { id_insumo: 14, cantidad: 2, precio_unitario: 395, subtotal: 790 }, { id_insumo: 8, cantidad: 3, precio_unitario: 40, subtotal: 120 }] },
    { id: 7, id_cliente: 4, estado: 'Entregado / vendido', fecha_inicio: '2026-08-11', detalles: [{ id_varianteproducto: 17, cantidad: 4, precio_unitario: 950, subtotal: 3800 }], descripcion: 'Chaquetas con el nombre bordado en el pecho.', insumos: [] },
    { id: 8, id_cliente: 6, estado: 'Entregado / vendido', fecha_inicio: '2026-08-06', detalles: [{ id_varianteproducto: 28, cantidad: 15, precio_unitario: 690, subtotal: 10350 }], descripcion: 'Sudaderas con el escudo estampado en el pecho y el nombre de la academia en la pierna.', insumos: [] },
    { id: 9, id_cliente: 8, estado: 'Completado - falta pago', fecha_inicio: '2026-08-02', detalles: [{ id_varianteproducto: 23, cantidad: 50, precio_unitario: 195, subtotal: 9750 }], descripcion: 'Gorras con el logo del equipo bordado al frente.', insumos: [] },
    { id: 10, id_cliente: 1, estado: 'Entregado / vendido', fecha_inicio: '2026-07-28', detalles: [{ id_varianteproducto: 7, cantidad: 28, precio_unitario: 310, subtotal: 8680 }], descripcion: 'Shorts con número sublimado en la pierna izquierda.', insumos: [] },
    { id: 11, id_cliente: 2, estado: 'Entregado / vendido', fecha_inicio: '2026-07-22', detalles: [{ id_varianteproducto: 22, cantidad: 26, precio_unitario: 780, subtotal: 20280 }], descripcion: 'Jersey de ciclismo con el diseño del club y banderas de Nicaragua en las mangas.', insumos: [] },
    { id: 12, id_cliente: 7, estado: 'Completado - falta pago', fecha_inicio: '2026-07-15', detalles: [{ id_varianteproducto: 14, cantidad: 10, precio_unitario: 480, subtotal: 4800 }], descripcion: 'Camisolas con el escudo de la liga bordado y número en la espalda.', insumos: [] },
  ],

  // Tabla: abono (id_abono, id_pedido, monto, fecha, metodo_pago, url_comprobante)
  abonos: [
    { id: 1, id_pedido: 1, monto: 9125, fecha: '2026-08-30', metodo_pago: 'Transferencia', url_comprobante: 'https://comprobantes.parceros.ni/ab-0231.pdf' },
    { id: 2, id_pedido: 2, monto: 15600, fecha: '2026-08-27', metodo_pago: 'Efectivo', url_comprobante: '' },
    { id: 3, id_pedido: 3, monto: 4320, fecha: '2026-08-26', metodo_pago: 'Transferencia', url_comprobante: 'https://comprobantes.parceros.ni/ab-0229.pdf' },
    { id: 4, id_pedido: 3, monto: 4320, fecha: '2026-08-24', metodo_pago: 'Efectivo', url_comprobante: '' },
    { id: 5, id_pedido: 4, monto: 16500, fecha: '2026-08-29', metodo_pago: 'Tarjeta', url_comprobante: 'https://comprobantes.parceros.ni/ab-0227.pdf' },
    { id: 6, id_pedido: 5, monto: 3360, fecha: '2026-08-18', metodo_pago: 'Efectivo', url_comprobante: '' },
    { id: 7, id_pedido: 7, monto: 3800, fecha: '2026-08-20', metodo_pago: 'Transferencia', url_comprobante: 'https://comprobantes.parceros.ni/ab-0224.pdf' },
    { id: 8, id_pedido: 8, monto: 10350, fecha: '2026-08-08', metodo_pago: 'Transferencia', url_comprobante: '' },
    { id: 9, id_pedido: 9, monto: 4875, fecha: '2026-08-02', metodo_pago: 'Efectivo', url_comprobante: '' },
    { id: 10, id_pedido: 10, monto: 8680, fecha: '2026-08-10', metodo_pago: 'Transferencia', url_comprobante: '' },
    { id: 11, id_pedido: 11, monto: 20280, fecha: '2026-07-26', metodo_pago: 'Cheque', url_comprobante: '' },
    { id: 12, id_pedido: 12, monto: 2400, fecha: '2026-07-15', metodo_pago: 'Efectivo', url_comprobante: '' },
  ],

  // Tabla: fichatecnica (id_fichatecnica, id_insumo, id_varianteproducto, cantidad, fecha, costo_total)
  fichas_tecnicas: [
    { id: 1, id_insumo: 1, id_varianteproducto: 2, cantidad: 1.2, fecha: '2026-06-10', costo_total: 174 },
    { id: 2, id_insumo: 5, id_varianteproducto: 2, cantidad: 0.2, fecha: '2026-06-10', costo_total: 13 },
    { id: 3, id_insumo: 1, id_varianteproducto: 6, cantidad: 0.9, fecha: '2026-06-12', costo_total: 130.5 },
    { id: 4, id_insumo: 10, id_varianteproducto: 6, cantidad: 1, fecha: '2026-06-12', costo_total: 18 },
    { id: 5, id_insumo: 2, id_varianteproducto: 13, cantidad: 1.4, fecha: '2026-06-18', costo_total: 252 },
    { id: 6, id_insumo: 11, id_varianteproducto: 13, cantidad: 0.1, fecha: '2026-06-18', costo_total: 5.5 },
  ],

  /* ---------- Historial ----------
     Tabla: movimientos (id_movimiento, tabla, id_registro, accion,
     valor_anterior, valor_nuevo, id_usuario, fecha_cambio).
     La llenan los triggers AFTER INSERT/UPDATE/DELETE de cada modulo, por eso
     desde la interfaz solo se consulta: no se crea, edita ni elimina. */
  movimientos: [
    { id: 1, tabla: 'pedido', id_registro: 1, accion: 'UPDATE', valor_anterior: { id_cliente: 6, estado: 'Cotización aprobada', fecha_inicio: '2026-08-30' }, valor_nuevo: { id_cliente: 6, estado: 'Pedido en proceso', fecha_inicio: '2026-08-30' }, id_usuario: 3, fecha_cambio: '2026-08-31T09:14:22' },
    { id: 2, tabla: 'abono', id_registro: 1, accion: 'INSERT', valor_anterior: null, valor_nuevo: { id_pedido: 1, monto: 9125, fecha: '2026-08-30', metodo_pago: 'Transferencia', url_comprobante: 'https://comprobantes.parceros.ni/ab-0231.pdf' }, id_usuario: 3, fecha_cambio: '2026-08-30T16:48:05' },
    { id: 3, tabla: 'insumo', id_registro: 3, accion: 'UPDATE', valor_anterior: { nombre: 'Tela Mesh deportiva', id_tipo_insumo: 1, id_unidad_medida: 2, stock: 35, precio_unitario: 165 }, valor_nuevo: { nombre: 'Tela Mesh deportiva', id_tipo_insumo: 1, id_unidad_medida: 2, stock: 0, precio_unitario: 165 }, id_usuario: 5, fecha_cambio: '2026-08-30T11:02:41' },
    { id: 4, tabla: 'usuario', id_registro: 6, accion: 'UPDATE', valor_anterior: { nombre_empleado: 'Karla Jirón Soza', cargo: 'Auxiliar de almacén', id_rol: 4, estado: 'Activo' }, valor_nuevo: { nombre_empleado: 'Karla Jirón Soza', cargo: 'Auxiliar de almacén', id_rol: 4, estado: 'Inactivo' }, id_usuario: 1, fecha_cambio: '2026-08-29T15:33:18' },
    { id: 5, tabla: 'compra', id_registro: 7, accion: 'UPDATE', valor_anterior: { id_proveedor: 3, fecha: '2026-08-04', estado: 'En tránsito' }, valor_nuevo: { id_proveedor: 3, fecha: '2026-08-04', estado: 'Anulada' }, id_usuario: 5, fecha_cambio: '2026-08-29T10:20:57' },
    { id: 6, tabla: 'producto', id_registro: 10, accion: 'UPDATE', valor_anterior: { id_categoria: 5, nombre: 'Bolso deportivo', precio: 590 }, valor_nuevo: { id_categoria: 5, nombre: 'Bolso deportivo', precio: 640 }, id_usuario: 2, fecha_cambio: '2026-08-28T17:05:09' },
    { id: 7, tabla: 'cliente', id_registro: 9, accion: 'INSERT', valor_anterior: null, valor_nuevo: { nombre: 'Cooperativa Agro Norte', tipodocumento: 'RUC', documento: 'J0310001566', telefono: '2713 4402', correo: 'agronorte@coop.ni', direccion: 'Estelí, Km 3 Carretera Panamericana' }, id_usuario: 4, fecha_cambio: '2026-08-28T08:41:30' },
    { id: 8, tabla: 'proveedor', id_registro: 2, accion: 'UPDATE', valor_anterior: { nombre: 'Distribuidora El Cosido', nombrepersonacontacto: 'Marta Aguilar', telefono: '2255 1100', correo: 'contacto@elcosido.ni' }, valor_nuevo: { nombre: 'Distribuidora El Cosido', nombrepersonacontacto: 'Marta Aguilar', telefono: '2255 9032', correo: 'contacto@elcosido.ni' }, id_usuario: 5, fecha_cambio: '2026-08-27T14:12:44' },
    { id: 9, tabla: 'rol', id_registro: 3, accion: 'UPDATE', valor_anterior: { nombre: 'Vendedor', permisos: [5, 8, 9] }, valor_nuevo: { nombre: 'Vendedor', permisos: [5, 8, 9, 10] }, id_usuario: 1, fecha_cambio: '2026-08-26T09:57:12' },
    { id: 10, tabla: 'categoria', id_registro: 6, accion: 'INSERT', valor_anterior: null, valor_nuevo: { nombre: 'Entrenamiento y calentamiento' }, id_usuario: 2, fecha_cambio: '2026-08-25T11:30:02' },
    { id: 11, tabla: 'varianteproducto', id_registro: 34, accion: 'UPDATE', valor_anterior: { id_producto: 11, id_talla: 5, stock: 4 }, valor_nuevo: { id_producto: 11, id_talla: 5, stock: 9 }, id_usuario: 6, fecha_cambio: '2026-08-24T16:19:38' },
    { id: 12, tabla: 'pedido', id_registro: 3, accion: 'UPDATE', valor_anterior: { id_cliente: 5, estado: 'Completado - falta pago', fecha_inicio: '2026-08-24' }, valor_nuevo: { id_cliente: 5, estado: 'Pedido completado', fecha_inicio: '2026-08-24' }, id_usuario: 4, fecha_cambio: '2026-08-24T13:44:51' },
    { id: 13, tabla: 'insumo', id_registro: 12, accion: 'DELETE', valor_anterior: { nombre: 'Cinta reflectiva', id_tipo_insumo: 4, id_unidad_medida: 1, stock: 0, precio_unitario: 75 }, valor_nuevo: null, id_usuario: 5, fecha_cambio: '2026-08-22T10:08:27' },
    { id: 14, tabla: 'usuario', id_registro: 7, accion: 'INSERT', valor_anterior: null, valor_nuevo: { id_rol: 3, nombre_usuario: 'jherrera', correo_empresarial: 'jherrera@parceros.ni', nombre_empleado: 'Julio Herrera Lacayo', documento: '0011712890077G', telefono: '8377 9010', cargo: 'Asesor de ventas', fecha_ingreso: '2025-02-17', estado: 'Activo' }, id_usuario: 1, fecha_cambio: '2026-08-21T08:25:14' },
    { id: 15, tabla: 'compra', id_registro: 4, accion: 'INSERT', valor_anterior: null, valor_nuevo: { id_proveedor: 4, fecha: '2026-08-18', estado: 'En tránsito' }, id_usuario: 5, fecha_cambio: '2026-08-18T09:36:40' },
    { id: 16, tabla: 'cliente', id_registro: 3, accion: 'UPDATE', valor_anterior: { nombre: 'Liga Municipal de Baloncesto Masaya', telefono: '2255 3321', correo: 'liga@basketmasaya.ni', direccion: 'Masaya, Barrio San Jerónimo' }, valor_nuevo: { nombre: 'Liga Municipal de Baloncesto Masaya', telefono: '2255 3321', correo: 'liga@basketmasaya.ni', direccion: 'Masaya, Centro' }, id_usuario: 7, fecha_cambio: '2026-08-17T15:51:06' },
    { id: 17, tabla: 'abono', id_registro: 12, accion: 'INSERT', valor_anterior: null, valor_nuevo: { id_pedido: 12, monto: 2400, fecha: '2026-07-15', metodo_pago: 'Efectivo', url_comprobante: '' }, id_usuario: 4, fecha_cambio: '2026-07-15T12:03:55' },
    { id: 18, tabla: 'producto', id_registro: 11, accion: 'INSERT', valor_anterior: null, valor_nuevo: { id_categoria: 2, nombre: 'Enterizo de ciclismo', descripcion: 'Enterizo sublimado de una pieza con badana.', precio: 520 }, id_usuario: 2, fecha_cambio: '2026-07-10T10:47:33' },
  ],
};
