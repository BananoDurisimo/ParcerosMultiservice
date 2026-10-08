import { createContext, useContext, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { api, leerToken } from '@shared/api/cliente.js';
import { deServidor, aServidor, VACIO } from '@shared/api/adaptador.js';
import { useToast } from '@shared/context/ToastContext.jsx';
import {
  COLOR_TIPO_INSUMO,
  COLOR_METODO_PAGO,
  UMBRAL_STOCK_BAJO,
  MODULOS_AUDITADOS,
  ESTADOS_PEDIDO,
  COTIZACION,
  FALTA_PAGO,
  ENTREGADO,
  COMPRA_ANULADA,
  ETIQUETA_ACCION,
  camposCambiados,
  CAMPOS_NO_AUDITADOS,
  etiquetaFila,
  codigoCompra,
  codigoPedido,
  codigoAbono,
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

/* Estados que dan de baja una fila: deja de ofrecerse para registros nuevos,
   pero no desaparece de ningun lado. Los documentos que ya la usan tienen que
   seguir mostrando su nombre, asi que la opcion se sigue listando -marcada con
   el motivo- y es el desplegable el que no deja elegirla. */
const ESTADOS_DE_BAJA = ['Inactivo', 'Anulada'];
const motivoBaja = (r) => (ESTADOS_DE_BAJA.includes(r.estado) && r.estado) || undefined;

const suma = (arr, fn) => arr.reduce((s, x) => s + Number(fn(x) || 0), 0);
const porId = (arr) => new Map(arr.map((r) => [r.id, r]));
const redondear = (n) => Math.round(n * 100) / 100;

/** Un pedido descuenta sus insumos del inventario desde que entra en
 *  produccion ("Pedido en proceso") y el descuento se mantiene hasta la
 *  entrega: mientras es cotizacion todavia no consume nada. */
export const consumeInventario = (estado) => ESTADOS_PEDIDO.indexOf(estado) >= 1;

/* --------------------------------------------------------------
   Movimiento de existencias

   Las existencias de los insumos las mueven los documentos: una compra
   recibida ingresa lo que trae y un pedido en produccion descuenta lo que
   gasta. `efectoEnStock` traduce un documento a las unidades que suma (+) o
   resta (-) en cada insumo; cambiarle el estado o anularlo ingresa o devuelve
   las existencias por si solo.

   Los datos semilla ya vienen con las existencias al dia: no se reprocesa el
   historial, solo se aplican los movimientos que ocurren en la sesion.
   -------------------------------------------------------------- */
const lineasStock = (arr, signo) =>
  (arr || []).map((l) => ({ id: l.id_insumo, n: signo * Number(l.cantidad || 0) }));

function efectoEnStock(col, row) {
  if (!row) return [];
  if (col === 'compras') return row.estado === 'Recibida' ? lineasStock(row.detalle_insumos, 1) : [];
  if (col === 'pedidos') return consumeInventario(row.estado) ? lineasStock(row.insumos, -1) : [];
  return [];
}

/** Devuelve `d` con las existencias ya ajustadas al reemplazar el documento
 *  `anterior` por `nuevo`: se deshace el efecto que tenia y se aplica el nuevo. */
function conStock(d, col, anterior, nuevo) {
  if (col !== 'compras' && col !== 'pedidos') return d;
  const delta = new Map();
  efectoEnStock(col, anterior).forEach(({ id, n }) => delta.set(id, (delta.get(id) || 0) - n));
  efectoEnStock(col, nuevo).forEach(({ id, n }) => delta.set(id, (delta.get(id) || 0) + n));
  if (!delta.size) return d;
  return {
    ...d,
    insumos: d.insumos.map((r) =>
      delta.has(r.id) ? { ...r, stock: Math.max(0, redondear(Number(r.stock || 0) + delta.get(r.id))) } : r
    ),
  };
}

/* --------------------------------------------------------------
   Historial de movimientos

   Cada alta y cada cambio que se hace en la sesion queda registrado en la
   tabla `movimientos` con el usuario que lo hizo, como lo haria el trigger de
   la base de datos.
   -------------------------------------------------------------- */
const TABLA = {
  roles: 'rol',
  usuarios: 'usuario',
  insumos: 'insumo',
  proveedores: 'proveedor',
  compras: 'compra',
  clientes: 'cliente',
  pedidos: 'pedido',
  abonos: 'abono',
};

const ahora = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${hoyISO()}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/** Copia de la fila tal como la guardaria el trigger: sin el id ni la
 *  contrasena, y con las lineas de detalle escritas como texto
 *  ("Tela Dry-Fit × 30"). */
function valorAuditado(d, row) {
  if (!row) return null;
  const { id, ...resto } = row;
  const out = { ...resto };
  CAMPOS_NO_AUDITADOS.forEach((k) => delete out[k]);
  ['insumos', 'detalle_insumos'].forEach((k) => {
    if (Array.isArray(out[k])) {
      out[k] = out[k].map((l) => `${d.insumos.find((i) => i.id === l.id_insumo)?.nombre || '#' + l.id_insumo} × ${l.cantidad}`);
    }
  });
  return out;
}

function conMovimiento(d, mov) {
  const id = d.movimientos.length ? Math.max(...d.movimientos.map((m) => m.id)) + 1 : 1;
  return { ...d, movimientos: [{ id, fecha_cambio: ahora(), ...mov }, ...d.movimientos] };
}

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
     existencias, historial). Si el servidor rechaza un cambio, se avisa y se
     recargan los datos, con lo que la pantalla vuelve a lo guardado.
     -------------------------------------------------------------- */
  const [estadoDatos, setEstadoDatos] = useState(() => (leerToken() ? 'cargando' : 'inactivo'));
  const [errorDatos, setErrorDatos] = useState('');

  const cargar = useCallback(async () => {
    setEstadoDatos('cargando');
    setErrorDatos('');
    try {
      const d = deServidor(await api('GET', '/datos'));
      rawRef.current = d;
      setRaw(d);
      setEstadoDatos('listo');
    } catch (e) {
      setErrorDatos(e.message);
      setEstadoDatos(e.status === 401 ? 'inactivo' : 'error');
    }
  }, []);

  const vaciar = useCallback(() => {
    rawRef.current = VACIO;
    setRaw(VACIO);
    setEstadoDatos('inactivo');
  }, []);

  useEffect(() => { if (leerToken()) cargar(); }, [cargar]);

  /* Ids creados en el navegador -> id que asigno el servidor. */
  const idsServidor = useRef({});
  const sid = useCallback((col, id) => idsServidor.current[col]?.get(id) ?? id, []);
  const cola = useRef(Promise.resolve());
  const pendientes = useRef(0);

  const sincronizar = useCallback((tarea) => {
    pendientes.current += 1;
    cola.current = cola.current
      .then(tarea)
      .catch((e) => {
        toast.error(e.message, 'No se guardó el cambio');
        pendientes.current = 0;
        cola.current = Promise.resolve();
        idsServidor.current = {};
        return cargar();
      })
      .finally(() => {
        pendientes.current = Math.max(0, pendientes.current - 1);
        if (pendientes.current === 0) {
          idsServidor.current = {};
          cargar();
        }
      });
  }, [cargar, toast]);

  const cuerpo = (col, row) => aServidor(col, row, rawRef.current.catalogos, sid);

  /* Usuario de la sesion: lo fija AuthContext y es el responsable que queda
     en cada movimiento. */
  const actorRef = useRef(null);
  const setActor = useCallback((id) => { actorRef.current = id ?? null; }, []);

  /* Ids: se reservan aqui -y no dentro de la actualizacion de estado- para que
     quien crea un registro conozca su id de inmediato (p. ej. el pedido que
     nace con su abono inicial). */
  const ultimoId = useRef({});
  const nuevoId = useCallback((col) => {
    const max = Math.max(0, ...rawRef.current[col].map((r) => r.id), ultimoId.current[col] || 0);
    ultimoId.current[col] = max + 1;
    return max + 1;
  }, []);

  /* Guardar y actualizar pasan por `conStock`, de modo que el movimiento de
     existencias ocurre venga de donde venga el cambio: del formulario, del
     desplegable de estado del listado o del dialogo de anulacion. */
  const create = useCallback((col, row) => {
    const creado = { ...row, id: row.id ?? nuevoId(col) };
    const actor = actorRef.current;
    sincronizar(async () => {
      const fila = await api('POST', '/' + col, cuerpo(col, creado));
      const pk = Object.keys(fila).find((k) => k.startsWith('id_'));
      (idsServidor.current[col] ||= new Map()).set(creado.id, fila[pk]);
    });
    aplicar((d) => {
      let out = conStock({ ...d, [col]: [creado, ...d[col]] }, col, null, creado);
      if (TABLA[col]) {
        out = conMovimiento(out, {
          tabla: TABLA[col], id_registro: creado.id, accion: 'INSERT',
          valor_anterior: null, valor_nuevo: valorAuditado(d, creado), id_usuario: actor,
        });
      }
      return out;
    });
    return creado;
  }, [nuevoId, aplicar, sincronizar]);

  const update = useCallback((col, id, patch) => {
    const actor = actorRef.current;
    const previo = rawRef.current[col].find((r) => r.id === id);
    if (previo) {
      const enviar = { ...previo, ...patch };
      sincronizar(() => api('PUT', `/${col}/${sid(col, id)}`, cuerpo(col, enviar)));
    }
    aplicar((d) => {
      const anterior = d[col].find((r) => r.id === id);
      if (!anterior) return d;
      const nuevo = { ...anterior, ...patch };
      let out = conStock({ ...d, [col]: d[col].map((r) => (r.id === id ? nuevo : r)) }, col, anterior, nuevo);
      const antes = valorAuditado(d, anterior);
      const despues = valorAuditado(d, nuevo);
      if (TABLA[col] && camposCambiados(antes, despues).length) {
        out = conMovimiento(out, {
          tabla: TABLA[col], id_registro: id, accion: 'UPDATE',
          valor_anterior: antes, valor_nuevo: despues, id_usuario: actor,
        });
      }
      return out;
    });
  }, [aplicar, sincronizar, sid]);

  /* Eliminar quita la fila de la tabla. Igual que al guardar, `conStock`
     deshace lo que el documento movia en las existencias (una compra recibida
     retira lo que habia ingresado; un pedido en produccion devuelve lo que
     habia descontado), y el trigger deja la fila borrada en el historial. */
  const remove = useCallback((col, id) => {
    const actor = actorRef.current;
    sincronizar(() => api('DELETE', `/${col}/${sid(col, id)}`));
    aplicar((d) => {
      const anterior = d[col].find((r) => r.id === id);
      if (!anterior) return d;
      let out = conStock({ ...d, [col]: d[col].filter((r) => r.id !== id) }, col, anterior, null);
      if (TABLA[col]) {
        out = conMovimiento(out, {
          tabla: TABLA[col], id_registro: id, accion: 'DELETE',
          valor_anterior: valorAuditado(d, anterior), valor_nuevo: null, id_usuario: actor,
        });
      }
      return out;
    });
  }, [aplicar, sincronizar, sid]);

  /** Los accesos (ingreso, intento fallido, cierre) los registra el
   *  servidor en la tabla `acceso`; se conserva la funcion para no cambiar a
   *  quien la llama. */
  const registrarAcceso = useCallback(() => {}, []);

  /* --------------------------------------------------------------
     Recuperacion de contrasena: enlace de un solo uso, valido 30 minutos.
     -------------------------------------------------------------- */
  const enlaces = useRef(new Map());

  /** Genera el enlace si el correo es de un usuario registrado y activo;
   *  devuelve el token o null. */
  const solicitarRecuperacion = useCallback((correo) => {
    const c = String(correo).trim().toLowerCase();
    const u = rawRef.current.usuarios.find((x) => (x.correo_empresarial || '').toLowerCase() === c && x.estado === 'Activo');
    if (!u) return null;
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    enlaces.current.set(token, { id_usuario: u.id, vence: Date.now() + 30 * 60 * 1000, usado: false });
    return token;
  }, []);

  const enlaceValido = useCallback((token) => {
    const e = enlaces.current.get(token);
    return !!e && !e.usado && e.vence > Date.now();
  }, []);

  const restablecerClave = useCallback((token, clave) => {
    if (!enlaceValido(token)) return false;
    const e = enlaces.current.get(token);
    e.usado = true;
    update('usuarios', e.id_usuario, { contrasena: clave });
    return true;
  }, [enlaceValido, update]);

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
    const usuariosM = porId(raw.usuarios);

    const insumos = raw.insumos.map((i) => ({
      ...i,
      calc_tipo: tipos.get(i.id_tipo_insumo)?.nombre || '—',
      calc_unidad: unidades.get(i.id_unidad_medida)?.nombre || '—',
      calc_abreviatura: unidades.get(i.id_unidad_medida)?.abreviatura || '',
      calc_valor: Number(i.stock) * Number(i.precio_unitario),
      calc_minimo: Number(i.stock_minimo ?? UMBRAL_STOCK_BAJO),
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

    const abonosPorPedido = new Map();
    raw.abonos.forEach((a) => {
      abonosPorPedido.set(a.id_pedido, [...(abonosPorPedido.get(a.id_pedido) || []), a]);
    });

    /* El total del registro es la suma de los insumos que se gastan
       (detalle_pedido_insumo); el saldo es el total menos los abonos. */
    const pedidos = raw.pedidos.map((p) => {
      const total = redondear(suma(p.insumos || [], (l) => l.subtotal ?? l.cantidad * l.precio_unitario));
      const abonos = abonosPorPedido.get(p.id) || [];
      const abonado = redondear(suma(abonos, (a) => a.monto));
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
        calc_lineas: (p.insumos || []).length,
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

    /* Nombre con que se muestra el registro afectado de un movimiento. */
    const registroMovimiento = (m) => {
      if (m.tabla === 'compra') return codigoCompra(m.id_registro);
      if (m.tabla === 'pedido') return codigoPedido(m.id_registro);
      if (m.tabla === 'abono') return codigoAbono(m.id_registro);
      const e = etiquetaFila(m.valor_nuevo || m.valor_anterior || {});
      return e === '—' ? `#${m.id_registro}` : e;
    };

    return {
      // catálogos
      permisos: raw.permisos,
      privilegios: raw.privilegios,
      tipos_insumo: raw.tipos_insumo,
      unidades_medida: raw.unidades_medida,

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

      /* Historial: solo lectura. Se resuelve el modulo, el responsable y el
         registro afectado (el nombre sale del propio JSON guardado, porque la
         fila original pudo haberse eliminado). */
      movimientos: raw.movimientos.map((m) => {
        const u = usuariosM.get(m.id_usuario);
        const cambios = camposCambiados(m.valor_anterior, m.valor_nuevo);
        return {
          ...m,
          calc_modulo: MODULOS_AUDITADOS[m.tabla] || m.tabla,
          calc_accion: ETIQUETA_ACCION[m.accion] || m.accion,
          calc_usuario: u?.nombre_empleado || 'Sistema',
          calc_alias: u?.nombre_usuario || '—',
          calc_registro: registroMovimiento(m),
          calc_cambios: cambios,
          calc_total_cambios: cambios.length,
          calc_fecha: m.fecha_cambio.slice(0, 10),
        };
      }),
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
    const yaDescontado = anterior && consumeInventario(anterior.estado) ? anterior.insumos || [] : [];
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
      recaudado: suma(db.abonos, (a) => a.monto),
      bajoStock,
      pedidosActivos: vendidos.filter((p) => p.estado !== ENTREGADO).length,
      totalPedidos: db.pedidos.length,
      valorInventario: suma(db.insumos, (i) => i.calc_valor),
    };
  }, [db]);

  /* ---- Indicadores y series que SÍ dependen del período (dashboard) ---- */
  const getStats = useCallback((periodo = 'Mes') => {
    const { desde, hasta } = rangoPeriodo(periodo, refFecha);
    const previo = rangoPeriodo(periodo, refFecha, 1);

    const enRango = (f, r) => !!f && f >= r.desde && f <= r.hasta;
    const pedidosDe = (r) => db.pedidos.filter((p) => p.estado !== COTIZACION && enRango(p.fecha_inicio, r));
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

    /* Ventas / Compras por tramo del periodo (linea de area) */
    const tramos = tramosPeriodo(periodo, refFecha);
    const serie = {
      ventas: tramos.map((t) => ({ l: t.l, v: suma(pedidosDe(t), (p) => p.calc_total) })),
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
      .map(([tipo, value]) => ({ label: tipo, value, color: COLOR_TIPO_INSUMO[tipo] || 'var(--error)' }))
      .sort((a, b) => b.value - a.value);

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
        ventas: variacion(ventasMes, suma(pedidosPrevio, (p) => p.calc_total)),
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
          permiso: 'Compras',
          tipo: 'success',
          titulo: 'Compra en tránsito',
          texto: `${c.calc_codigo} — ${c.calc_proveedor}.`,
          tiempo: 'Ayer',
        })
      );
    return out;
  }, [db, stats]);

  return (
    <DataContext.Provider
      value={{
        db, opciones, create, update, remove, nuevoId, faltantes, stats, getStats, notificaciones,
        setActor, registrarAcceso, solicitarRecuperacion, enlaceValido, restablecerClave,
        estadoDatos, errorDatos, cargar, vaciar,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
