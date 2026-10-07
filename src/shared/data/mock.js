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
import { disenoUniforme, comprobantePago } from './archivos.js';

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

/** Acciones que ofrece cada modulo. Consultar el listado (buscar y filtrar)
 *  lo da el permiso mismo: los privilegios son lo que se puede hacer dentro.
 *  El historial de movimientos no se puede eliminar: es la auditoria. */
const ACCIONES_MODULO = [
  ['Roles', [AGREGAR, EDITAR, VER_DETALLE, CAMBIAR_ESTADO, ELIMINAR]],
  ['Usuarios', [AGREGAR, EDITAR, VER_DETALLE, CAMBIAR_ESTADO, ELIMINAR]],
  ['Movimientos', [VER_DETALLE]],
  ['Insumos', [AGREGAR, EDITAR, VER_DETALLE, CAMBIAR_ESTADO, ELIMINAR]],
  ['Proveedores', [AGREGAR, EDITAR, VER_DETALLE, CAMBIAR_ESTADO, ELIMINAR]],
  ['Compras', [AGREGAR, EDITAR, VER_DETALLE, CAMBIAR_ESTADO, ANULAR, ELIMINAR]],
  ['Clientes', [AGREGAR, EDITAR, VER_DETALLE, CAMBIAR_ESTADO, ELIMINAR]],
  ['Cotizaciones', [AGREGAR, EDITAR, VER_DETALLE, CAMBIAR_ESTADO, ELIMINAR, VER_DISENO, DESCARGAR_DISENO]],
  ['Pedidos', [AGREGAR, EDITAR, VER_DETALLE, CAMBIAR_ESTADO, ELIMINAR, VER_DISENO, DESCARGAR_DISENO]],
  ['Ventas', [VER_DETALLE, CAMBIAR_ESTADO, ELIMINAR, VER_DISENO, DESCARGAR_DISENO, VER_COMPROBANTE, DESCARGAR_COMPROBANTE]],
  ['Abonos', [AGREGAR, EDITAR, VER_DETALLE, ELIMINAR, VER_COMPROBANTE, DESCARGAR_COMPROBANTE]],
];

// Tabla: permiso (id_permiso, nombre)
const PERMISOS = ACCIONES_MODULO.map(([nombre], i) => ({ id: i + 1, nombre }));

// Tabla: privilegio (id_privilegio, id_permiso, nombre)
const PRIVILEGIOS = ACCIONES_MODULO.flatMap(([, acciones], i) =>
  acciones.map((nombre) => ({ id_permiso: i + 1, nombre }))
).map((p, i) => ({ id: i + 1, ...p }));

const idPermiso = (nombre) => PERMISOS.find((p) => p.nombre === nombre).id;

/** Permisos y privilegios de un rol a partir de los nombres de sus modulos.
 *  `soloAcciones` limita los privilegios (por defecto, todos los del modulo). */
const accesoRol = (modulos, soloAcciones) => {
  const permisos = modulos.map(idPermiso);
  const privilegios = PRIVILEGIOS
    .filter((p) => permisos.includes(p.id_permiso) && (!soloAcciones || soloAcciones.includes(p.nombre)))
    .map((p) => p.id);
  return { permisos, privilegios };
};

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

/* --------------------------------------------------------------
   Datos semilla de cotizaciones, pedidos y ventas
   -------------------------------------------------------------- */
const PRECIO_INSUMO = { 1: 145, 2: 180, 3: 165, 4: 190, 5: 65, 6: 210, 7: 320, 8: 40, 9: 22, 10: 18, 11: 55, 13: 380, 14: 395 };

/** Linea de detalle_pedido_insumo: [id_insumo, cantidad] con el precio del insumo. */
const lineas = (pares) =>
  pares.map(([id_insumo, cantidad]) => {
    const precio_unitario = PRECIO_INSUMO[id_insumo];
    return { id_insumo, cantidad, precio_unitario, subtotal: Math.round(cantidad * precio_unitario * 100) / 100 };
  });

const etapas = (pares) => pares.map(([estado, f]) => ({ estado, fecha: f }));

