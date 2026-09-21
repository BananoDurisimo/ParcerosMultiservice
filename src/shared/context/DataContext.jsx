import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  seed,
  COLOR_TIPO_INSUMO,
  COLOR_METODO_PAGO,
  UMBRAL_STOCK_BAJO,
  MODULOS_AUDITADOS,
  PEDIDO_ANULADO,
  COMPRA_ANULADA,
  ETIQUETA_ACCION,
  camposCambiados,
  etiquetaFila,
  toISO,
  hoyISO,
} from '@shared/data/mock.js';

const DataContext = createContext(null);

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Tramos del grafico de area para un periodo: dias de la semana, semanas del
 * mes o meses del año. Los pedidos no guardan hora, por eso "Hoy" muestra los
 * siete dias que terminan hoy.
 */
function tramosPeriodo(periodo, refISO) {
  const hoy = new Date(refISO + 'T00:00:00');
  const y = hoy.getFullYear(), m = hoy.getMonth();
  switch (periodo) {
    case 'Hoy':
    case 'Semana':
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(y, m, hoy.getDate() - 6 + i);
        return { l: `${DIAS[d.getDay()]} ${d.getDate()}`, desde: toISO(d), hasta: toISO(d) };
      });
    case 'Año':
      return Array.from({ length: m + 1 }, (_, i) => ({
        l: MESES[i], desde: toISO(new Date(y, i, 1)), hasta: toISO(new Date(y, i + 1, 0)),
      }));
    case 'Mes':
    default: {
      const out = [];
      for (let ini = 1, n = 1; ini <= hoy.getDate(); ini += 7, n++) {
        const fin = Math.min(ini + 6, hoy.getDate());
        out.push({ l: `S${n}`, desde: toISO(new Date(y, m, ini)), hasta: toISO(new Date(y, m, fin)) });
      }
      return out;
    }
  }
}

/**
 * Llaves foraneas que apuntan a cada coleccion. Eliminar un registro con
 * dependientes dejaria filas huerfanas (la base de datos lo rechazaria), asi
 * que la eliminacion se bloquea y se informa que registros lo usan.
 */
const REFERENCIAS = {
  roles: [{ col: 'usuarios', txt: 'usuario(s)', usa: (r, id) => r.id_rol === id }],
  usuarios: [{ col: 'movimientos', txt: 'movimiento(s) en el historial; desactívelo en su lugar', usa: (r, id) => r.id_usuario === id }],
  categorias: [{ col: 'productos', txt: 'producto(s)', usa: (r, id) => r.id_categoria === id }],
  productos: [{ col: 'variantes', txt: 'variante(s) por talla', usa: (r, id) => r.id_producto === id }],
  insumos: [
    { col: 'compras', txt: 'compra(s)', usa: (r, id) => (r.detalle_insumos || []).some((l) => l.id_insumo === id) },
    { col: 'fichas_tecnicas', txt: 'ficha(s) técnica(s)', usa: (r, id) => r.id_insumo === id },
  ],
  proveedores: [{ col: 'compras', txt: 'compra(s)', usa: (r, id) => r.id_proveedor === id }],
  clientes: [{ col: 'pedidos', txt: 'pedido(s)', usa: (r, id) => r.id_cliente === id }],
  pedidos: [{ col: 'abonos', txt: 'abono(s)', usa: (r, id) => r.id_pedido === id }],
};

/**
 * Rango [desde, hasta] de un período, tomando "ref" como el "hoy" virtual.
 * `atras = 1` devuelve el período inmediatamente anterior, que es contra el que
 * se compara cada KPI para calcular su porcentaje de variación.
 */
function rangoPeriodo(periodo, refISO, atras = 0) {
  const base = new Date(refISO + 'T00:00:00');
  const fin = new Date(base);
  let inicio;

  switch (periodo) {
    case 'Hoy':
      fin.setDate(fin.getDate() - atras);
      inicio = new Date(fin);
      break;
    case 'Semana':
      fin.setDate(fin.getDate() - atras * 7);
      inicio = new Date(fin);
      inicio.setDate(inicio.getDate() - 6);
      break;
    case 'Año':
      fin.setFullYear(fin.getFullYear() - atras);
      inicio = new Date(fin.getFullYear(), 0, 1);
      break;
    case 'Mes':
    default:
      fin.setMonth(fin.getMonth() - atras);
      inicio = new Date(fin.getFullYear(), fin.getMonth(), 1);
      break;
  }
  return { desde: toISO(inicio), hasta: toISO(fin) };
}

