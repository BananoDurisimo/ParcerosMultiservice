/**
 * Traduccion entre las tablas de la base de datos y las colecciones que usa
 * el frontend (las mismas que tenia mock.js), para que las paginas no
 * cambien al pasar de los datos de ejemplo a la API.
 *
 *  base de datos                 frontend
 *  id_cliente, id_rol…       ->  id
 *  activo (boolean)          ->  estado 'Activo' | 'Inactivo'
 *  id_tipo_documento         ->  tipodocumento (nombre)
 *  id_estado_pedido/compra   ->  estado (nombre)
 *  id_metodo_pago            ->  metodo_pago (nombre)
 *  ruta_imagen_diseno        ->  imagen_diseno
 *  ruta_comprobante          ->  url_comprobante
 *  NULL                      ->  '' (los formularios trabajan con texto)
 */

const PK = {
  permisos: 'id_permiso', privilegios: 'id_privilegio', tipos_insumo: 'id_tipo_insumo',
  unidades_medida: 'id_unidad_medida', roles: 'id_rol', usuarios: 'id_usuario', insumos: 'id_insumo',
  proveedores: 'id_proveedor', compras: 'id_compra', clientes: 'id_cliente', pedidos: 'id_pedido',
  abonos: 'id_abono', movimientos: 'id',
};

/** Tabla de la base de datos -> coleccion del frontend (para el historial). */
const COLECCION_DE_TABLA = {
  rol: 'roles', usuario: 'usuarios', insumo: 'insumos', proveedor: 'proveedores',
  compra: 'compras', cliente: 'clientes', pedido: 'pedidos', abono: 'abonos',
};

const estado = (activo) => (activo === false ? 'Inactivo' : 'Activo');
const texto = (v) => (v === null || v === undefined ? '' : v);
const nombrePorId = (lista, campo, id) => lista.find((x) => x[campo] === id)?.nombre ?? '';
const idPorNombre = (lista, campo, nombre) => lista.find((x) => x.nombre === nombre)?.[campo] ?? null;

/** Una fila de la base de datos como la espera el frontend. */
function aFrontend(col, f, cat) {
  if (!f) return f;
  const base = { id: f[PK[col]] };
  switch (col) {
    case 'roles':
      return { ...base, nombre: f.nombre, permisos: f.permisos || [], privilegios: f.privilegios || [], estado: estado(f.activo) };
    case 'usuarios':
      return {
        ...base, id_rol: f.id_rol, nombre_usuario: f.nombre_usuario, correo_empresarial: f.correo_empresarial,
        nombre_empleado: f.nombre_empleado, documento: texto(f.documento), telefono: texto(f.telefono),
        cargo: texto(f.cargo), fecha_ingreso: texto(f.fecha_ingreso), estado: estado(f.activo),
      };
    case 'insumos':
      return {
        ...base, nombre: f.nombre, id_tipo_insumo: f.id_tipo_insumo, id_unidad_medida: f.id_unidad_medida,
        stock: Number(f.stock ?? 0), stock_minimo: Number(f.stock_minimo), precio_unitario: Number(f.precio_unitario), estado: estado(f.activo),
      };
    case 'proveedores':
      return {
        ...base, nombre: f.nombre, nombrepersonacontacto: texto(f.nombre_persona_contacto), id_tipo_insumo: f.id_tipo_insumo,
        telefono: texto(f.telefono), correo: texto(f.correo), direccion: texto(f.direccion), nit: f.nit, estado: estado(f.activo),
      };
    case 'clientes':
      return {
        ...base, nombre: f.nombre, tipodocumento: nombrePorId(cat.tipos_documento, 'id_tipo_documento', f.id_tipo_documento),
        documento: f.documento, telefono: texto(f.telefono), correo: f.correo, direccion: texto(f.direccion), estado: estado(f.activo),
      };
    case 'compras':
      return {
        ...base, id_proveedor: f.id_proveedor, fecha: texto(f.fecha), fecha_entrega: texto(f.fecha_entrega),
        estado: nombrePorId(cat.estados_compra, 'id_estado_compra', f.id_estado_compra),
        detalle_insumos: (f.detalles || []).map((l) => ({ id_insumo: l.id_insumo, cantidad: Number(l.cantidad), precio_unitario: Number(l.precio_unitario) })),
      };
    case 'pedidos':
      return {
        ...base, id_cliente: f.id_cliente, estado: nombrePorId(cat.estados_pedido, 'id_estado_pedido', f.id_estado_pedido),
        fecha_creacion: texto(f.fecha_creacion), fecha_inicio: texto(f.fecha_inicio), fecha_entrega: texto(f.fecha_entrega),
        descripcion: texto(f.descripcion), imagen_diseno: texto(f.ruta_imagen_diseno),
        insumos: (f.insumos || []).map((l) => {
          const cantidad = Number(l.cantidad);
          const precio = Number(l.precio_unitario);
          return { id_insumo: l.id_insumo, cantidad, precio_unitario: precio, subtotal: Math.round(cantidad * precio * 100) / 100 };
        }),
        historial_estados: (f.historial || []).map((h) => ({
          estado: nombrePorId(cat.estados_pedido, 'id_estado_pedido', h.id_estado_pedido), fecha: texto(h.fecha),
        })),
      };
    case 'abonos':
      return {
        ...base, id_pedido: f.id_pedido, monto: Number(f.monto), fecha: texto(f.fecha),
        metodo_pago: nombrePorId(cat.metodos_pago, 'id_metodo_pago', f.id_metodo_pago), url_comprobante: texto(f.ruta_comprobante),
      };
    default:
      return { ...f, ...base };
  }
}