const PEDIDOS = [
  { id: 1, id_cliente: 6, estado: EN_PROCESO, fecha_creacion: '2026-08-28', fecha_inicio: '2026-08-30', fecha_entrega: '',
    descripcion: 'Camisetas Dry-Fit con el escudo de la academia sublimado en el pecho, nombre y número en la espalda y franjas rojas en las mangas. Tallas: 8 S, 10 M, 7 L.',
    insumos: lineas([[1, 45], [7, 3], [11, 3], [5, 2]]),
    imagen_diseno: disenoUniforme({ titulo: 'Academia FC Juvenil', base: '#1d4ed8', acento: '#ffffff', texto: 'ACADEMIA', numero: '10' }),
    historial_estados: etapas([[COTIZACION, '2026-08-28'], [EN_PROCESO, '2026-08-30']]) },
  { id: 2, id_cliente: 2, estado: EN_PROCESO, fecha_creacion: '2026-08-25', fecha_inicio: '2026-08-27', fecha_entrega: '',
    descripcion: 'Jersey y licra de ciclismo en Lycra con el diseño del club, logos de patrocinadores en la espalda y cierre frontal. Tallas: 12 M, 16 L, 12 XL.',
    insumos: lineas([[2, 60], [7, 4], [13, 2], [9, 40]]),
    imagen_diseno: disenoUniforme({ titulo: 'Club de Ciclismo Pedal Nica', base: '#047857', acento: '#facc15', texto: 'PEDAL NICA', numero: '7' }),
    historial_estados: etapas([[COTIZACION, '2026-08-25'], [EN_PROCESO, '2026-08-27']]) },
  { id: 3, id_cliente: 5, estado: COMPLETADO, fecha_creacion: '2026-08-22', fecha_inicio: '2026-08-24', fecha_entrega: '',
    descripcion: 'Camisolas de béisbol con el nombre del equipo en vinil al frente y número en la espalda. 18 unidades en tallas M y L.',
    insumos: lineas([[1, 30], [6, 6], [5, 2]]),
    imagen_diseno: disenoUniforme({ titulo: 'Tigres de Rivas Béisbol Club', base: '#f97316', acento: '#111827', texto: 'TIGRES', numero: '23' }),
    historial_estados: etapas([[COTIZACION, '2026-08-22'], [EN_PROCESO, '2026-08-24'], [FALTA_PAGO, '2026-08-25'], [COMPLETADO, '2026-08-26']]) },
  { id: 4, id_cliente: 1, estado: ENTREGADO, fecha_creacion: '2026-08-18', fecha_inicio: '2026-08-20', fecha_entrega: '2026-08-29',
    descripcion: 'Uniforme completo (camiseta y short) con los colores del club; número sublimado en camiseta y short y escudo en el pecho. 30 unidades.',
    insumos: lineas([[1, 50], [10, 40], [7, 3], [11, 3]]),
    imagen_diseno: disenoUniforme({ titulo: 'Club Deportivo Los Andes', base: '#b91c1c', acento: '#ffffff', texto: 'LOS ANDES', numero: '9' }),
    historial_estados: etapas([[COTIZACION, '2026-08-18'], [EN_PROCESO, '2026-08-20'], [COMPLETADO, '2026-08-28'], [ENTREGADO, '2026-08-29']]) },
  { id: 5, id_cliente: 3, estado: FALTA_PAGO, fecha_creacion: '2026-08-16', fecha_inicio: '2026-08-18', fecha_entrega: '',
    descripcion: 'Camisetas sin mangas en mesh con número y logo de la liga en vinil. 12 unidades en tallas L y XL.',
    insumos: lineas([[3, 35], [6, 4]]),
    imagen_diseno: disenoUniforme({ titulo: 'Liga Municipal de Baloncesto Masaya', base: '#7c3aed', acento: '#fde047', texto: 'MASAYA', numero: '33' }),
    historial_estados: etapas([[COTIZACION, '2026-08-16'], [EN_PROCESO, '2026-08-18'], [FALTA_PAGO, '2026-08-27']]) },
  { id: 6, id_cliente: 9, estado: COTIZACION, fecha_creacion: '2026-08-15', fecha_inicio: '', fecha_entrega: '',
    descripcion: 'Camisolas entalladas en tela micro-perforada con nombre y número sublimados en negro y rojo, botones metálicos al frente. 22 unidades.',
    insumos: lineas([[4, 40], [13, 2], [14, 2], [8, 3]]),
    imagen_diseno: disenoUniforme({ titulo: 'Liga de Softbol Femenino Estelí', base: '#ffffff', acento: '#dc2626', texto: 'ESTELÍ', numero: '4' }),
    historial_estados: etapas([[COTIZACION, '2026-08-15']]) },
  { id: 7, id_cliente: 4, estado: ENTREGADO, fecha_creacion: '2026-08-09', fecha_inicio: '2026-08-11', fecha_entrega: '2026-08-20',
    descripcion: 'Chaquetas deportivas en tela micro-perforada con cierre y el nombre bordado en el pecho. 4 unidades.',
    insumos: lineas([[4, 8], [9, 4], [5, 1]]),
    imagen_diseno: disenoUniforme({ titulo: 'Marcia Ortega Bermúdez', base: '#0f172a', acento: '#38bdf8', texto: 'M. ORTEGA', numero: '1' }),
    historial_estados: etapas([[COTIZACION, '2026-08-09'], [EN_PROCESO, '2026-08-11'], [FALTA_PAGO, '2026-08-18'], [COMPLETADO, '2026-08-19'], [ENTREGADO, '2026-08-20']]) },
  { id: 8, id_cliente: 6, estado: ENTREGADO, fecha_creacion: '2026-08-04', fecha_inicio: '2026-08-06', fecha_entrega: '2026-08-14',
    descripcion: 'Sudaderas de entrenamiento con el escudo bordado en el pecho y el nombre de la academia en la pierna. 15 unidades.',
    insumos: lineas([[1, 25], [10, 30], [11, 2]]),
    imagen_diseno: disenoUniforme({ titulo: 'Academia FC Juvenil', base: '#111827', acento: '#60a5fa', texto: 'ACADEMIA', numero: '' }),
    historial_estados: etapas([[COTIZACION, '2026-08-04'], [EN_PROCESO, '2026-08-06'], [COMPLETADO, '2026-08-13'], [ENTREGADO, '2026-08-14']]) },
  { id: 9, id_cliente: 8, estado: FALTA_PAGO, fecha_creacion: '2026-07-31', fecha_inicio: '2026-08-02', fecha_entrega: '',
    descripcion: 'Camisetas para el equipo de fútbol rápido con el logo en vinil al frente y escudo bordado. 10 unidades.',
    insumos: lineas([[6, 3], [11, 5], [5, 1]]),
    imagen_diseno: disenoUniforme({ titulo: 'Danilo Espinoza Cruz', base: '#16a34a', acento: '#ffffff', texto: 'ESPINOZA', numero: '11' }),
    historial_estados: etapas([[COTIZACION, '2026-07-31'], [EN_PROCESO, '2026-08-02'], [FALTA_PAGO, '2026-08-20']]) },
  { id: 10, id_cliente: 1, estado: ENTREGADO, fecha_creacion: '2026-07-26', fecha_inicio: '2026-07-28', fecha_entrega: '2026-08-10',
    descripcion: 'Shorts Dry-Fit con el número sublimado en la pierna izquierda. 28 unidades.',
    insumos: lineas([[1, 28], [7, 2]]),
    imagen_diseno: disenoUniforme({ titulo: 'Club Deportivo Los Andes', base: '#ffffff', acento: '#b91c1c', texto: 'LOS ANDES', numero: '5' }),
    historial_estados: etapas([[COTIZACION, '2026-07-26'], [EN_PROCESO, '2026-07-28'], [FALTA_PAGO, '2026-08-08'], [COMPLETADO, '2026-08-10'], [ENTREGADO, '2026-08-10']]) },
  { id: 11, id_cliente: 2, estado: ENTREGADO, fecha_creacion: '2026-07-20', fecha_inicio: '2026-07-22', fecha_entrega: '2026-07-30',
    descripcion: 'Jersey de ciclismo con el diseño del club y la bandera de Nicaragua en las mangas, cierre completo. 26 unidades.',
    insumos: lineas([[2, 40], [7, 3], [9, 26]]),
    imagen_diseno: disenoUniforme({ titulo: 'Club de Ciclismo Pedal Nica', base: '#2563eb', acento: '#ffffff', texto: 'NICARAGUA', numero: '2' }),
    historial_estados: etapas([[COTIZACION, '2026-07-20'], [EN_PROCESO, '2026-07-22'], [COMPLETADO, '2026-07-29'], [ENTREGADO, '2026-07-30']]) },
  { id: 12, id_cliente: 7, estado: FALTA_PAGO, fecha_creacion: '2026-07-13', fecha_inicio: '2026-07-15', fecha_entrega: '',
    descripcion: 'Camisolas de béisbol con el escudo de la liga bordado y número en la espalda. 10 unidades.',
    insumos: lineas([[1, 20], [11, 2]]),
    imagen_diseno: disenoUniforme({ titulo: 'Liga de Béisbol Carretera Sur', base: '#e5e7eb', acento: '#1e3a8a', texto: 'C. SUR', numero: '15' }),
    historial_estados: etapas([[COTIZACION, '2026-07-13'], [EN_PROCESO, '2026-07-15'], [FALTA_PAGO, '2026-07-30']]) },
  { id: 13, id_cliente: 4, estado: COTIZACION, fecha_creacion: '2026-08-29', fecha_inicio: '', fecha_entrega: '',
    descripcion: 'Camisetas Dry-Fit para caminata con el nombre del grupo sublimado. 4 unidades talla M.',
    insumos: lineas([[1, 6], [7, 1]]),
    imagen_diseno: disenoUniforme({ titulo: 'Marcia Ortega Bermúdez', base: '#f472b6', acento: '#ffffff', texto: 'CAMINATA', numero: '' }),
    historial_estados: etapas([[COTIZACION, '2026-08-29']]) },
];

