import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * Reglas de negocio de extremo a extremo (API + base de datos).
 *
 * Escribe datos, asi que solo corre contra una base LOCAL de pruebas ya
 * migrada y con la semilla:
 *
 *   TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/parceros_test npm test
 *
 * Sin esa variable (o si no apunta a este equipo) la prueba se omite.
 */
const URL_BD = process.env.TEST_DATABASE_URL || '';
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BD);

test('reglas de negocio', { skip: !local && 'TEST_DATABASE_URL no apunta a una base local de pruebas' }, async (t) => {
  process.env.DATABASE_URL = URL_BD;
  process.env.DB_SSL = 'false';
  process.env.JWT_SECRET ||= 'secreto-solo-para-pruebas-0123456789abcdef';
  const { default: app } = await import('../src/app.js');
  const { pool } = await import('../src/db/pool.js');
  const server = app.listen();
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => { await new Promise((r) => server.close(r)); await pool.end(); });

  const pedir = async (token, metodo, ruta, cuerpo) => {
    const r = await fetch(base + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const texto = await r.text();
    return { status: r.status, body: texto ? JSON.parse(texto) : null };
  };
  const entrar = async (correo, contrasena) => (await pedir(null, 'POST', '/auth/login', { correo, contrasena })).body?.token;

  const admin = await entrar('admin@parceros.ni', 'Cambiar123!');
  assert.ok(admin, 'el admin de la semilla inicia sesion');
  const api = (metodo, ruta, cuerpo) => pedir(admin, metodo, ruta, cuerpo);
  const crear = async (col, cuerpo) => {
    const r = await api('POST', '/' + col, cuerpo);
    assert.equal(r.status, 201, `${col}: ${JSON.stringify(r.body)}`);
    return Object.values(r.body)[0];
  };
  const datos = async (token = admin) => (await pedir(token, 'GET', '/datos')).body;
  const sufijo = Date.now().toString(36);

  const cat = await datos();
  const estado = (orden) => cat.estados_pedido.find((e) => e.orden === orden).id_estado_pedido;
  const estadoCompra = (nombre) => cat.estados_compra.find((e) => e.nombre === nombre).id_estado_compra;
  const efectivo = cat.metodos_pago[0].id_metodo_pago;
  const hoy = new Date().toISOString().slice(0, 10);

  /* Catalogo minimo: un insumo con 100 unidades y un producto que gasta 2 por prenda. */
  const tipo = cat.tipos_insumo[0].id_tipo_insumo;
  const insumo = await crear('insumos', { id_tipo_insumo: tipo, id_unidad_medida: cat.unidades_medida[0].id_unidad_medida, nombre: `Tela ${sufijo}`, stock_minimo: 5, stock: 100 });
  const stock = async () => (await datos()).insumos.find((i) => i.id_insumo === insumo).stock;
  const categoria = await crear('categorias_producto', { nombre: `Camiseta ${sufijo}` });
  const producto = await crear('productos', {
    id_categoria_producto: categoria, id_talla: cat.tallas[0].id_talla, id_insumo_tela: insumo, nombre: `Camiseta M ${sufijo}`,
    precio_venta: 100, receta: [{ id_insumo: insumo, cantidad: 2 }],
  });
  const cliente = await crear('clientes', { id_tipo_documento: cat.tipos_documento[0].id_tipo_documento, nombre: 'Cliente Prueba', documento: `DOC${sufijo}`, correo: `c${sufijo}@prueba.ni` });
  const proveedor = await crear('proveedores', { id_tipo_insumo: tipo, nombre: `Proveedor ${sufijo}`, pais: 'Nicaragua' });

  /* 10 prendas a 100 = 1000; gastan 20 unidades del insumo. */
  const lineas = (unidades = 10) => ({
    productos: [{ id_producto: producto, cantidad: unidades, precio_unitario: 100 }], insumos: [],
    insumos_receta: [{ id_insumo: insumo, cantidad: unidades * 2 }],
  });
  const pedidoBase = (orden, unidades) => ({ id_cliente: cliente, id_estado_pedido: estado(orden), fecha_creacion: hoy, descripcion: 'Uniforme de prueba', ...lineas(unidades) });
  const abono = (id_pedido, monto) => api('POST', '/abonos', { id_pedido, id_metodo_pago: efectivo, monto, fecha: hoy });
  const ordenDe = async (id) => {
    const p = (await datos()).pedidos.find((x) => x.id_pedido === id);
    return p && cat.estados_pedido.find((e) => e.id_estado_pedido === p.id_estado_pedido).orden;
  };

  await t.test('compras: solo la compra recibida ingresa al inventario, y una sola vez', async () => {
    assert.equal(await stock(), 100);
    const compra = await crear('compras', { id_proveedor: proveedor, id_estado_compra: estadoCompra('En tránsito'), fecha: hoy, detalles: [{ id_insumo: insumo, cantidad: 50, precio_unitario: 10 }] });
    assert.equal(await stock(), 100);
    const recibida = { id_proveedor: proveedor, id_estado_compra: estadoCompra('Recibida'), fecha: hoy, detalles: [{ id_insumo: insumo, cantidad: 50, precio_unitario: 10 }] };
    assert.equal((await api('PUT', `/compras/${compra}`, recibida)).status, 200);
    assert.equal((await api('PUT', `/compras/${compra}`, recibida)).status, 200);
    assert.equal(await stock(), 150);
    assert.equal((await api('POST', '/compras', { id_proveedor: proveedor, id_estado_compra: estadoCompra('Recibida'), fecha: hoy, detalles: [] })).status, 400);
  });

  await t.test('cotizacion -> pedido -> venta: estados, abonos e inventario', async () => {
    const id = await crear('pedidos', pedidoBase(1));
    assert.equal(await stock(), 150, 'la cotizacion no consume inventario');
    const pasar = (orden, extra) => api('PUT', `/pedidos/${id}`, { id_estado_pedido: estado(orden), ...extra });

    assert.equal((await pasar(2)).status, 400, 'no inicia sin abono inicial');
    assert.equal((await abono(id, 400)).status, 400, 'primer abono menor al 50%');
    assert.equal((await abono(id, 1100)).status, 400, 'abono mayor al saldo');
    assert.equal((await abono(id, 500)).status, 201);
    assert.equal(await ordenDe(id), 2, 'el primer abono inicia el pedido');
    assert.equal(await stock(), 130, 'al iniciar descuenta la receta');

    assert.equal((await pasar(4)).status, 400, 'no se completa con saldo');
    assert.equal((await pasar(1)).status, 400, 'no vuelve a cotizacion');
    assert.equal((await pasar(5)).status, 400, 'no salta a entregado');
    assert.equal((await pasar(3)).status, 200);
    assert.equal(await stock(), 130, 'cambiar de etapa no vuelve a descontar');
    const { rows: [{ n }] } = await pool.query('SELECT count(*) AS n FROM movimiento_inventario WHERE id_pedido = $1', [id]);
    assert.equal(n, 1, 'un solo movimiento de inventario por insumo');

    /* Dos abonos simultaneos de 300 sobre un saldo de 500: solo cabe uno. */
    const juntos = await Promise.all([abono(id, 300), abono(id, 300)]);
    assert.deepEqual(juntos.map((r) => r.status).sort(), [201, 400]);
    assert.equal((await abono(id, 200)).status, 201);
    assert.equal(await ordenDe(id), 4, 'el abono que salda el pedido lo completa');
    assert.equal((await abono(id, 1)).status, 400, 'pedido pagado: no admite mas abonos');
    const unAbono = (await datos()).abonos.find((a) => a.id_pedido === id);
    await api('PUT', `/abonos/${unAbono.id_abono}`, { monto: 1, id_metodo_pago: efectivo });
    assert.equal((await datos()).abonos.find((a) => a.id_abono === unAbono.id_abono).monto, unAbono.monto, 'el monto de un abono no se edita');

    const abonos = (await datos()).abonos.filter((a) => a.id_pedido === id);
    assert.equal(abonos.reduce((s, a) => s + a.monto, 0), 1000, 'lo abonado es igual al total');
    assert.equal((await api('DELETE', `/abonos/${abonos[0].id_abono}`)).status, 204);
    assert.equal(await ordenDe(id), 3, 'sin ese abono vuelve a falta pago');
    assert.equal((await abono(id, abonos[0].monto)).status, 201);
    assert.equal((await pasar(5, { fecha_entrega: hoy })).status, 200);
    const ultimo = (await datos()).abonos.find((a) => a.id_pedido === id);
    assert.equal((await api('DELETE', `/abonos/${ultimo.id_abono}`)).status, 400, 'los abonos de una venta entregada no se eliminan');
    /* Las lineas de un pedido terminado ya no cambian. */
    await api('PUT', `/pedidos/${id}`, lineas(1));
    assert.equal((await datos()).pedidos.find((p) => p.id_pedido === id).productos[0].cantidad, 10);
  });

  await t.test('pedido que nace en proceso: con su abono inicial o nada', async () => {
    const antes = (await datos()).pedidos.length;
    assert.equal((await api('POST', '/pedidos', pedidoBase(2))).status, 400, 'sin abono inicial');
    assert.equal((await api('POST', '/pedidos', { ...pedidoBase(2), abono_inicial: { id_metodo_pago: efectivo, monto: 100, fecha: hoy } })).status, 400, 'abono menor al 50%');
    assert.equal((await api('POST', '/pedidos', { ...pedidoBase(2, 500), abono_inicial: { id_metodo_pago: efectivo, monto: 25000, fecha: hoy } })).status, 400, 'sin existencias');
    assert.equal((await api('POST', '/pedidos', pedidoBase(3))).status, 400, 'no nace terminado');
    assert.equal((await datos()).pedidos.length, antes, 'un rechazo no deja nada guardado');
    assert.equal(await stock(), 130);

    const id = await crear('pedidos', { ...pedidoBase(2), abono_inicial: { id_metodo_pago: efectivo, monto: 600, fecha: hoy } });
    assert.equal(await stock(), 110);
    assert.equal((await api('PUT', `/pedidos/${id}`, lineas(5))).status, 400, 'el total no baja de lo abonado');
    assert.equal(await stock(), 110, 'el rechazo no toca el inventario');
    assert.equal((await api('PUT', `/pedidos/${id}`, lineas(8))).status, 200);
    assert.equal(await stock(), 114, 'editar las lineas ajusta el consumo');
    assert.equal((await api('DELETE', `/pedidos/${id}`)).status, 204);
    assert.equal(await stock(), 130, 'eliminar el pedido devuelve sus insumos');
    assert.equal((await datos()).abonos.filter((a) => a.id_pedido === id).length, 0, 'y se lleva sus abonos');
  });

  await t.test('adjuntos: validados, fuera del listado y fuera del historial', async () => {
    const png = 'data:image/png;base64,' + 'iVBORw0KGgoAAAANSUhEUgAA'.repeat(8); // mas de 64 caracteres
    assert.equal((await api('POST', '/pedidos', { ...pedidoBase(1), ruta_imagen_diseno: 'data:text/html;base64,PHNjcmlwdD4=' })).status, 400);
    assert.equal((await api('POST', '/pedidos', { ...pedidoBase(1), ruta_imagen_diseno: 'https://sitio.externo/imagen.png' })).status, 400);
    const id = await crear('pedidos', { ...pedidoBase(1), ruta_imagen_diseno: png });
    const d = await datos();
    const fila = d.pedidos.find((p) => p.id_pedido === id);
    assert.ok(fila.diseno_md5 && !('ruta_imagen_diseno' in fila));
    const mov = d.movimientos.find((m) => m.tabla === 'pedido' && m.id_registro === id);
    assert.match(mov.valor_nuevo.ruta_imagen_diseno, /^data:[0-9a-f]{32}$/);
    assert.equal((await api('GET', `/adjuntos?pedidos=${id}`)).body.pedidos[id], png);
    /* Un PUT sin el campo no borra el adjunto. */
    assert.equal((await api('PUT', `/pedidos/${id}`, { descripcion: 'Otra descripcion' })).status, 200);
    assert.equal((await api('GET', `/adjuntos?pedidos=${id}`)).body.pedidos[id], png);
    /* Tampoco la cadena vacia (frontend anterior); null si lo quita. */
    await api('PUT', `/pedidos/${id}`, { ruta_imagen_diseno: '' });
    assert.equal((await api('GET', `/adjuntos?pedidos=${id}`)).body.pedidos[id], png);
    await api('PUT', `/pedidos/${id}`, { ruta_imagen_diseno: null });
    assert.equal((await api('GET', `/adjuntos?pedidos=${id}`)).body.pedidos[id], undefined);
  });

  await t.test('permisos: el servidor aplica lo que el rol tiene', async () => {
    const permiso = (nombre) => cat.permisos.find((p) => p.nombre === nombre).id_permiso;
    const privilegio = (modulo, accion) => cat.privilegios.find((p) => p.id_permiso === permiso(modulo) && p.nombre === accion).id_privilegio;
    const rol = await crear('roles', {
      nombre: `Vendedor ${sufijo}`, permisos: [permiso('Clientes'), permiso('Cotizaciones')],
      privilegios: [privilegio('Clientes', 'Agregar'), privilegio('Clientes', 'Cambiar estado'), privilegio('Cotizaciones', 'Editar')],
    });
    const nuevo = await api('POST', '/usuarios', { id_rol: rol, correo_empresarial: `V${sufijo}@Prueba.ni`, nombre_empleado: 'Vendedor Prueba', contrasena: 'clave123' });
    assert.deepEqual(Object.keys(nuevo.body), ['id_usuario'], 'la respuesta no trae el hash de la contraseña');
    const yo = nuevo.body.id_usuario;
    const token = await entrar(`v${sufijo}@prueba.ni`, 'clave123');
    assert.ok(token, 'el correo se guarda en minusculas');
    const v = (metodo, ruta, cuerpo) => pedir(token, metodo, ruta, cuerpo);

    const d = await datos(token);
    assert.deepEqual(d.usuarios.map((u) => u.id_usuario), [yo], 'solo se ve a si mismo');
    assert.deepEqual(d.roles.map((r) => r.id_rol), [rol], 'solo ve su rol');
    assert.equal(d.movimientos.length + d.compras.length + d.proveedores.length, 0, 'no recibe modulos ajenos');
    assert.ok(d.clientes.length > 0);

    assert.equal((await v('POST', '/insumos', { nombre: 'x' })).status, 403);
    assert.equal((await v('DELETE', `/clientes/${cliente}`)).status, 403);
    assert.equal((await v('PUT', '/usuarios/1', { nombre_empleado: 'Otro' })).status, 403);
    assert.equal((await v('POST', '/pedidos', pedidoBase(1))).status, 403, 'sin «Agregar» en Cotizaciones');
    assert.equal((await v('POST', '/abonos', { id_pedido: 1, id_metodo_pago: efectivo, monto: 1, fecha: hoy })).status, 403);

    /* «Cambiar estado» sin «Editar»: solo cambia el estado. */
    assert.equal((await v('PUT', `/clientes/${cliente}`, { nombre: 'Cambiado', activo: false })).status, 200);
    const c = (await datos()).clientes.find((x) => x.id_cliente === cliente);
    assert.deepEqual([c.nombre, c.activo], ['Cliente Prueba', false]);

    /* «Editar» sin «Cambiar estado» en Cotizaciones: edita, pero no inicia el pedido. */
    const cot = await crear('pedidos', pedidoBase(1));
    assert.equal((await v('PUT', `/pedidos/${cot}`, { descripcion: 'Editada por ventas', id_estado_pedido: estado(2) })).status, 200);
    assert.equal(await ordenDe(cot), 1);

    /* Su perfil si; su rol y su estado no. */
    assert.equal((await v('PUT', `/usuarios/${yo}`, { telefono: '88887777', id_rol: 1 })).status, 200);
    const u = (await datos()).usuarios.find((x) => x.id_usuario === yo);
    assert.deepEqual([u.telefono, u.id_rol], ['88887777', rol]);

    assert.equal((await pedir(null, 'GET', '/datos')).status, 401);
    assert.equal((await pedir('token.falso.x', 'GET', '/datos')).status, 401);
  });

  await t.test('inicio de sesion: bloqueo tras varios intentos fallidos', async () => {
    const correo = `nadie${sufijo}@prueba.ni`;
    for (let i = 0; i < 8; i++) assert.equal((await pedir(null, 'POST', '/auth/login', { correo, contrasena: 'incorrecta' })).status, 401);
    assert.equal((await pedir(null, 'POST', '/auth/login', { correo, contrasena: 'incorrecta' })).status, 429);
  });
});