/** Valores del historial con los mismos nombres de campo del frontend. */
function valorHistorial(tabla, valor, cat) {
  const col = COLECCION_DE_TABLA[tabla];
  if (!valor || !col) return valor;
  const { id, ...resto } = aFrontend(col, valor, cat);
  return resto;
}

/** Respuesta de GET /api/datos -> estado inicial de DataContext. */
export function deServidor(d) {
  const cat = {
    tipos_documento: d.tipos_documento, estados_pedido: d.estados_pedido,
    estados_compra: d.estados_compra, metodos_pago: d.metodos_pago,
  };
  const lista = (col) => (d[col] || []).map((f) => aFrontend(col, f, cat));
  return {
    catalogos: cat,
    permisos: lista('permisos'),
    privilegios: lista('privilegios'),
    tipos_insumo: lista('tipos_insumo'),
    unidades_medida: lista('unidades_medida'),
    roles: lista('roles'),
    usuarios: lista('usuarios'),
    insumos: lista('insumos'),
    proveedores: lista('proveedores'),
    compras: lista('compras'),
    clientes: lista('clientes'),
    pedidos: lista('pedidos'),
    abonos: lista('abonos'),
    /* Cambios y accesos vienen de dos tablas: se numeran por fecha para que
       el codigo MOV-0001… sea correlativo. */
    movimientos: [...(d.movimientos || [])].reverse().map((m, i) => ({
      ...m,
      id: i + 1,
      fecha_cambio: String(m.fecha_cambio).slice(0, 19),
      valor_anterior: valorHistorial(m.tabla, m.valor_anterior, cat),
      valor_nuevo: valorHistorial(m.tabla, m.valor_nuevo, cat),
    })).reverse(),
  };
}

/**
 * Fila del frontend -> cuerpo de POST/PUT. `sid(col, id)` traduce los ids
 * creados en el navegador al id que asigno el servidor.
 */
export function aServidor(col, r, cat, sid) {
  const activo = r.estado !== 'Inactivo';
  switch (col) {
    case 'roles':
      return { nombre: r.nombre, activo, permisos: r.permisos || [], privilegios: r.privilegios || [] };
    case 'usuarios':
      return {
        id_rol: sid('roles', r.id_rol), nombre_usuario: r.nombre_usuario, correo_empresarial: r.correo_empresarial,
        nombre_empleado: r.nombre_empleado, documento: r.documento, telefono: r.telefono, cargo: r.cargo,
        fecha_ingreso: r.fecha_ingreso, activo, ...(r.contrasena ? { contrasena: r.contrasena } : {}),
      };
    case 'insumos':
      return {
        id_tipo_insumo: r.id_tipo_insumo, id_unidad_medida: r.id_unidad_medida, nombre: r.nombre,
        stock_minimo: r.stock_minimo, precio_unitario: r.precio_unitario, activo, stock: r.stock,
      };
    case 'proveedores':
      return {
        id_tipo_insumo: r.id_tipo_insumo, nombre: r.nombre, nombre_persona_contacto: r.nombrepersonacontacto, nit: r.nit,
        telefono: r.telefono, correo: r.correo, direccion: r.direccion, activo,
      };
    case 'clientes':
      return {
        id_tipo_documento: idPorNombre(cat.tipos_documento, 'id_tipo_documento', r.tipodocumento), nombre: r.nombre,
        documento: r.documento, telefono: r.telefono, correo: r.correo, direccion: r.direccion, activo,
      };
    case 'compras':
      return {
        id_proveedor: sid('proveedores', r.id_proveedor), id_estado_compra: idPorNombre(cat.estados_compra, 'id_estado_compra', r.estado),
        fecha: r.fecha, fecha_entrega: r.fecha_entrega,
        detalles: (r.detalle_insumos || []).map((l) => ({ id_insumo: sid('insumos', l.id_insumo), cantidad: l.cantidad, precio_unitario: l.precio_unitario })),
      };
    case 'pedidos':
      return {
        id_cliente: sid('clientes', r.id_cliente), id_estado_pedido: idPorNombre(cat.estados_pedido, 'id_estado_pedido', r.estado),
        fecha_creacion: r.fecha_creacion, fecha_inicio: r.fecha_inicio, fecha_entrega: r.fecha_entrega,
        descripcion: r.descripcion, ruta_imagen_diseno: r.imagen_diseno,
        insumos: (r.insumos || []).map((l) => ({ id_insumo: sid('insumos', l.id_insumo), cantidad: l.cantidad, precio_unitario: l.precio_unitario })),
      };
    case 'abonos':
      return {
        id_pedido: sid('pedidos', r.id_pedido), id_metodo_pago: idPorNombre(cat.metodos_pago, 'id_metodo_pago', r.metodo_pago),
        monto: r.monto, fecha: r.fecha, ruta_comprobante: r.url_comprobante,
      };
    default:
      return null;
  }
}

/** Estado vacio mientras no hay sesion o mientras carga. */
export const VACIO = {
  catalogos: { tipos_documento: [], estados_pedido: [], estados_compra: [], metodos_pago: [] },
  permisos: [], privilegios: [], tipos_insumo: [], unidades_medida: [], roles: [], usuarios: [],
  insumos: [], proveedores: [], compras: [], clientes: [], pedidos: [], abonos: [], movimientos: [],
};
