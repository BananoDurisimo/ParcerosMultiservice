/**
 * Datos de ejemplo (mock) — capa de presentacion sin backend.
 *
 * Cada coleccion replica las columnas de su tabla en la base de datos.
 * La clave primaria se guarda como `id` (equivale a id_rol, id_insumo,
 * id_cliente, etc.) porque es la que usan DataContext y DataTable para
 * identificar la fila; las llaves foraneas si conservan su nombre real
 * (id_rol, id_proveedor, id_cliente…).
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

const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** "2026-08" -> "Agosto 2026". */
export const mes = (periodo) => {
  if (!periodo) return '—';
  const [y, m] = periodo.split('-');
  return `${MESES_LARGOS[Number(m) - 1] || '—'} ${y}`;
};

/** Fecha local en formato ISO (yyyy-mm-dd), sin el corrimiento a UTC de toISOString(). */
export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "Hoy" del sistema: con los datos reales de la API es la fecha del equipo. */
export const hoyISO = () => toISO(new Date());

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

/** Codigos con que se muestran los documentos (la tabla solo guarda el id). */
export const codigoCompra = (id) => `CMP-${String(id).padStart(4, '0')}`;
export const codigoPedido = (id) => `PED-${String(id).padStart(4, '0')}`;
export const codigoAbono = (id) => `AB-${String(id).padStart(4, '0')}`;

/** Etiqueta legible de una fila, sea cual sea la tabla. */
export const etiquetaFila = (r) =>
  r?.nombre || r?.nombre_empleado || r?.nombre_usuario || r?.correo || (r?.id ? `#${r.id}` : '—');

/* --------------------------------------------------------------
   Listas de valores para columnas varchar sin tabla propia
   -------------------------------------------------------------- */

/** Etapas del registro de venta. La cotizacion, el pedido y la venta son el
 *  mismo registro (tabla `pedido`): cada una es un tramo de estos estados. */
export const COTIZACION = 'Cotización aprobada por el cliente';
export const EN_PROCESO = 'Pedido en proceso';
export const FALTA_PAGO = 'Pedido completado - falta pago';
export const COMPLETADO = 'Pedido completado';
export const ENTREGADO = 'Pedido entregado / vendido';
export const ESTADOS_PEDIDO = [COTIZACION, EN_PROCESO, FALTA_PAGO, COMPLETADO, ENTREGADO];

/** Una compra anulada sale del flujo: no es un estado mas del recorrido
 *  normal, asi que el desplegable del listado ofrece solo
 *  ESTADOS_COMPRA_ACTIVOS y la baja se hace desde el formulario, con
 *  confirmacion. ESTADOS_COMPRA (con la anulacion) se usa para filtrar. */
export const ESTADOS_COMPRA_ACTIVOS = ['Recibida', 'En tránsito'];
export const COMPRA_ANULADA = 'Anulada';
export const ESTADOS_COMPRA = [...ESTADOS_COMPRA_ACTIVOS, COMPRA_ANULADA];
export const ESTADOS_REGISTRO = ['Activo', 'Inactivo'];
export const TIPOS_DOCUMENTO = ['Cédula', 'RUC', 'Pasaporte', 'Cédula de residencia'];
export const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque'];

/* --------------------------------------------------------------
   Permisos (modulos) y privilegios (acciones dentro de cada modulo)
   -------------------------------------------------------------- */
export const AGREGAR = 'Agregar';
export const EDITAR = 'Editar';
export const VER_DETALLE = 'Ver detalle';
export const CAMBIAR_ESTADO = 'Cambiar estado';
export const ANULAR = 'Anular';
export const ELIMINAR = 'Eliminar';
export const VER_DISENO = 'Ver diseño';
export const DESCARGAR_DISENO = 'Descargar diseño';
export const VER_COMPROBANTE = 'Ver comprobante';
export const DESCARGAR_COMPROBANTE = 'Descargar comprobante';

/* Los modulos (permisos) y sus acciones (privilegios) viven en la base de
   datos: backend/src/db/migrations/002_conexion_frontend.sql. */

/* --------------------------------------------------------------
   Historial de movimientos (tabla `movimientos`)
   -------------------------------------------------------------- */
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
  tipo_insumo: 'Tipos de insumo',
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
  id_tipo_insumo: 'Tipo de insumo',
  id_unidad_medida: 'Unidad de medida',
  permisos: 'Permisos',
  privilegios: 'Privilegios',
  insumos: 'Insumos',
  detalle_insumos: 'Insumos adquiridos',
  resultado: 'Resultado',
};

/** Columnas que nunca se registran en el historial: la contrasena (nota del
 *  modelo de datos) y el seguimiento interno de etapas del pedido. */
export const CAMPOS_NO_AUDITADOS = ['contrasena', 'historial_estados'];

const textoValor = (v) => {
  if (v === undefined || v === null || v === '') return '—';
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === 'object' ? JSON.stringify(x) : x)).join(', ');
  if (typeof v === 'string' && v.startsWith('data:')) return 'Archivo adjunto';
  return String(v);
};

/**
 * Compara valor_anterior contra valor_nuevo y devuelve solo las columnas que
 * cambiaron: [{ campo, etiqueta, antes, despues }].
 */
export const camposCambiados = (anterior, nuevo) => {
  const claves = [...new Set([...Object.keys(anterior || {}), ...Object.keys(nuevo || {})])].filter(
    (k) => !CAMPOS_NO_AUDITADOS.includes(k)
  );
  const igual = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');
  return claves
    .filter((campo) => !igual(anterior?.[campo], nuevo?.[campo]))
    .map((campo) => {
      const antes = textoValor(anterior?.[campo]);
      const despues = textoValor(nuevo?.[campo]);
      return {
        campo,
        etiqueta: ETIQUETA_CAMPO[campo] || campo,
        antes,
        /* Un adjunto reemplazado por otro se lee igual ("Archivo adjunto"). */
        despues: antes === despues ? 'Archivo reemplazado' : despues,
      };
    });
};

export const ESTADO_TONO = {
  Activo: 'success',
  Inactivo: 'neutral',
  Recibida: 'success',
  'En tránsito': 'info',
  Anulada: 'error',
  [COTIZACION]: 'info',
  [EN_PROCESO]: 'warning',
  [FALTA_PAGO]: 'warning',
  [COMPLETADO]: 'primary',
  [ENTREGADO]: 'success',
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

/** Valor por defecto de `insumo.stock_minimo`: cada insumo guarda su propio
 *  minimo y las alertas de inventario se comparan contra el. Este numero solo
 *  se usa para proponerlo al registrar un insumo nuevo y como respaldo si la
 *  fila todavia no lo tiene. */
export const UMBRAL_STOCK_BAJO = 20;