const totalDe = (idPedido) => PEDIDOS.find((p) => p.id === idPedido).insumos.reduce((s, l) => s + l.subtotal, 0);
const CLIENTE_PEDIDO = { 1: 'Academia FC Juvenil', 2: 'Club de Ciclismo Pedal Nica', 3: 'Tigres de Rivas Béisbol Club', 4: 'Club Deportivo Los Andes', 5: 'Liga Municipal de Baloncesto Masaya', 7: 'Marcia Ortega Bermúdez', 8: 'Academia FC Juvenil', 9: 'Danilo Espinoza Cruz', 10: 'Club Deportivo Los Andes', 11: 'Club de Ciclismo Pedal Nica', 12: 'Liga de Béisbol Carretera Sur' };

/** Abono semilla: `parte` es 0.5 (abono del 50%) o 1 (pago total). Cada
 *  pedido admite como maximo dos abonos: 50% + saldo, o un pago total. */
const abono = (id, id_pedido, parte, f, metodo_pago, conComprobante) => {
  const monto = Math.round(totalDe(id_pedido) * parte * 100) / 100;
  return {
    id, id_pedido, monto, fecha: f, metodo_pago,
    url_comprobante: conComprobante
      ? comprobantePago({ codigo: codigoAbono(id), cliente: CLIENTE_PEDIDO[id_pedido], monto: money(monto), fecha: fecha(f), metodo: metodo_pago })
      : '',
  };
};

