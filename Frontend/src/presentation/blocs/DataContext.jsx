import { createContext, useContext, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { leerToken } from '@data/datasources/sesionLocal.js';
import * as datosRepo from '@data/repositories/datosRepository.js';
import * as authRepo from '@data/repositories/authRepository.js';
import { aServidor } from '@data/mappers/adaptador.js';
import { VACIO } from '@data/models/colecciones.js';
import { useToast } from '@presentation/blocs/ToastContext.jsx';
import {
  PALETA_TIPO_INSUMO,
  COLOR_METODO_PAGO,
  UMBRAL_STOCK_BAJO,
  ESTADOS_PEDIDO,
  COTIZACION,
  EN_PROCESO,
  FALTA_PAGO,
  COMPRA_ANULADA,
} from '@core/constants/catalogos.js';
import {
  codigoCompra,
  codigoPedido,
  codigoAbono,
  toISO,
  hoyISO,
} from '@core/utils/formato.js';

import { tramosPeriodo, rangoPeriodo, variacion } from '@domain/usecases/periodos.js';
import { consumeInventario, consumoPedido } from '@domain/usecases/pedidos.js';

const DataContext = createContext(null);

/* Estados que dan de baja una fila: deja de ofrecerse para registros nuevos,
   pero no desaparece de ningun lado. Los documentos que ya la usan tienen que
   seguir mostrando su nombre, asi que la opcion se sigue listando -marcada con
   el motivo- y es el desplegable el que no deja elegirla. */
const ESTADOS_DE_BAJA = ['Inactivo', 'Anulada'];
const motivoBaja = (r) => (ESTADOS_DE_BAJA.includes(r.estado) && r.estado) || undefined;

const suma = (arr, fn) => arr.reduce((s, x) => s + Number(fn(x) || 0), 0);
const porId = (arr) => new Map(arr.map((r) => [r.id, r]));
const redondear = (n) => Math.round(n * 100) / 100;

export function DataProvider({ children }) {
  const toast = useToast();
  const [raw, setRaw] = useState(VACIO);
  const rawRef = useRef(raw);

  /* Los cambios se aplican sobre rawRef de inmediato (no al siguiente render)
     para que dos operaciones seguidas -p. ej. un pedido y su abono inicial-
     vean cada una el resultado de la anterior. */
  const aplicar = useCallback((fn) => {
    rawRef.current = fn(rawRef.current);
    setRaw(rawRef.current);
  }, []);

  /* --------------------------------------------------------------
     Datos del servidor

     `estadoDatos`: 'inactivo' (sin sesion) · 'cargando' · 'listo' · 'error'.
     Cada escritura se ve en pantalla al instante y se envia a la API en una
     cola, una tras otra y en el mismo orden. Al vaciarse la cola se vuelve a
     leer todo, para tomar lo que calcula la base de datos (ids definitivos,
     existencias). Si el servidor rechaza un cambio, se avisa y se
     recargan los datos, con lo que la pantalla vuelve a lo guardado.

     Solo la primera carga (al iniciar sesion o al abrir la pagina) muestra
     la pantalla de «Conectando con el servidor…». Las recargas que siguen a
     un cambio van en segundo plano: el usuario sigue trabajando mientras
     tanto y `sincronizando` alimenta el aviso discreto de la barra superior.
     -------------------------------------------------------------- */
  const [estadoDatos, setEstadoDatos] = useState(() => (leerToken() ? 'cargando' : 'inactivo'));
  const [errorDatos, setErrorDatos] = useState('');
  const [sincronizando, setSincronizando] = useState(false);

  /* Ids creados en el navegador -> id que asigno el servidor. */
  const idsServidor = useRef({});
  const sid = useCallback((col, id) => idsServidor.current[col]?.get(id) ?? id, []);
  const cola = useRef(Promise.resolve());
  const pendientes = useRef(0);
  /* Cada recarga lleva un numero: solo se aplica la respuesta de la ultima. */
  const recarga = useRef(0);

  /** `segundoPlano`: recarga sin bloquear la pantalla (despues de un cambio). */
  const cargar = useCallback(async ({ segundoPlano = false } = {}) => {
    const n = ++recarga.current;
    if (!segundoPlano) {
      setEstadoDatos('cargando');
      setErrorDatos('');
    }
    try {
      const d = await datosRepo.cargarDatos();
      /* Si mientras llegaba la respuesta se hizo otro cambio (o salio otra
         recarga), estos datos ya estan viejos: pisarian lo que el usuario
         acaba de hacer. Se descartan; la cola vuelve a recargar al vaciarse. */
      if (n !== recarga.current || (segundoPlano && pendientes.current > 0)) return;
      rawRef.current = d;
      setRaw(d);
      /* Con los datos del servidor en pantalla ya no quedan ids del navegador. */
      idsServidor.current = {};
      setEstadoDatos('listo');
      setSincronizando(false);
    } catch (e) {
      if (n !== recarga.current) return;
      setSincronizando(false);
      if (segundoPlano && e.status !== 401) {
        /* Los datos en pantalla siguen siendo validos: se avisa sin sacar al
           usuario de lo que esta haciendo. */
        toast.warning('No se pudieron actualizar los datos desde el servidor. Se reintentará con el próximo cambio.', 'Sin conexión');
        return;
      }
      setErrorDatos(e.message);
      setEstadoDatos(e.status === 401 ? 'inactivo' : 'error');
    }
  }, [toast]);

  const vaciar = useCallback(() => {
    recarga.current += 1;
    rawRef.current = VACIO;
    setRaw(VACIO);
    setEstadoDatos('inactivo');
    setSincronizando(false);
  }, []);

  useEffect(() => { if (leerToken()) cargar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sincronizar = useCallback((tarea) => {
    pendientes.current += 1;
    setSincronizando(true);
    cola.current = cola.current
      .then(tarea)
      .catch((e) => {
        /* La recarga del final devuelve la pantalla a lo que quedo guardado. */
        toast.error(e.message, 'No se guardó el cambio');
      })
      .finally(() => {
        pendientes.current = Math.max(0, pendientes.current - 1);
        if (pendientes.current === 0) cargar({ segundoPlano: true });
      });
  }, [cargar, toast]);

  const cuerpo = (col, row) => aServidor(col, row, rawRef.current.catalogos, sid);

  /* Ids: se reservan aqui -y no dentro de la actualizacion de estado- para que
     quien crea un registro conozca su id de inmediato (p. ej. el pedido que
     nace con su abono inicial). */
  const ultimoId = useRef({});
  const nuevoId = useCallback((col) => {
    const max = Math.max(0, ...rawRef.current[col].map((r) => r.id), ultimoId.current[col] || 0);
    ultimoId.current[col] = max + 1;
    return max + 1;
  }, []);

  /* Cada cambio se ve al instante; las existencias las recalcula la
     base de datos y llegan con la recarga que sigue a la cola. */
  const create = useCallback((col, row) => {
    const creado = { ...row, id: row.id ?? nuevoId(col) };
    sincronizar(async () => {
      const fila = await datosRepo.crearRegistro(col, cuerpo(col, creado));
      const pk = Object.keys(fila).find((k) => k.startsWith('id_'));
      (idsServidor.current[col] ||= new Map()).set(creado.id, fila[pk]);
    });
    aplicar((d) => ({ ...d, [col]: [creado, ...d[col]] }));
    return creado;
  }, [nuevoId, aplicar, sincronizar]);

  const update = useCallback((col, id, patch) => {
    const previo = rawRef.current[col].find((r) => r.id === id);
    if (!previo) return;
    sincronizar(() => datosRepo.actualizarRegistro(col, sid(col, id), cuerpo(col, { ...previo, ...patch })));
    aplicar((d) => ({ ...d, [col]: d[col].map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  }, [aplicar, sincronizar, sid]);

  const remove = useCallback((col, id) => {
    sincronizar(() => datosRepo.eliminarRegistro(col, sid(col, id)));
    aplicar((d) => ({ ...d, [col]: d[col].filter((r) => r.id !== id) }));
  }, [aplicar, sincronizar, sid]);

  /* --------------------------------------------------------------
     Recuperacion de contrasena: el servidor envia por correo un enlace
     de un solo uso, valido 30 minutos. Son rutas publicas (sin sesion).
     -------------------------------------------------------------- */
  const solicitarRecuperacion = useCallback((correo) => authRepo.solicitarRecuperacion(correo), []);
  const enlaceValido = useCallback((token) => authRepo.validarEnlace(token), []);
  const restablecerClave = useCallback((token, nueva) => authRepo.restablecerClave(token, nueva), []);

  /* --------------------------------------------------------------
     Valores derivados.

     La base de datos no guarda totales, saldos ni contadores: se
     obtienen recorriendo las tablas relacionadas. Aquí se calculan una
     sola vez y se adjuntan a cada fila con el prefijo `calc_`, de modo
     que las tablas puedan mostrarlos y ordenarlos como una columna más
     sin que lleguen nunca al formulario de creación o edición.
     -------------------------------------------------------------- */
  const db = useMemo(() => {
    const tipos = porId(raw.tipos_insumo);
    const unidades = porId(raw.unidades_medida);
    const permisos = porId(raw.permisos);
    const rolesM = porId(raw.roles);
    const insumosM = porId(raw.insumos);
    const proveedoresM = porId(raw.proveedores);
    const clientesM = porId(raw.clientes);
    const tallasM = porId(raw.tallas);
    const categoriasM = porId(raw.categorias_producto);

    /* El insumo no tiene precio: su costo es lo que se pago por el en la
       compra vigente mas reciente. Sirve para valorar lo que se pierde en las
       prendas defectuosas. */
    const costoInsumo = new Map();
    [...raw.compras]
      .filter((c) => c.estado !== COMPRA_ANULADA)
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || b.id - a.id)
      .forEach((c) => (c.detalle_insumos || []).forEach((l) => {
        if (!costoInsumo.has(l.id_insumo)) costoInsumo.set(l.id_insumo, Number(l.precio_unitario) || 0);
      }));

    const insumos = raw.insumos.map((i) => ({
      ...i,
      calc_tipo: tipos.get(i.id_tipo_insumo)?.nombre || '—',
      calc_unidad: unidades.get(i.id_unidad_medida)?.nombre || '—',
      calc_abreviatura: unidades.get(i.id_unidad_medida)?.abreviatura || '',
      calc_minimo: Number(i.stock_minimo ?? UMBRAL_STOCK_BAJO),
      calc_costo: costoInsumo.get(i.id) ?? 0,
    }));

    const compras = raw.compras.map((c) => ({
      ...c,
      calc_codigo: codigoCompra(c.id),
      calc_proveedor: proveedoresM.get(c.id_proveedor)?.nombre || '—',
      calc_total: suma(c.detalle_insumos || [], (l) => l.cantidad * l.precio_unitario),
      calc_lineas: (c.detalle_insumos || []).length,
      /* Insumos que trae la compra: el filtro y la busqueda responden "que
         compras traen este insumo" sin abrir el detalle de cada una. */
      calc_insumos: (c.detalle_insumos || []).map((l) => l.id_insumo),
      calc_insumos_txt: (c.detalle_insumos || []).map((l) => insumosM.get(l.id_insumo)?.nombre || '').join(' · '),
    }));

    /* Producto base: prenda (categoria) + talla + tela, con su receta. Lo
       que se cobra es su precio de venta: los insumos no tienen precio. */
    const productos = raw.productos.map((pr) => {
      return {
        ...pr,
        calc_categoria: categoriasM.get(pr.id_categoria_producto)?.nombre || '—',
        calc_talla: tallasM.get(pr.id_talla)?.nombre || '—',
        calc_tela: insumosM.get(pr.id_insumo_tela)?.nombre || '—',
        calc_lineas_receta: (pr.receta || []).length,
        calc_receta_txt: (pr.receta || []).map((l) => insumosM.get(l.id_insumo)?.nombre || '').join(' · '),
        calc_insumos: (pr.receta || []).map((l) => l.id_insumo),
      };
    });
    const productosM = porId(productos);

    /* Un abono anulado se conserva como registro, pero no cuenta en lo
       abonado ni en el saldo del pedido. */
    const abonosPorPedido = new Map();
    raw.abonos.filter((a) => a.estado !== 'Anulado').forEach((a) => {
      abonosPorPedido.set(a.id_pedido, [...(abonosPorPedido.get(a.id_pedido) || []), a]);
    });

    /* El total del registro es lo que se cobra: los productos (cantidad x
       precio de venta) mas los insumos de personalizacion. La receta de los
       productos no suma: solo descuenta inventario. El saldo es el total
       menos los abonos. */
    const pedidos = raw.pedidos.map((p) => {
      const totalProductos = redondear(suma(p.productos || [], (l) => l.subtotal ?? l.cantidad * l.precio_unitario));
      const totalInsumos = redondear(suma(p.insumos || [], (l) => l.subtotal ?? l.cantidad * l.precio_unitario));
      const total = redondear(totalProductos + totalInsumos);
      const abonos = abonosPorPedido.get(p.id) || [];
      const abonado = redondear(suma(abonos, (a) => a.monto));
      /* Abonar es vender: el registro cuenta como venta desde su primer abono
         vigente, y esa es su fecha de venta. */
      const vendido = abonos.length > 0;
      const primerAbono = abonos.map((a) => a.fecha).filter(Boolean).sort()[0];
      return {
        ...p,
        calc_codigo: codigoPedido(p.id),
        calc_cliente: clientesM.get(p.id_cliente)?.nombre || '—',
        calc_total: total,
        calc_abonado: abonado,
        calc_saldo: Math.max(0, redondear(total - abonado)),
        calc_pct: total ? Math.round((abonado / total) * 100) : 0,
        calc_abonos: abonos.length,
        calc_abono_inicial: abonos.length ? 'Registrado' : 'Pendiente',
        calc_vendido: vendido,
        calc_fecha_venta: vendido ? (primerAbono || p.fecha_inicio || '') : '',
        /* Una cotizacion vale hasta el 31 de diciembre del año en que se creo;
           vencida, ya no recibe abonos ni pasa a pedido (la base de datos
           tambien lo impide, 013). */
        calc_vigencia: p.fecha_creacion ? `${p.fecha_creacion.slice(0, 4)}-12-31` : '',
        calc_vencida: p.estado === COTIZACION && !!p.fecha_creacion && hoyISO() > `${p.fecha_creacion.slice(0, 4)}-12-31`,
        calc_total_productos: totalProductos,
        calc_total_insumos: totalInsumos,
        calc_lineas: (p.insumos || []).length + (p.productos || []).length,
        calc_prendas: suma(p.productos || [], (l) => l.cantidad),
        calc_defectuosas: suma(p.productos || [], (l) => l.defectuosas),
        calc_productos_txt: (p.productos || []).map((l) => productosM.get(l.id_producto)?.nombre || '').join(' · '),
      };
    });
    const pedidosM = porId(pedidos);

    const abonos = raw.abonos.map((a) => {
      const p = pedidosM.get(a.id_pedido);
      return {
        ...a,
        calc_codigo: codigoAbono(a.id),
        calc_pedido: p ? p.calc_codigo : '—',
        calc_cliente: p?.calc_cliente || '—',
        calc_total_pedido: p?.calc_total || 0,
        calc_saldo: p?.calc_saldo ?? 0,
        calc_estado_pedido: p?.estado || '—',
      };
    });

    const cuenta = (arr, campo) => {
      const m = new Map();
      arr.forEach((r) => m.set(r[campo], (m.get(r[campo]) || 0) + 1));
      return m;
    };
    const usuariosPorRol = cuenta(raw.usuarios, 'id_rol');
    const comprasPorProveedor = cuenta(raw.compras, 'id_proveedor');
    const pedidosPorCliente = cuenta(raw.pedidos, 'id_cliente');
    const productosPorCategoria = cuenta(raw.productos, 'id_categoria_producto');
    const pedidosPorProducto = new Map();
    raw.pedidos.forEach((p) => (p.productos || []).forEach((l) => pedidosPorProducto.set(l.id_producto, (pedidosPorProducto.get(l.id_producto) || 0) + 1)));

    return {
      // catálogos
      permisos: raw.permisos,
      privilegios: raw.privilegios,
      /* Categorias de insumo: cuantos insumos y proveedores las usan. */
      tipos_insumo: raw.tipos_insumo.map((t) => ({
        ...t,
        calc_insumos: raw.insumos.filter((i) => i.id_tipo_insumo === t.id).length,
        calc_proveedores: raw.proveedores.filter((p) => p.id_tipo_insumo === t.id).length,
      })),
      unidades_medida: raw.unidades_medida,
      tallas: raw.tallas,

      categorias_producto: raw.categorias_producto.map((c) => ({
        ...c,
        calc_productos: productosPorCategoria.get(c.id) || 0,
      })),

      productos: productos.map((pr) => ({ ...pr, calc_pedidos: pedidosPorProducto.get(pr.id) || 0 })),

      roles: raw.roles.map((r) => ({
        ...r,
        calc_usuarios: usuariosPorRol.get(r.id) || 0,
        calc_permisos: (r.permisos || []).map((id) => permisos.get(id)?.nombre).filter(Boolean),
        calc_total_permisos: (r.permisos || []).length,
        calc_total_privilegios: (r.privilegios || []).length,
        /* Texto fijo para poder filtrar por asignacion: el filtro de la tabla
           compara valores exactos, no cuenta registros. */
        calc_uso: (usuariosPorRol.get(r.id) || 0) > 0 ? 'Con usuarios' : 'Sin usuarios',
      })),

      usuarios: raw.usuarios.map((u) => ({
        ...u,
        calc_rol: rolesM.get(u.id_rol)?.nombre || '—',
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
    };
  }, [raw]);

  /** Opciones `{value, label, baja}` para los select de llave foránea: `baja`
   *  lleva el motivo cuando la fila ya no se puede elegir (ver `motivoBaja`,
   *  o el criterio propio que reciba). La lista siempre viene completa, de
   *  modo que los registros que ya apuntan a una fila dada de baja sigan
   *  mostrando su nombre. */
  const opciones = useCallback(
    (coleccion, etiqueta = (r) => r.nombre, baja = motivoBaja) =>
      db[coleccion].map((r) => ({ value: r.id, label: etiqueta(r), baja: baja(r) })),
    [db]
  );

  /**
   * Insumos que no alcanzan para las lineas de un pedido: [{ nombre, pide, hay }].
   * `anterior` es el registro tal como esta guardado; si ya venia descontando,
   * lo suyo vuelve a contar como disponible para el mismo registro.
   */
  const faltantes = useCallback((lineas, anterior) => {
    const yaDescontado = anterior && consumeInventario(anterior.estado) ? consumoPedido(anterior) : [];
    const pide = new Map();
    (lineas || []).forEach((l) => pide.set(l.id_insumo, (pide.get(l.id_insumo) || 0) + Number(l.cantidad || 0)));
    const out = [];
    for (const [id, cantidad] of pide) {
      const fila = db.insumos.find((x) => String(x.id) === String(id));
      if (!fila) continue;
      const propio = suma(yaDescontado.filter((l) => String(l.id_insumo) === String(id)), (l) => l.cantidad);
      const hay = redondear(Number(fila.stock || 0) + propio);
      if (cantidad > hay) out.push({ nombre: fila.nombre, pide: cantidad, hay });
    }
    return out;
  }, [db]);

  /**
   * Receta de las lineas de producto de un pedido, agrupada por insumo:
   * [{ id_insumo, cantidad }]. Es la que se copia al pedido al guardarlo.
   */
  const expandirReceta = useCallback((lineasProducto = []) => {
    const total = new Map();
    lineasProducto.forEach((l) => {
      const pr = db.productos.find((x) => String(x.id) === String(l.id_producto));
      (pr?.receta || []).forEach((r) => {
        total.set(r.id_insumo, (total.get(r.id_insumo) || 0) + Number(r.cantidad) * Number(l.cantidad || 0));
      });
    });
    return [...total].map(([id_insumo, cantidad]) => ({ id_insumo, cantidad: Math.round(cantidad * 1000) / 1000 }));
  }, [db]);

  /* "Hoy" del sistema: fijo, para que crear un registro no desplace los
     filtros Hoy/Semana/Mes/Año del dashboard. */
  const refFecha = hoyISO();

  /* ---- Indicadores globales (no dependen del período) ----
     Las cotizaciones todavia no son ventas, asi que solo cuentan los
     registros que ya pasaron a pedido. */
  const stats = useMemo(() => {
    const bajoStock = db.insumos.filter((i) => i.stock <= i.calc_minimo);
    const vendidos = db.pedidos.filter((p) => p.estado !== COTIZACION);
    return {
      porCobrar: suma(vendidos, (p) => p.calc_saldo),
      recaudado: suma(db.abonos.filter((a) => a.estado !== 'Anulado'), (a) => a.monto),
      bajoStock,
      /* Un pedido completado ya es venta: activos son los que se elaboran o
         esperan el pago. */
      pedidosActivos: vendidos.filter((p) => p.estado === EN_PROCESO || p.estado === FALTA_PAGO).length,
      totalPedidos: db.pedidos.length,
    };
  }, [db]);

  /* ---- Indicadores y series que SÍ dependen del período (dashboard) ---- */
  const getStats = useCallback((periodo = 'Mes') => {
    const { desde, hasta } = rangoPeriodo(periodo, refFecha);
    const previo = rangoPeriodo(periodo, refFecha, 1);

    const enRango = (f, r) => !!f && f >= r.desde && f <= r.hasta;
    const pedidosDe = (r) => db.pedidos.filter((p) => p.estado !== COTIZACION && enRango(p.fecha_inicio, r));
    /* Ventas: registros con abono, por la fecha de su primer abono. */
    const ventasDe = (r) => db.pedidos.filter((p) => p.calc_vendido && enRango(p.calc_fecha_venta, r));
    const comprasDe = (r) => db.compras.filter((c) => enRango(c.fecha, r) && c.estado !== COMPRA_ANULADA);
    const abonosDe = (r) => db.abonos.filter((a) => a.estado !== 'Anulado' && enRango(a.fecha, r));

    const pedidosPeriodo = pedidosDe({ desde, hasta });
    const comprasPeriodo = comprasDe({ desde, hasta });
    const abonosPeriodo = abonosDe({ desde, hasta });

    const pedidosPrevio = pedidosDe(previo);
    const comprasPrevio = comprasDe(previo);

    const ventasMes = suma(ventasDe({ desde, hasta }), (p) => p.calc_total);
    const comprasMes = suma(comprasPeriodo, (c) => c.calc_total);
    const recaudadoPeriodo = suma(abonosPeriodo, (a) => a.monto);

    /* Ventas / Compras por tramo del periodo (linea de area) */
    const tramos = tramosPeriodo(periodo, refFecha);
    const serie = {
      ventas: tramos.map((t) => ({ l: t.l, v: suma(ventasDe(t), (p) => p.calc_total) })),
      compras: tramos.map((t) => ({ l: t.l, v: suma(comprasDe(t), (c) => c.calc_total) })),
    };

    /* Pedidos por estado (barras): las cotizaciones se cuentan por su fecha de
       creacion y los demas por su fecha de inicio. */
    const porEstado = {};
    db.pedidos
      .filter((p) => enRango(p.estado === COTIZACION ? p.fecha_creacion : p.fecha_inicio, { desde, hasta }))
      .forEach((p) => { porEstado[p.estado] = (porEstado[p.estado] || 0) + 1; });

    /* Compras por tipo de insumo (dona) */
    const porTipo = {};
    comprasPeriodo.forEach((c) => {
      (c.detalle_insumos || []).forEach((l) => {
        const tipo = db.insumos.find((i) => i.id === l.id_insumo)?.calc_tipo || 'Otros';
        porTipo[tipo] = (porTipo[tipo] || 0) + l.cantidad * l.precio_unitario;
      });
    });
    const comprasPorCategoria = Object.entries(porTipo)
      .map(([tipo, value]) => ({ label: tipo, value }))
      .sort((a, b) => b.value - a.value)
      .map((d, i) => ({ ...d, color: PALETA_TIPO_INSUMO[i % PALETA_TIPO_INSUMO.length] }));

    /* Recaudo por método de pago (dona) */
    const porMetodo = {};
    abonosPeriodo.forEach((a) => { porMetodo[a.metodo_pago] = (porMetodo[a.metodo_pago] || 0) + Number(a.monto || 0); });
    const recaudoPorMetodo = Object.entries(porMetodo)
      .map(([label, value]) => ({ label, value, color: COLOR_METODO_PAGO[label] || 'var(--text-sec)' }))
      .sort((a, b) => b.value - a.value);

    /* Existencias más bajas (barras horizontales): no depende del período,
       es la foto actual de la tabla `insumo`. */
    const existencias = [...db.insumos]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6)
      .map((i) => ({
        l: i.nombre,
        v: Number(i.stock),
        nota: i.calc_abreviatura || '',
        color: i.stock === 0 ? 'var(--error)' : i.stock <= i.calc_minimo ? 'var(--warning)' : 'var(--success)',
      }));

    return {
      ventasMes,
      comprasMes,
      recaudadoPeriodo,
      porCobrar: stats.porCobrar,
      pedidosActivos: stats.pedidosActivos,
      bajoStock: stats.bajoStock,
      serie,
      porEstado,
      comprasPorCategoria,
      recaudoPorMetodo,
      existencias,
      // variación real de cada KPI contra el período anterior
      tendencias: {
        ventas: variacion(ventasMes, suma(ventasDe(previo), (p) => p.calc_total)),
        compras: variacion(comprasMes, suma(comprasPrevio, (c) => c.calc_total)),
        recaudado: variacion(recaudadoPeriodo, suma(abonosDe(previo), (a) => a.monto)),
        pedidos: variacion(pedidosPeriodo.length, pedidosPrevio.length),
      },
    };
  }, [db, refFecha, stats]);

  /** Avisos de la campana. `permiso` es el modulo que hay que tener para verlo. */
  const notificaciones = useMemo(() => {
    const out = [];
    stats.bajoStock.slice(0, 4).forEach((i) =>
      out.push({
        id: 'stk' + i.id,
        permiso: 'Insumos',
        tipo: i.stock === 0 ? 'error' : 'warning',
        titulo: i.stock === 0 ? 'Insumo agotado' : 'Existencias bajas',
        texto: `${i.nombre} — ${i.stock} ${i.calc_abreviatura || i.calc_unidad.toLowerCase()} disponibles.`,
        tiempo: 'Hace 1 h',
      })
    );
    db.pedidos
      .filter((p) => p.estado === FALTA_PAGO)
      .slice(0, 3)
      .forEach((p) =>
        out.push({
          id: 'ped' + p.id,
          permiso: 'Pedidos',
          tipo: 'info',
          titulo: 'Pedido con saldo pendiente',
          texto: `${p.calc_codigo} — ${p.calc_cliente} tiene saldo por cobrar.`,
          tiempo: 'Hoy',
        })
      );
    db.compras
      .filter((c) => c.estado === 'En tránsito')
      .slice(0, 2)
      .forEach((c) =>
        out.push({
          id: 'cmp' + c.id,
          permiso: 'Órdenes de pedido',
          tipo: 'success',
          titulo: 'Orden de pedido en tránsito',
          texto: `${c.calc_codigo} — ${c.calc_proveedor}.`,
          tiempo: 'Ayer',
        })
      );
    return out;
  }, [db, stats]);

  return (
    <DataContext.Provider
      value={{
        db, opciones, create, update, remove, nuevoId, faltantes, expandirReceta, stats, getStats, notificaciones,
        solicitarRecuperacion, enlaceValido, restablecerClave,
        estadoDatos, errorDatos, cargar, vaciar, sincronizando,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
