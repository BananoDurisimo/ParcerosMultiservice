/**
 * Catalogos del sistema: listas de valores para columnas varchar sin tabla
 * propia, estados y colores con que se muestran.
 *
 * Los valores que la base de datos NO almacena porque se calculan a partir de
 * otras tablas (total de una compra, saldo de un pedido…) no viven aqui:
 * DataContext los deriva y los expone con el prefijo `calc_`.
 */

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
/** «Mixto»: el cliente pagó el abono combinando varios métodos. El cheque ya
 *  no se acepta (016); los abonos antiguos con cheque lo conservan. */
export const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta', 'Mixto'];

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
  Mixto: 'var(--secondary)',
};

/** Colores de la dona «Compras por tipo de insumo». Las categorias las crea
 *  el usuario, asi que se asignan en orden (de la mayor a la menor) y cada
 *  porcion queda con un color distinto. Sin rojo: en el sistema es alerta. */
export const PALETA_TIPO_INSUMO = ['#2563EB', '#14B8A6', '#F59E0B', '#8B5CF6', '#0EA5E9', '#EC4899', '#22C55E', '#64748B'];

/** Valor por defecto de `insumo.stock_minimo`: cada insumo guarda su propio
 *  minimo y las alertas de inventario se comparan contra el. Este numero solo
 *  se usa para proponerlo al registrar un insumo nuevo y como respaldo si la
 *  fila todavia no lo tiene. */
export const UMBRAL_STOCK_BAJO = 20;