export const seed = {
  /* ---------- Catalogos ---------- */
  permisos: PERMISOS,
  privilegios: PRIVILEGIOS,

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
  // Tabla: rol (id_rol, nombre, estado) + rolxpermiso + rolxprivilegio
  roles: [
    { id: 1, nombre: 'Administrador', ...accesoRol(PERMISOS.map((p) => p.nombre)), estado: 'Activo' },
    { id: 2, nombre: 'Gerente', ...accesoRol(PERMISOS.map((p) => p.nombre)), estado: 'Activo' },
    { id: 3, nombre: 'Vendedor', ...accesoRol(['Clientes', 'Cotizaciones', 'Pedidos', 'Ventas', 'Abonos']), estado: 'Activo' },
    { id: 4, nombre: 'Almacenista', ...accesoRol(['Insumos', 'Proveedores', 'Compras']), estado: 'Activo' },
    { id: 5, nombre: 'Operario de producción', ...accesoRol(['Pedidos'], [VER_DETALLE, VER_DISENO, DESCARGAR_DISENO]), estado: 'Inactivo' },
  ],

  // Tabla: usuario
  usuarios: [
    { id: 1, id_rol: 1, nombre_usuario: 'dperez', contrasena: '123456', correo_empresarial: 'admin@parceros.ni', nombre_empleado: 'Diana Pérez Molina', documento: '0011809900011A', telefono: '8992 0326', cargo: 'Administradora general', fecha_ingreso: '2023-02-06', estado: 'Activo' },
    { id: 2, id_rol: 2, nombre_usuario: 'lecheverri', contrasena: '123456', correo_empresarial: 'gerente@parceros.ni', nombre_empleado: 'Lina Echeverri González', documento: '0012207880022B', telefono: '8845 1120', cargo: 'Gerente comercial', fecha_ingreso: '2023-05-15', estado: 'Activo' },
    { id: 3, id_rol: 3, nombre_usuario: 'mgutierrez', contrasena: '123456', correo_empresarial: 'vendedor@parceros.ni', nombre_empleado: 'Marlon Gutiérrez Ruiz', documento: '0011504910033C', telefono: '8712 4409', cargo: 'Asesor de ventas', fecha_ingreso: '2024-01-08', estado: 'Activo' },
    { id: 4, id_rol: 3, nombre_usuario: 'scastillo', contrasena: '123456', correo_empresarial: 'scastillo@parceros.ni', nombre_empleado: 'Sofía Castillo Rivas', documento: '0010203950044D', telefono: '8630 7781', cargo: 'Asesora de ventas', fecha_ingreso: '2024-03-11', estado: 'Activo' },
    { id: 5, id_rol: 4, nombre_usuario: 'amendoza', contrasena: '123456', correo_empresarial: 'almacen@parceros.ni', nombre_empleado: 'Alberto Mendoza Paz', documento: '0012811870055E', telefono: '8901 2233', cargo: 'Jefe de almacén', fecha_ingreso: '2023-08-21', estado: 'Activo' },
    { id: 6, id_rol: 4, nombre_usuario: 'kjiron', contrasena: '123456', correo_empresarial: 'kjiron@parceros.ni', nombre_empleado: 'Karla Jirón Soza', documento: '0010907930066F', telefono: '8455 6612', cargo: 'Auxiliar de almacén', fecha_ingreso: '2024-06-03', estado: 'Inactivo' },
    { id: 7, id_rol: 3, nombre_usuario: 'jherrera', contrasena: '123456', correo_empresarial: 'jherrera@parceros.ni', nombre_empleado: 'Julio Herrera Lacayo', documento: '0011712890077G', telefono: '8377 9010', cargo: 'Asesor de ventas', fecha_ingreso: '2025-02-17', estado: 'Activo' },
    { id: 8, id_rol: 1, nombre_usuario: 'asequeira', contrasena: '123456', correo_empresarial: 'asequeira@parceros.ni', nombre_empleado: 'Ana Sequeira Toruño', documento: '0010506920088H', telefono: '8288 4455', cargo: 'Administradora de sistemas', fecha_ingreso: '2023-11-02', estado: 'Activo' },
  ],

  /* ---------- Compras ---------- */
  // Tabla: insumo (id_insumo, nombre, id_tipo_insumo, id_unidad_medida, stock, stock_minimo, precio_unitario, estado)
  insumos: [
    { id: 1, nombre: 'Tela Dry-Fit', id_tipo_insumo: 1, id_unidad_medida: 2, stock: 278, stock_minimo: 60, precio_unitario: 145, estado: 'Activo' },
    { id: 2, nombre: 'Tela Lycra', id_tipo_insumo: 1, id_unidad_medida: 2, stock: 130, stock_minimo: 40, precio_unitario: 180, estado: 'Activo' },
    { id: 3, nombre: 'Tela Mesh deportiva', id_tipo_insumo: 1, id_unidad_medida: 2, stock: 0, stock_minimo: 30, precio_unitario: 165, estado: 'Activo' },
    { id: 4, nombre: 'Tela Micro-perforada', id_tipo_insumo: 1, id_unidad_medida: 2, stock: 64, stock_minimo: 30, precio_unitario: 190, estado: 'Activo' },
    { id: 5, nombre: 'Hilo poliéster', id_tipo_insumo: 2, id_unidad_medida: 4, stock: 92, stock_minimo: 25, precio_unitario: 65, estado: 'Activo' },
    { id: 6, nombre: 'Vinil textil', id_tipo_insumo: 3, id_unidad_medida: 1, stock: 14, stock_minimo: 20, precio_unitario: 210, estado: 'Activo' },
    { id: 7, nombre: 'Tinta sublimación', id_tipo_insumo: 3, id_unidad_medida: 3, stock: 46, stock_minimo: 15, precio_unitario: 320, estado: 'Activo' },
    { id: 8, nombre: 'Botones metálicos', id_tipo_insumo: 4, id_unidad_medida: 6, stock: 310, stock_minimo: 60, precio_unitario: 40, estado: 'Activo' },
    { id: 9, nombre: 'Cierre nylon 20cm', id_tipo_insumo: 4, id_unidad_medida: 3, stock: 8, stock_minimo: 25, precio_unitario: 22, estado: 'Activo' },
    { id: 10, nombre: 'Elástico 3cm', id_tipo_insumo: 4, id_unidad_medida: 1, stock: 175, stock_minimo: 40, precio_unitario: 18, estado: 'Activo' },
    { id: 11, nombre: 'Escudos bordados', id_tipo_insumo: 4, id_unidad_medida: 6, stock: 88, stock_minimo: 30, precio_unitario: 55, estado: 'Activo' },
    { id: 13, nombre: 'Tinta textil negra', id_tipo_insumo: 3, id_unidad_medida: 7, stock: 24, stock_minimo: 10, precio_unitario: 380, estado: 'Activo' },
    { id: 14, nombre: 'Tinta textil roja', id_tipo_insumo: 3, id_unidad_medida: 7, stock: 18, stock_minimo: 20, precio_unitario: 395, estado: 'Inactivo' },
  ],

  // Tabla: proveedor
  proveedores: [
    { id: 1, nombre: 'Textiles Nicaragua S.A', nombrepersonacontacto: 'Roberto Solís', id_tipo_insumo: 1, telefono: '2278 4410', correo: 'ventas@textilesni.com', telefono_contacto: '8854 1203', correo_contacto: 'rsolis@textilesni.com', direccion: 'Km 8 Carretera Norte, Managua', nit: 'J0310000451', estado: 'Activo' },
    { id: 2, nombre: 'Distribuidora El Cosido', nombrepersonacontacto: 'Marta Aguilar', id_tipo_insumo: 2, telefono: '2255 9032', correo: 'contacto@elcosido.ni', telefono_contacto: '8723 4410', correo_contacto: 'maguilar@elcosido.ni', direccion: 'Mercado Oriental, Módulo 22', nit: 'J0310000672', estado: 'Activo' },
    { id: 3, nombre: 'Impresiones Managua', nombrepersonacontacto: 'Jorge Núñez', id_tipo_insumo: 3, telefono: '2299 1187', correo: 'info@impresionesmga.com', telefono_contacto: '8610 7752', correo_contacto: 'jnunez@impresionesmga.com', direccion: 'Bolonia, de la Rotonda 2c al sur', nit: 'J0310000893', estado: 'Activo' },
    { id: 4, nombre: 'Accesorios del Norte', nombrepersonacontacto: 'Elena Vílchez', id_tipo_insumo: 4, telefono: '2712 3345', correo: 'ventas@accnorte.ni', telefono_contacto: '8477 9021', correo_contacto: 'evilchez@accnorte.ni', direccion: 'Estelí, Barrio El Calvario', nit: 'J0310001014', estado: 'Activo' },
    { id: 5, nombre: 'Bordados Estelí', nombrepersonacontacto: 'Luis Zamora', id_tipo_insumo: 4, telefono: '2713 8890', correo: 'bordados.esteli@gmail.com', telefono_contacto: '8399 1145', correo_contacto: 'lzamora.bordados@gmail.com', direccion: 'Estelí, Av. Central', nit: 'J0310001235', estado: 'Inactivo' },
    { id: 6, nombre: 'Confecciones del Sur', nombrepersonacontacto: 'Ada Miranda', id_tipo_insumo: 1, telefono: '2552 4471', correo: 'confeccionessur@ni.com', telefono_contacto: '8566 3398', correo_contacto: 'amiranda@confeccionessur.ni', direccion: 'Rivas, Barrio San Francisco', nit: 'J0310001456', estado: 'Activo' },
  ],

  /* Tabla: compra (id_compra, id_proveedor, fecha, fecha_entrega, estado)
     `detalle_insumos` replica detalle_compra_insumo. */
  compras: [
    { id: 1, id_proveedor: 1, fecha: '2026-08-28', fecha_entrega: '2026-08-30', estado: 'Recibida', detalle_insumos: [{ id_insumo: 1, cantidad: 120, precio_unitario: 145 }, { id_insumo: 2, cantidad: 40, precio_unitario: 180 }] },
    { id: 2, id_proveedor: 3, fecha: '2026-08-25', fecha_entrega: '2026-08-27', estado: 'Recibida', detalle_insumos: [{ id_insumo: 6, cantidad: 25, precio_unitario: 210 }] },
    { id: 3, id_proveedor: 2, fecha: '2026-08-21', fecha_entrega: '2026-08-22', estado: 'Recibida', detalle_insumos: [{ id_insumo: 5, cantidad: 60, precio_unitario: 65 }, { id_insumo: 10, cantidad: 100, precio_unitario: 18 }] },
    { id: 4, id_proveedor: 4, fecha: '2026-08-18', fecha_entrega: '2026-09-02', estado: 'En tránsito', detalle_insumos: [{ id_insumo: 9, cantidad: 150, precio_unitario: 22 }] },
    { id: 5, id_proveedor: 1, fecha: '2026-08-14', fecha_entrega: '2026-08-16', estado: 'Recibida', detalle_insumos: [{ id_insumo: 4, cantidad: 80, precio_unitario: 190 }] },
    { id: 6, id_proveedor: 5, fecha: '2026-08-09', fecha_entrega: '2026-08-12', estado: 'Recibida', detalle_insumos: [{ id_insumo: 11, cantidad: 40, precio_unitario: 55 }] },
    { id: 7, id_proveedor: 3, fecha: '2026-08-04', fecha_entrega: '2026-08-08', estado: 'Anulada', detalle_insumos: [{ id_insumo: 7, cantidad: 12, precio_unitario: 320 }] },
    { id: 8, id_proveedor: 2, fecha: '2026-07-30', fecha_entrega: '2026-07-31', estado: 'Recibida', detalle_insumos: [{ id_insumo: 5, cantidad: 45, precio_unitario: 65 }] },
    { id: 9, id_proveedor: 6, fecha: '2026-07-24', fecha_entrega: '2026-07-27', estado: 'Recibida', detalle_insumos: [{ id_insumo: 1, cantidad: 90, precio_unitario: 145 }] },
    { id: 10, id_proveedor: 4, fecha: '2026-07-18', fecha_entrega: '2026-07-21', estado: 'Recibida', detalle_insumos: [{ id_insumo: 8, cantidad: 200, precio_unitario: 40 }] },
  ],

  /* ---------- Ventas ---------- */
  // Tabla: cliente
  clientes: [
    { id: 1, nombre: 'Club Deportivo Los Andes', tipodocumento: 'RUC', documento: 'J0310000123', telefono: '8712 3344', correo: 'losandes@club.ni', direccion: 'Managua, Villa Fontana', estado: 'Activo' },
    { id: 2, nombre: 'Club de Ciclismo Pedal Nica', tipodocumento: 'RUC', documento: 'J0310000455', telefono: '2277 9911', correo: 'directiva@pedalnica.ni', direccion: 'Managua, Altamira', estado: 'Activo' },
    { id: 3, nombre: 'Liga Municipal de Baloncesto Masaya', tipodocumento: 'RUC', documento: 'J0310000788', telefono: '2255 3321', correo: 'liga@basketmasaya.ni', direccion: 'Masaya, Centro', estado: 'Activo' },
    { id: 4, nombre: 'Marcia Ortega Bermúdez', tipodocumento: 'Cédula', documento: '0012509880012B', telefono: '8877 1290', correo: 'marcia.ortega@gmail.com', direccion: 'Granada, Calle La Calzada', estado: 'Activo' },
    { id: 5, nombre: 'Tigres de Rivas Béisbol Club', tipodocumento: 'RUC', documento: 'J0310000992', telefono: '2552 7788', correo: 'tigres@beisbolrivas.ni', direccion: 'Rivas, Barrio Central', estado: 'Activo' },
    { id: 6, nombre: 'Academia FC Juvenil', tipodocumento: 'RUC', documento: 'J0310001177', telefono: '8990 4412', correo: 'fcjuvenil@correo.ni', direccion: 'León, Sutiaba', estado: 'Activo' },
    { id: 7, nombre: 'Liga de Béisbol Carretera Sur', tipodocumento: 'RUC', documento: 'J0310001344', telefono: '2266 5510', correo: 'directiva@beisbolcsur.ni', direccion: 'Managua, Carretera Sur', estado: 'Inactivo' },
    { id: 8, nombre: 'Danilo Espinoza Cruz', tipodocumento: 'Cédula', documento: '0011806770018C', telefono: '8433 2277', correo: 'danilo.espinoza@gmail.com', direccion: 'Estelí, Barrio Milenio', estado: 'Activo' },
    { id: 9, nombre: 'Liga de Softbol Femenino Estelí', tipodocumento: 'RUC', documento: 'J0310001566', telefono: '2713 4402', correo: 'softbolfem@ligaesteli.ni', direccion: 'Estelí, Km 3 Carretera Panamericana', estado: 'Activo' },
  ],

  /* Tabla: pedido (id_pedido, id_cliente, estado, fecha_creacion, fecha_inicio,
     fecha_entrega, descripcion, imagen_diseno). La cotizacion, el pedido y la
     venta son este mismo registro en distintos estados. `insumos` replica
     detalle_pedido_insumo y `historial_estados` la fecha en que se alcanzo
     cada etapa. */
  pedidos: PEDIDOS,

  // Tabla: abono (id_abono, id_pedido, monto, fecha, metodo_pago, url_comprobante)
  abonos: [
    abono(1, 1, 0.5, '2026-08-30', 'Transferencia', true),
    abono(2, 2, 0.5, '2026-08-27', 'Efectivo', false),
    abono(3, 3, 0.5, '2026-08-24', 'Efectivo', false),
    abono(4, 3, 0.5, '2026-08-26', 'Transferencia', true),
    abono(5, 4, 1, '2026-08-20', 'Tarjeta', true),
    abono(6, 5, 0.5, '2026-08-18', 'Efectivo', false),
    abono(7, 7, 0.5, '2026-08-11', 'Efectivo', false),
    abono(8, 7, 0.5, '2026-08-19', 'Transferencia', true),
    abono(9, 8, 1, '2026-08-06', 'Transferencia', true),
    abono(10, 9, 0.5, '2026-08-02', 'Efectivo', false),
    abono(11, 10, 0.5, '2026-07-28', 'Transferencia', true),
    abono(12, 10, 0.5, '2026-08-10', 'Efectivo', false),
    abono(13, 11, 1, '2026-07-22', 'Cheque', true),
    abono(14, 12, 0.5, '2026-07-15', 'Efectivo', false),
  ],

  /* ---------- Historial ----------
     Tabla: movimientos (id_movimiento, tabla, id_registro, accion,
     valor_anterior, valor_nuevo, id_usuario, fecha_cambio).
     La llenan los triggers de cada modulo y el inicio y cierre de sesion, por
     eso desde la interfaz solo se consulta: no se crea, edita ni elimina. */
  movimientos: [
    { id: 1, tabla: 'acceso', id_registro: 3, accion: 'LOGIN', valor_anterior: null, valor_nuevo: { correo: 'vendedor@parceros.ni', resultado: 'Ingreso exitoso' }, id_usuario: 3, fecha_cambio: '2026-08-30T08:02:11' },
    { id: 2, tabla: 'pedido', id_registro: 1, accion: 'UPDATE', valor_anterior: { estado: COTIZACION, fecha_inicio: '' }, valor_nuevo: { estado: EN_PROCESO, fecha_inicio: '2026-08-30' }, id_usuario: 3, fecha_cambio: '2026-08-30T09:14:22' },
    { id: 3, tabla: 'abono', id_registro: 1, accion: 'INSERT', valor_anterior: null, valor_nuevo: { id_pedido: 1, monto: totalDe(1) / 2, fecha: '2026-08-30', metodo_pago: 'Transferencia', url_comprobante: 'data:' }, id_usuario: 3, fecha_cambio: '2026-08-30T09:14:05' },
    { id: 4, tabla: 'insumo', id_registro: 3, accion: 'UPDATE', valor_anterior: { stock: 35 }, valor_nuevo: { stock: 0 }, id_usuario: 5, fecha_cambio: '2026-08-29T11:02:41' },
    { id: 5, tabla: 'acceso', id_registro: null, accion: 'LOGIN_FALLIDO', valor_anterior: null, valor_nuevo: { correo: 'almacen@parceros.ni', resultado: 'Correo o contraseña incorrectos' }, id_usuario: null, fecha_cambio: '2026-08-29T07:58:40' },
    { id: 6, tabla: 'usuario', id_registro: 6, accion: 'UPDATE', valor_anterior: { estado: 'Activo' }, valor_nuevo: { estado: 'Inactivo' }, id_usuario: 1, fecha_cambio: '2026-08-29T15:33:18' },
    { id: 7, tabla: 'compra', id_registro: 7, accion: 'UPDATE', valor_anterior: { estado: 'En tránsito' }, valor_nuevo: { estado: 'Anulada' }, id_usuario: 5, fecha_cambio: '2026-08-29T10:20:57' },
    { id: 8, tabla: 'pedido', id_registro: 13, accion: 'INSERT', valor_anterior: null, valor_nuevo: { id_cliente: 4, estado: COTIZACION, fecha_creacion: '2026-08-29', descripcion: PEDIDOS[12].descripcion }, id_usuario: 4, fecha_cambio: '2026-08-29T16:45:12' },
    { id: 9, tabla: 'cliente', id_registro: 9, accion: 'INSERT', valor_anterior: null, valor_nuevo: { nombre: 'Liga de Softbol Femenino Estelí', tipodocumento: 'RUC', documento: 'J0310001566', telefono: '2713 4402', correo: 'softbolfem@ligaesteli.ni', direccion: 'Estelí, Km 3 Carretera Panamericana', estado: 'Activo' }, id_usuario: 4, fecha_cambio: '2026-08-14T08:41:30' },
    { id: 10, tabla: 'proveedor', id_registro: 2, accion: 'UPDATE', valor_anterior: { telefono: '2255 1100' }, valor_nuevo: { telefono: '2255 9032' }, id_usuario: 5, fecha_cambio: '2026-08-27T14:12:44' },
    { id: 11, tabla: 'rol', id_registro: 3, accion: 'UPDATE', valor_anterior: { nombre: 'Vendedor', permisos: [7, 8, 9, 11] }, valor_nuevo: { nombre: 'Vendedor', permisos: [7, 8, 9, 10, 11] }, id_usuario: 1, fecha_cambio: '2026-08-26T09:57:12' },
    { id: 12, tabla: 'pedido', id_registro: 3, accion: 'UPDATE', valor_anterior: { estado: FALTA_PAGO }, valor_nuevo: { estado: COMPLETADO }, id_usuario: 4, fecha_cambio: '2026-08-26T13:44:51' },
    { id: 13, tabla: 'insumo', id_registro: 12, accion: 'DELETE', valor_anterior: { nombre: 'Cinta reflectiva', id_tipo_insumo: 4, id_unidad_medida: 1, stock: 0, precio_unitario: 75 }, valor_nuevo: null, id_usuario: 5, fecha_cambio: '2026-08-22T10:08:27' },
    { id: 14, tabla: 'usuario', id_registro: 7, accion: 'INSERT', valor_anterior: null, valor_nuevo: { id_rol: 3, nombre_usuario: 'jherrera', correo_empresarial: 'jherrera@parceros.ni', nombre_empleado: 'Julio Herrera Lacayo', documento: '0011712890077G', telefono: '8377 9010', cargo: 'Asesor de ventas', fecha_ingreso: '2025-02-17', estado: 'Activo' }, id_usuario: 1, fecha_cambio: '2026-08-21T08:25:14' },
    { id: 15, tabla: 'compra', id_registro: 4, accion: 'INSERT', valor_anterior: null, valor_nuevo: { id_proveedor: 4, fecha: '2026-08-18', fecha_entrega: '2026-09-02', estado: 'En tránsito' }, id_usuario: 5, fecha_cambio: '2026-08-18T09:36:40' },
    { id: 16, tabla: 'cliente', id_registro: 3, accion: 'UPDATE', valor_anterior: { direccion: 'Masaya, Barrio San Jerónimo' }, valor_nuevo: { direccion: 'Masaya, Centro' }, id_usuario: 7, fecha_cambio: '2026-08-17T15:51:06' },
    { id: 17, tabla: 'abono', id_registro: 14, accion: 'INSERT', valor_anterior: null, valor_nuevo: { id_pedido: 12, monto: totalDe(12) / 2, fecha: '2026-07-15', metodo_pago: 'Efectivo', url_comprobante: '' }, id_usuario: 4, fecha_cambio: '2026-07-15T12:03:55' },
  ],
};
