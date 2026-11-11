/**
 * Traduccion entre las tablas de la base de datos y las colecciones que usa
 * el frontend.
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
 *  tiene_diseno/comprobante  ->  EN_SERVIDOR (el adjunto se pide al abrirlo)
 */

import { PK } from '@data/models/colecciones.js';
import { EN_SERVIDOR } from '@core/utils/archivos.js';

const estado = (activo) => (activo === false ? 'Inactivo' : 'Activo');
const texto = (v) => (v === null || v === undefined ? '' : v);
/* Adjunto que llega sin contenido: solo se sabe si existe. */
const adjunto = (existe) => (existe ? EN_SERVIDOR : '');
/* Un adjunto sin cambios no se envia (undefined no viaja en el JSON). */
const subir = (v) => (v === EN_SERVIDOR ? undefined : v);
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
        ...base, id_rol: f.id_rol, correo_empresarial: f.correo_empresarial,
        tipodocumento: nombrePorId(cat.tipos_documento, 'id_tipo_documento', f.id_tipo_documento),
        nombre_empleado: f.nombre_empleado, documento: texto(f.documento), telefono: texto(f.telefono),
        cargo: texto(f.cargo), fecha_ingreso: texto(f.fecha_ingreso), estado: estado(f.activo),
      };
    case 'insumos':
      return {
        ...base, nombre: f.nombre, id_tipo_insumo: f.id_tipo_insumo, id_unidad_medida: f.id_unidad_medida,
        stock: Number(f.stock ?? 0), stock_minimo: Number(f.stock_minimo), estado: estado(f.activo),
      };
    case 'proveedores':
      return {
        ...base, nombre: f.nombre, id_tipo_insumo: f.id_tipo_insumo, tipo_proveedor: f.tipo_proveedor || 'Persona jurídica',
        telefono: texto(f.telefono), pais: f.pais || 'Nicaragua', estado: estado(f.activo),
      };
    case 'clientes':
      return {
        ...base, nombre: f.nombre, pais: f.pais || 'Nicaragua', tipodocumento: nombrePorId(cat.tipos_documento, 'id_tipo_documento', f.id_tipo_documento),
        documento: f.documento, telefono: texto(f.telefono), correo: f.correo, direccion: texto(f.direccion), estado: estado(f.activo),
      };
    case 'compras':
      return {
        ...base, id_proveedor: f.id_proveedor, numero_factura: texto(f.numero_factura), fecha: texto(f.fecha), fecha_entrega: texto(f.fecha_entrega), motivo_anulacion: texto(f.motivo_anulacion),
        estado: nombrePorId(cat.estados_compra, 'id_estado_compra', f.id_estado_compra),
        detalle_insumos: (f.detalles || []).map((l) => ({ id_insumo: l.id_insumo, cantidad: Number(l.cantidad), precio_unitario: Number(l.precio_unitario) })),
      };
    case 'pedidos': {
      /* detalle_pedido_insumo trae juntas la personalizacion (se cobra) y la
         copia de la receta de los productos (`de_receta`, solo inventario). */
      const linea = (l) => {
        const cantidad = Number(l.cantidad);
        const precio = Number(l.precio_unitario);
        return { id_insumo: l.id_insumo, cantidad, precio_unitario: precio, defectuosas: Number(l.defectuosas || 0), subtotal: Math.round(cantidad * precio * 100) / 100 };
      };
      return {
        ...base, id_cliente: f.id_cliente, estado: nombrePorId(cat.estados_pedido, 'id_estado_pedido', f.id_estado_pedido),
        fecha_creacion: texto(f.fecha_creacion), fecha_inicio: texto(f.fecha_inicio), fecha_entrega: texto(f.fecha_entrega),
        descripcion: texto(f.descripcion), imagen_diseno: adjunto(f.tiene_diseno),
        productos: (f.productos || []).map((l) => {
          const cantidad = Number(l.cantidad);
          const precio = Number(l.precio_unitario);
          return {
            id_producto: l.id_producto, cantidad, precio_unitario: precio, defectuosas: Number(l.defectuosas || 0),
            subtotal: Math.round(cantidad * precio * 100) / 100,
          };
        }),
        insumos: (f.insumos || []).filter((l) => !l.de_receta).map(linea),
        insumos_receta: (f.insumos || []).filter((l) => l.de_receta).map((l) => ({ id_insumo: l.id_insumo, cantidad: Number(l.cantidad) })),
        historial_estados: (f.historial || []).map((h) => ({
          estado: nombrePorId(cat.estados_pedido, 'id_estado_pedido', h.id_estado_pedido), fecha: texto(h.fecha),
        })),
      };
    }
    case 'abonos':
      return {
        ...base, id_pedido: f.id_pedido, monto: Number(f.monto), fecha: texto(f.fecha),
        metodo_pago: nombrePorId(cat.metodos_pago, 'id_metodo_pago', f.id_metodo_pago), url_comprobante: adjunto(f.tiene_comprobante),
        estado: f.anulado ? 'Anulado' : 'Vigente', motivo_anulacion: texto(f.motivo_anulacion),
      };
    case 'categorias_producto':
    case 'tipos_insumo':
      return { ...base, nombre: f.nombre, descripcion: texto(f.descripcion), estado: estado(f.activo) };
    case 'productos':
      return {
        ...base, nombre: f.nombre, id_categoria_producto: f.id_categoria_producto, id_talla: f.id_talla,
        id_insumo_tela: f.id_insumo_tela, precio_venta: Number(f.precio_venta), estado: estado(f.activo),
        receta: (f.receta || []).map((l) => ({ id_insumo: l.id_insumo, cantidad: Number(l.cantidad) })),
      };
    default:
      return { ...f, ...base };
  }
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
    tallas: lista('tallas'),
    categorias_producto: lista('categorias_producto'),
    productos: lista('productos'),
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
        id_rol: sid('roles', r.id_rol), correo_empresarial: r.correo_empresarial,
        id_tipo_documento: idPorNombre(cat.tipos_documento, 'id_tipo_documento', r.tipodocumento),
        nombre_empleado: r.nombre_empleado, documento: r.documento, telefono: r.telefono, cargo: r.cargo,
        fecha_ingreso: r.fecha_ingreso, activo, ...(r.contrasena ? { contrasena: r.contrasena } : {}),
      };
    case 'insumos':
      return {
        id_tipo_insumo: r.id_tipo_insumo, id_unidad_medida: r.id_unidad_medida, nombre: r.nombre,
        stock_minimo: r.stock_minimo, activo,
      };
    case 'proveedores':
      return {
        id_tipo_insumo: r.id_tipo_insumo, tipo_proveedor: r.tipo_proveedor, nombre: r.nombre, telefono: r.telefono, pais: r.pais, activo,
      };
    case 'clientes':
      return {
        id_tipo_documento: idPorNombre(cat.tipos_documento, 'id_tipo_documento', r.tipodocumento), pais: r.pais, nombre: r.nombre,
        documento: r.documento, telefono: r.telefono, correo: r.correo, direccion: r.direccion, activo,
      };
    case 'compras':
      return {
        id_proveedor: sid('proveedores', r.id_proveedor), id_estado_compra: idPorNombre(cat.estados_compra, 'id_estado_compra', r.estado),
        numero_factura: r.numero_factura, fecha: r.fecha, fecha_entrega: r.fecha_entrega, motivo_anulacion: r.motivo_anulacion,
        detalles: (r.detalle_insumos || []).map((l) => ({ id_insumo: sid('insumos', l.id_insumo), cantidad: l.cantidad, precio_unitario: l.precio_unitario })),
      };
    case 'pedidos':
      return {
        id_cliente: sid('clientes', r.id_cliente), id_estado_pedido: idPorNombre(cat.estados_pedido, 'id_estado_pedido', r.estado),
        fecha_creacion: r.fecha_creacion, fecha_inicio: r.fecha_inicio, fecha_entrega: r.fecha_entrega,
        descripcion: r.descripcion, ruta_imagen_diseno: subir(r.imagen_diseno),
        productos: (r.productos || []).map((l) => ({
          id_producto: sid('productos', l.id_producto), cantidad: l.cantidad, precio_unitario: l.precio_unitario, defectuosas: Number(l.defectuosas) || 0,
        })),
        insumos: (r.insumos || []).map((l) => ({ id_insumo: sid('insumos', l.id_insumo), cantidad: l.cantidad, precio_unitario: l.precio_unitario, defectuosas: Number(l.defectuosas) || 0 })),
        insumos_receta: (r.insumos_receta || []).map((l) => ({ id_insumo: sid('insumos', l.id_insumo), cantidad: l.cantidad })),
        /* El pedido que nace en proceso viaja con su abono inicial: el servidor guarda los dos o ninguno. */
        ...(r.abono_inicial ? { abono_inicial: aServidor('abonos', r.abono_inicial, cat, sid) } : {}),
      };
    case 'abonos':
      return {
        id_pedido: sid('pedidos', r.id_pedido), id_metodo_pago: idPorNombre(cat.metodos_pago, 'id_metodo_pago', r.metodo_pago),
        monto: r.monto, fecha: r.fecha, ruta_comprobante: subir(r.url_comprobante),
        anulado: r.estado === 'Anulado', motivo_anulacion: r.motivo_anulacion,
      };
    case 'categorias_producto':
    case 'tipos_insumo':
      return { nombre: r.nombre, descripcion: r.descripcion, activo };
    case 'productos':
      return {
        id_categoria_producto: sid('categorias_producto', r.id_categoria_producto), id_talla: r.id_talla,
        id_insumo_tela: sid('insumos', r.id_insumo_tela), nombre: r.nombre, precio_venta: r.precio_venta, activo,
        receta: (r.receta || []).map((l) => ({ id_insumo: sid('insumos', l.id_insumo), cantidad: l.cantidad })),
      };
    default:
      return null;
  }
}