/** Variación porcentual de un período contra el anterior (redondeada). */
const variacion = (actual, previo) => {
  if (!previo) return actual ? 100 : 0;
  return Math.round(((actual - previo) / previo) * 100);
};

const suma = (arr, fn) => arr.reduce((s, x) => s + Number(fn(x) || 0), 0);
const porId = (arr) => new Map(arr.map((r) => [r.id, r]));

export function DataProvider({ children }) {
  const [raw, setRaw] = useState(() => JSON.parse(JSON.stringify(seed)));

  const nextId = (arr) => (arr.length ? Math.max(...arr.map((r) => r.id)) + 1 : 1);

  const create = useCallback((col, row) => {
    let creado;
    setRaw((d) => {
      creado = { ...row, id: nextId(d[col]) };
      return { ...d, [col]: [creado, ...d[col]] };
    });
    return creado;
  }, []);

  const update = useCallback((col, id, patch) => {
    setRaw((d) => ({ ...d, [col]: d[col].map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  }, []);

  const remove = useCallback((col, id) => {
    setRaw((d) => ({ ...d, [col]: d[col].filter((r) => r.id !== id) }));
  }, []);

  /** Registros que impiden eliminar la fila `id` de `col`, p. ej. ["3 pedido(s)"]. */
  const dependencias = useCallback(
    (col, id) =>
      (REFERENCIAS[col] || [])
        .map(({ col: hija, txt, usa }) => ({ n: raw[hija].filter((r) => usa(r, id)).length, txt }))
        .filter((d) => d.n > 0)
        .map((d) => `${d.n} ${d.txt}`),
    [raw]
  );

  /* --------------------------------------------------------------
     Valores derivados.

     La base de datos no guarda totales, saldos ni contadores: se
     obtienen recorriendo las tablas relacionadas. Aquí se calculan una
     sola vez y se adjuntan a cada fila con el prefijo `calc_`, de modo
     que las tablas puedan mostrarlos y ordenarlos como una columna más
     sin que lleguen nunca al formulario de creación o edición.
     -------------------------------------------------------------- */
  const db = useMemo(() => {
    const tallas = porId(raw.tallas);
    const tipos = porId(raw.tipos_insumo);
    const unidades = porId(raw.unidades_medida);
    const permisos = porId(raw.permisos);
    const rolesM = porId(raw.roles);
    const categoriasM = porId(raw.categorias);
    const productosM = porId(raw.productos);
    const insumosM = porId(raw.insumos);
    const proveedoresM = porId(raw.proveedores);
    const clientesM = porId(raw.clientes);
    const usuariosM = porId(raw.usuarios);

    const variantes = raw.variantes.map((v) => {
      const p = productosM.get(v.id_producto);
      const t = tallas.get(v.id_talla);
      return {
        ...v,
        calc_producto: p?.nombre || '—',
        calc_talla: t?.nombre || '—',
        calc_etiqueta: `${p?.nombre || '—'} · ${t?.nombre || '—'}`,
      };
    });
    const variantesM = porId(variantes);

    const insumos = raw.insumos.map((i) => ({
      ...i,
      calc_tipo: tipos.get(i.id_tipo_insumo)?.nombre || '—',
      calc_unidad: unidades.get(i.id_unidad_medida)?.nombre || '—',
      calc_abreviatura: unidades.get(i.id_unidad_medida)?.abreviatura || '',
      calc_valor: Number(i.stock) * Number(i.precio_unitario),
    }));

    const totalCompra = (c) =>
      suma(c.detalle_insumos || [], (l) => l.cantidad * l.precio_unitario) +
      suma(c.detalle_productos || [], (l) => l.cantidad * l.precio_unitario);

    const compras = raw.compras.map((c) => ({
      ...c,
      calc_proveedor: proveedoresM.get(c.id_proveedor)?.nombre || '—',
      calc_total: totalCompra(c),
      calc_lineas: (c.detalle_insumos || []).length + (c.detalle_productos || []).length,
    }));

    const abonadoPorPedido = new Map();
    raw.abonos.forEach((a) => {
      abonadoPorPedido.set(a.id_pedido, (abonadoPorPedido.get(a.id_pedido) || 0) + Number(a.monto || 0));
    });

    /* El total del pedido suma los productos base (detalle_pedido) y los
       insumos que se gastan en la personalizacion (detalle_pedido_insumo). */
    const lineaSubtotal = (l) => l.subtotal ?? l.cantidad * l.precio_unitario;
    const pedidos = raw.pedidos.map((p) => {
      const totalProductos = suma(p.detalles || [], lineaSubtotal);
      const totalInsumos = suma(p.insumos || [], lineaSubtotal);
      const total = totalProductos + totalInsumos;
      const abonado = abonadoPorPedido.get(p.id) || 0;
      return {
        ...p,
        calc_cliente: clientesM.get(p.id_cliente)?.nombre || '—',
        calc_total_productos: totalProductos,
        calc_total_insumos: totalInsumos,
        calc_total: total,
        calc_abonado: abonado,
        calc_saldo: Math.max(0, total - abonado),
        calc_lineas: (p.detalles || []).length,
      };
    });
    const pedidosM = porId(pedidos);

    const abonos = raw.abonos.map((a) => {
      const p = pedidosM.get(a.id_pedido);
      return {
        ...a,
        calc_pedido: p ? `PED-${String(p.id).padStart(4, '0')}` : '—',
        calc_cliente: p?.calc_cliente || '—',
        calc_total_pedido: p?.calc_total || 0,
        calc_saldo: p?.calc_saldo ?? 0,
      };
    });

    const cuenta = (arr, campo) => {
      const m = new Map();
      arr.forEach((r) => m.set(r[campo], (m.get(r[campo]) || 0) + 1));
      return m;
    };
    const usuariosPorRol = cuenta(raw.usuarios, 'id_rol');
    const productosPorCategoria = cuenta(raw.productos, 'id_categoria');
    const comprasPorProveedor = cuenta(raw.compras, 'id_proveedor');
    const pedidosPorCliente = cuenta(raw.pedidos, 'id_cliente');

    const stockPorProducto = new Map();
    const tallasPorProducto = new Map();
    raw.variantes.forEach((v) => {
      stockPorProducto.set(v.id_producto, (stockPorProducto.get(v.id_producto) || 0) + Number(v.stock || 0));
      const lista = tallasPorProducto.get(v.id_producto) || [];
      lista.push(tallas.get(v.id_talla)?.nombre || '—');
      tallasPorProducto.set(v.id_producto, lista);
    });

    return {
      // catálogos
      permisos: raw.permisos,
      tallas: raw.tallas,
      tipos_insumo: raw.tipos_insumo,
      unidades_medida: raw.unidades_medida,
      variantes,
      fichas_tecnicas: raw.fichas_tecnicas.map((f) => ({
        ...f,
        calc_insumo: insumosM.get(f.id_insumo)?.nombre || '—',
        calc_variante: variantesM.get(f.id_varianteproducto)?.calc_etiqueta || '—',
      })),

      roles: raw.roles.map((r) => ({
        ...r,
        calc_usuarios: usuariosPorRol.get(r.id) || 0,
        calc_permisos: (r.permisos || []).map((id) => permisos.get(id)?.nombre).filter(Boolean),
      })),

      usuarios: raw.usuarios.map((u) => ({
        ...u,
        calc_rol: rolesM.get(u.id_rol)?.nombre || '—',
      })),

      categorias: raw.categorias.map((c) => ({
        ...c,
        calc_productos: productosPorCategoria.get(c.id) || 0,
      })),

      productos: raw.productos.map((p) => ({
        ...p,
        calc_categoria: categoriasM.get(p.id_categoria)?.nombre || '—',
        calc_stock: stockPorProducto.get(p.id) || 0,
        calc_variantes: (tallasPorProducto.get(p.id) || []).length,
        calc_tallas: tallasPorProducto.get(p.id) || [],
      })),

      insumos,

      proveedores: raw.proveedores.map((p) => ({
        ...p,
        calc_tipo_insumo: tipos.get(p.id_tipo_insumo)?.nombre || '—',
        calc_compras: comprasPorProveedor.get(p.id) || 0,
      })),

      compras,

      clientes: raw.clientes.map((c) => ({
        ...c,
        calc_pedidos: pedidosPorCliente.get(c.id) || 0,
      })),

      pedidos,
      abonos,

      /* Historial: solo lectura. Se resuelve el modulo, el responsable y el
         registro afectado (el nombre sale del propio JSON guardado por el
         trigger, porque la fila original pudo haberse eliminado). */
      movimientos: raw.movimientos.map((m) => {
        const u = usuariosM.get(m.id_usuario);
        const cambios = camposCambiados(m.valor_anterior, m.valor_nuevo);
        return {
          ...m,
          calc_modulo: MODULOS_AUDITADOS[m.tabla] || m.tabla,
          calc_accion: ETIQUETA_ACCION[m.accion] || m.accion,
          calc_usuario: u?.nombre_empleado || 'Sistema',
          calc_alias: u?.nombre_usuario || '—',
          calc_registro: etiquetaFila(m.valor_nuevo || m.valor_anterior || {}) === '—'
            ? `#${m.id_registro}`
            : etiquetaFila(m.valor_nuevo || m.valor_anterior),
          calc_cambios: cambios,
          calc_total_cambios: cambios.length,
          calc_fecha: m.fecha_cambio.slice(0, 10),
        };
      }),
    };
  }, [raw]);

  /** Opciones `{value, label}` para los select de llave foránea. */
  const opciones = useCallback(
    (coleccion, etiqueta = (r) => r.nombre) => db[coleccion].map((r) => ({ value: r.id, label: etiqueta(r) })),
    [db]
  );

  /* "Hoy" del sistema: fijo, para que crear un registro no desplace los
     filtros Hoy/Semana/Mes/Año del dashboard. */
  const refFecha = hoyISO();

  /* ---- Indicadores globales (no dependen del período) ----
     Los pedidos anulados se conservan en el listado, pero no se toman en
     cuenta en ningun indicador (igual que las compras anuladas). */
  const stats = useMemo(() => {
    const bajoStock = db.insumos.filter((i) => i.stock <= UMBRAL_STOCK_BAJO);
    const vigentes = db.pedidos.filter((p) => p.estado !== PEDIDO_ANULADO);
    return {
      porCobrar: suma(vigentes, (p) => p.calc_saldo),
      recaudado: suma(db.abonos, (a) => a.monto),
      bajoStock,
      pedidosActivos: vigentes.filter((p) => p.estado !== 'Entregado / vendido').length,
      totalPedidos: vigentes.length,
      valorInventario: suma(db.insumos, (i) => i.calc_valor),
    };
  }, [db]);

  /* ---- Indicadores y series que SÍ dependen del período (dashboard) ---- */
  const getStats = useCallback((periodo = 'Mes') => {
    const { desde, hasta } = rangoPeriodo(periodo, refFecha);
    const previo = rangoPeriodo(periodo, refFecha, 1);

    const enRango = (f, r) => f >= r.desde && f <= r.hasta;
    const pedidosDe = (r) => db.pedidos.filter((p) => enRango(p.fecha_inicio, r) && p.estado !== PEDIDO_ANULADO);
    const comprasDe = (r) => db.compras.filter((c) => enRango(c.fecha, r) && c.estado !== COMPRA_ANULADA);
    const abonosDe = (r) => db.abonos.filter((a) => enRango(a.fecha, r));

    const pedidosPeriodo = pedidosDe({ desde, hasta });
    const comprasPeriodo = comprasDe({ desde, hasta });
    const abonosPeriodo = abonosDe({ desde, hasta });

    const pedidosPrevio = pedidosDe(previo);
    const comprasPrevio = comprasDe(previo);

    const ventasMes = suma(pedidosPeriodo, (p) => p.calc_total);
    const comprasMes = suma(comprasPeriodo, (c) => c.calc_total);
    const recaudadoPeriodo = suma(abonosPeriodo, (a) => a.monto);

    /* 0. Ventas / Compras por tramo del periodo (linea de area) */
    const tramos = tramosPeriodo(periodo, refFecha);
    const serie = {
      ventas: tramos.map((t) => ({ l: t.l, v: suma(pedidosDe(t), (p) => p.calc_total) })),
      compras: tramos.map((t) => ({ l: t.l, v: suma(comprasDe(t), (c) => c.calc_total) })),
    };

    /* 1. Pedidos por estado (barras) */
    const porEstado = {};
    pedidosPeriodo.forEach((p) => { porEstado[p.estado] = (porEstado[p.estado] || 0) + 1; });

    /* 2. Compras por tipo de insumo (dona) */
    const porTipo = {};
    comprasPeriodo.forEach((c) => {
      (c.detalle_insumos || []).forEach((l) => {
        const tipo = db.insumos.find((i) => i.id === l.id_insumo)?.calc_tipo || 'Otros';
        porTipo[tipo] = (porTipo[tipo] || 0) + l.cantidad * l.precio_unitario;
      });
      (c.detalle_productos || []).forEach((l) => {
        porTipo.Otros = (porTipo.Otros || 0) + l.cantidad * l.precio_unitario;
      });
    });
    const comprasPorCategoria = Object.entries(porTipo)
      .map(([tipo, value]) => ({ label: tipo, value, color: COLOR_TIPO_INSUMO[tipo] || 'var(--error)' }))
      .sort((a, b) => b.value - a.value);

    /* 3. Productos más vendidos (barras horizontales): se recorre detalle_pedido
          y se agrupa por producto, sin importar la talla de la variante. */
    const porProducto = new Map();
    pedidosPeriodo.forEach((p) => {
      (p.detalles || []).forEach((l) => {
        const v = db.variantes.find((x) => x.id === l.id_varianteproducto);
        const nombre = v?.calc_producto || 'Sin producto';
        const acum = porProducto.get(nombre) || { monto: 0, unidades: 0 };
        acum.monto += Number(l.subtotal ?? l.cantidad * l.precio_unitario);
        acum.unidades += Number(l.cantidad || 0);
        porProducto.set(nombre, acum);
      });
    });
    const topProductos = [...porProducto]
      .map(([l, a]) => ({ l, v: a.monto, unidades: a.unidades, nota: `${a.unidades} u.` }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 5);

    /* El primero de esa lista alimenta el KPI "Producto más vendido". */
    const topProducto = topProductos[0] || null;

    /* 4. Recaudo por método de pago (dona) */
    const porMetodo = {};
    abonosPeriodo.forEach((a) => { porMetodo[a.metodo_pago] = (porMetodo[a.metodo_pago] || 0) + Number(a.monto || 0); });
    const recaudoPorMetodo = Object.entries(porMetodo)
      .map(([label, value]) => ({ label, value, color: COLOR_METODO_PAGO[label] || 'var(--text-sec)' }))
      .sort((a, b) => b.value - a.value);

    /* 4. Existencias más bajas (barras horizontales): no depende del período,
          es la foto actual de la tabla `insumo`. */
    const existencias = [...db.insumos]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6)
      .map((i) => ({
        l: i.nombre,
        v: Number(i.stock),
        nota: i.calc_abreviatura || '',
        color: i.stock === 0 ? 'var(--error)' : i.stock <= UMBRAL_STOCK_BAJO ? 'var(--warning)' : 'var(--success)',
      }));

    return {
      ventasMes,
      comprasMes,
      recaudadoPeriodo,
      porCobrar: stats.porCobrar,
      pedidosActivos: stats.pedidosActivos,
      bajoStock: stats.bajoStock,
      // series de los cinco gráficos
      serie,
      porEstado,
      comprasPorCategoria,
      topProductos,
      topProducto,
      recaudoPorMetodo,
      existencias,
      // variación real de cada KPI contra el período anterior
      tendencias: {
        ventas: variacion(ventasMes, suma(pedidosPrevio, (p) => p.calc_total)),
        compras: variacion(comprasMes, suma(comprasPrevio, (c) => c.calc_total)),
        recaudado: variacion(recaudadoPeriodo, suma(abonosDe(previo), (a) => a.monto)),
        pedidos: variacion(pedidosPeriodo.length, pedidosPrevio.length),
      },
    };
  }, [db, refFecha, stats]);

  const notificaciones = useMemo(() => {
    const out = [];
    stats.bajoStock.slice(0, 4).forEach((i) =>
      out.push({
        id: 'stk' + i.id,
        tipo: i.stock === 0 ? 'error' : 'warning',
        titulo: i.stock === 0 ? 'Insumo agotado' : 'Existencias bajas',
        texto: `${i.nombre} — ${i.stock} ${i.calc_abreviatura || i.calc_unidad.toLowerCase()} disponibles.`,
        tiempo: 'Hace 1 h',
      })
    );
    db.pedidos
      .filter((p) => p.estado === 'Completado - falta pago')
      .slice(0, 3)
      .forEach((p) =>
        out.push({
          id: 'ped' + p.id,
          tipo: 'info',
          titulo: 'Pedido con saldo pendiente',
          texto: `PED-${String(p.id).padStart(4, '0')} — ${p.calc_cliente} tiene saldo por cobrar.`,
          tiempo: 'Hoy',
        })
      );
    db.compras
      .filter((c) => c.estado === 'En tránsito')
      .slice(0, 2)
      .forEach((c) =>
        out.push({
          id: 'cmp' + c.id,
          tipo: 'success',
          titulo: 'Compra en tránsito',
          texto: `CMP-${String(c.id).padStart(4, '0')} — ${c.calc_proveedor}.`,
          tiempo: 'Ayer',
        })
      );
    return out;
  }, [db, stats]);

  return (
    <DataContext.Provider value={{ db, opciones, create, update, remove, dependencias, stats, getStats, notificaciones }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
