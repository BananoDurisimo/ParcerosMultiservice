-- =====================================================================
-- 021 · Datos de la empresa
--
-- Datos de ejemplo de Parceros Multiservice (taller de uniformes de futbol,
-- jerseys de ciclismo y camisetas publicitarias en Managua, Nicaragua):
-- 1. Catalogos: categorias de insumo y de producto, unidades de medida.
-- 2. Insumos, proveedores y productos con su receta.
-- 3. Roles Vendedor y Produccion, con sus usuarios (clave: Cambiar123!).
-- 4. Clientes.
-- 5. Ordenes de pedido (compras) y pedidos en cada etapa, con sus abonos.
--
-- Los datos maestros usan ON CONFLICT: no duplican ni cambian lo que ya
-- exista. Las compras y los pedidos solo se crean si la base no tiene
-- ninguno, para no mezclarse con movimientos reales. Las fechas son
-- relativas al dia en que se aplica la migracion.
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- 1. Catalogos
-- ---------------------------------------------------------------------
INSERT INTO tipo_insumo(nombre, descripcion) VALUES
  ('Tela', 'Telas para confección: dry-fit, licra y algodón'),
  ('Hilo', 'Hilos de costura y bordado'),
  ('Estampado', 'Vinil textil, papel y tinta de sublimación'),
  ('Accesorio', 'Cremalleras, elásticos y badanas')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO unidad_medida(nombre, abreviatura) VALUES
  ('Metro', 'm'), ('Unidad', 'u'), ('Cono', 'cono'), ('Kilogramo', 'kg')
ON CONFLICT DO NOTHING;

INSERT INTO categoria_producto(nombre, descripcion) VALUES
  ('Uniformes de fútbol', 'Camisetas y pantalonetas para equipos y escuelas'),
  ('Jerseys de ciclismo', 'Jerseys sublimados en licra para clubes de ciclismo'),
  ('Camisetas publicitarias', 'Camisetas de algodón con logo para empresas y eventos')
ON CONFLICT (nombre) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Insumos, proveedores y productos
-- ---------------------------------------------------------------------
INSERT INTO insumo(id_tipo_insumo, id_unidad_medida, nombre, stock_minimo)
SELECT t.id_tipo_insumo, u.id_unidad_medida, v.nombre, v.minimo
FROM (VALUES
  ('Tela dry-fit', 'Tela', 'Metro', 30),
  ('Tela licra para ciclismo', 'Tela', 'Metro', 15),
  ('Tela algodón peinado', 'Tela', 'Metro', 30),
  ('Hilo poliéster', 'Hilo', 'Cono', 5),
  ('Vinil textil', 'Estampado', 'Metro', 10),
  ('Papel de sublimación', 'Estampado', 'Metro', 20),
  ('Tinta de sublimación', 'Estampado', 'Kilogramo', 2),
  ('Cremallera de 20 cm', 'Accesorio', 'Unidad', 45),
  ('Elástico de 3 cm', 'Accesorio', 'Metro', 20)
) AS v(nombre, tipo, unidad, minimo)
JOIN tipo_insumo t ON t.nombre = v.tipo
JOIN unidad_medida u ON u.nombre = v.unidad
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO proveedor(id_tipo_insumo, nombre, nombre_persona_contacto, nit, telefono, correo, direccion, pais, tipo_proveedor)
SELECT t.id_tipo_insumo, v.nombre, v.contacto, v.nit, v.telefono, v.correo, v.direccion, v.pais, v.tipo_prov
FROM (VALUES
  ('Tela', 'Textiles del Pacífico S.A.', 'Rosa Amador', 'J0310000004512', '2266-4410', 'ventas@textilespacifico.ni', 'Km 7 Carretera Norte, Managua', 'Nicaragua', 'Persona jurídica'),
  ('Hilo', 'Hilos y Bordados Centroamérica', 'Óscar Velásquez', 'J0310000007788', '2278-1022', 'pedidos@hilosca.ni', 'Mercado Oriental, Managua', 'Nicaragua', 'Persona jurídica'),
  ('Estampado', 'Sublimación Total', 'Karla Mendoza', 'J0310000009031', '2252-3390', 'contacto@sublimaciontotal.ni', 'Bello Horizonte, Managua', 'Nicaragua', 'Persona jurídica'),
  ('Accesorio', 'Mercería Don Julio', 'Julio Castillo', '001-120578-0004K', '8845-2210', 'merceriadonjulio@correo.ni', 'Masaya, frente al parque central', 'Nicaragua', 'Persona natural')
) AS v(tipo, nombre, contacto, nit, telefono, correo, direccion, pais, tipo_prov)
JOIN tipo_insumo t ON t.nombre = v.tipo
ON CONFLICT (nit) DO NOTHING;

INSERT INTO producto(id_categoria_producto, id_talla, id_insumo_tela, nombre, precio_venta)
SELECT c.id_categoria_producto, ta.id_talla, i.id_insumo, v.nombre, v.precio
FROM (VALUES
  ('Uniformes de fútbol', 'S', 'Tela dry-fit', 'Camiseta de fútbol dry-fit S', 420),
  ('Uniformes de fútbol', 'M', 'Tela dry-fit', 'Camiseta de fútbol dry-fit M', 450),
  ('Uniformes de fútbol', 'L', 'Tela dry-fit', 'Camiseta de fútbol dry-fit L', 450),
  ('Jerseys de ciclismo', 'M', 'Tela licra para ciclismo', 'Jersey de ciclismo M', 780),
  ('Jerseys de ciclismo', 'L', 'Tela licra para ciclismo', 'Jersey de ciclismo L', 780),
  ('Camisetas publicitarias', 'M', 'Tela algodón peinado', 'Camiseta publicitaria M', 180),
  ('Camisetas publicitarias', 'L', 'Tela algodón peinado', 'Camiseta publicitaria L', 180)
) AS v(categoria, talla, tela, nombre, precio)
JOIN categoria_producto c ON c.nombre = v.categoria
JOIN talla ta ON ta.nombre = v.talla
JOIN insumo i ON i.nombre = v.tela
ON CONFLICT DO NOTHING;

-- Receta: insumos por unidad de producto.
INSERT INTO receta_producto(id_producto, id_insumo, cantidad)
SELECT p.id_producto, i.id_insumo, v.cantidad
FROM (VALUES
  ('Camiseta de fútbol dry-fit', 'Tela dry-fit', 1.2),
  ('Camiseta de fútbol dry-fit', 'Hilo poliéster', 0.05),
  ('Camiseta de fútbol dry-fit', 'Vinil textil', 0.1),
  ('Jersey de ciclismo', 'Tela licra para ciclismo', 1.4),
  ('Jersey de ciclismo', 'Hilo poliéster', 0.06),
  ('Jersey de ciclismo', 'Cremallera de 20 cm', 1),
  ('Jersey de ciclismo', 'Papel de sublimación', 0.8),
  ('Camiseta publicitaria', 'Tela algodón peinado', 1.1),
  ('Camiseta publicitaria', 'Hilo poliéster', 0.04),
  ('Camiseta publicitaria', 'Vinil textil', 0.08)
) AS v(producto, insumo, cantidad)
JOIN producto p ON p.nombre LIKE v.producto || ' %'
JOIN insumo i ON i.nombre = v.insumo
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Roles y usuarios
-- ---------------------------------------------------------------------
INSERT INTO rol(nombre) VALUES ('Vendedor'), ('Producción') ON CONFLICT (nombre) DO NOTHING;

CREATE TEMP TABLE acceso_rol(rol VARCHAR(40), modulo VARCHAR(40), accion VARCHAR(40)) ON COMMIT DROP;
INSERT INTO acceso_rol VALUES
  ('Vendedor', 'Clientes', 'Agregar'), ('Vendedor', 'Clientes', 'Editar'), ('Vendedor', 'Clientes', 'Ver detalle'),
  ('Vendedor', 'Cotizaciones', 'Agregar'), ('Vendedor', 'Cotizaciones', 'Editar'), ('Vendedor', 'Cotizaciones', 'Ver detalle'),
  ('Vendedor', 'Cotizaciones', 'Ver diseño'), ('Vendedor', 'Cotizaciones', 'Descargar cotización'),
  ('Vendedor', 'Pedidos', 'Agregar'), ('Vendedor', 'Pedidos', 'Ver detalle'), ('Vendedor', 'Pedidos', 'Ver diseño'),
  ('Vendedor', 'Ventas', 'Ver detalle'), ('Vendedor', 'Ventas', 'Ver comprobante'),
  ('Vendedor', 'Abonos', 'Agregar'), ('Vendedor', 'Abonos', 'Ver detalle'), ('Vendedor', 'Abonos', 'Ver comprobante'),
  ('Vendedor', 'Productos', 'Ver detalle'),
  ('Producción', 'Pedidos', 'Ver detalle'), ('Producción', 'Pedidos', 'Cambiar estado'),
  ('Producción', 'Pedidos', 'Ver diseño'), ('Producción', 'Pedidos', 'Descargar diseño'),
  ('Producción', 'Insumos', 'Ver detalle'), ('Producción', 'Productos', 'Ver detalle'),
  ('Producción', 'Órdenes de pedido', 'Ver detalle');

-- Solo a roles recien creados (sin modulos): no se tocan los permisos que ya se ajustaron.
CREATE TEMP TABLE rol_nuevo ON COMMIT DROP AS
  SELECT r.id_rol, r.nombre FROM rol r
  WHERE r.nombre IN ('Vendedor', 'Producción') AND NOT EXISTS (SELECT 1 FROM rolxpermiso x WHERE x.id_rol = r.id_rol);
INSERT INTO rolxpermiso(id_rol, id_permiso)
  SELECT DISTINCT r.id_rol, p.id_permiso FROM acceso_rol a
  JOIN rol_nuevo r ON r.nombre = a.rol JOIN permiso p ON p.nombre = a.modulo
ON CONFLICT DO NOTHING;
INSERT INTO rolxprivilegio(id_rol, id_privilegio)
  SELECT r.id_rol, pr.id_privilegio FROM acceso_rol a
  JOIN rol_nuevo r ON r.nombre = a.rol JOIN permiso p ON p.nombre = a.modulo
  JOIN privilegio pr ON pr.id_permiso = p.id_permiso AND pr.nombre = a.accion
ON CONFLICT DO NOTHING;

-- Clave inicial de los tres: Cambiar123! (hash bcrypt, costo 12).
INSERT INTO usuario(id_rol, nombre_usuario, contrasena_hash, correo_empresarial, nombre_empleado, id_tipo_documento, documento, telefono, cargo, fecha_ingreso)
SELECT r.id_rol, v.usuario, '$2a$12$sNVNjShYFsKJdsQcnypKIeFXE/ZZs5ZcaNEiD.K/6BtH5CsNNkudq', v.correo, v.nombre,
       d.id_tipo_documento, v.documento, v.telefono, v.cargo, CURRENT_DATE - v.dias
FROM (VALUES
  ('Vendedor', 'mgutierrez', 'mgutierrez@parceros.ni', 'María Gutiérrez', '001-230491-0031B', '8812-4450', 'Asesora de ventas', 420),
  ('Vendedor', 'jlopez', 'jlopez@parceros.ni', 'José López', '001-071195-0012M', '8790-1123', 'Asesor de ventas', 200),
  ('Producción', 'aruiz', 'aruiz@parceros.ni', 'Ana Ruiz', '401-150388-0007P', '8655-7788', 'Jefa de producción', 610)
) AS v(rol, usuario, correo, nombre, documento, telefono, cargo, dias)
JOIN rol r ON r.nombre = v.rol
JOIN tipo_documento d ON d.nombre = 'Cédula'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Clientes
-- ---------------------------------------------------------------------
INSERT INTO cliente(id_tipo_documento, nombre, documento, telefono, correo, direccion, pais)
SELECT d.id_tipo_documento, v.nombre, v.documento, v.telefono, v.correo, v.direccion, 'Nicaragua'
FROM (VALUES
  ('RUC', 'Club Deportivo Los Halcones', 'J0810000011223', '2255-8001', 'contacto@loshalcones.ni', 'Barrio Altagracia, Managua'),
  ('RUC', 'Escuela de Fútbol Pinolero', 'J0810000014567', '2289-4410', 'escuela@futbolpinolero.ni', 'Ciudad Sandino, Managua'),
  ('Cédula', 'Carlos Téllez (Ciclistas Unidos de Masaya)', '401-090287-0010R', '8833-2001', 'ctellez@ciclistasmasaya.ni', 'Masaya, Monimbó'),
  ('RUC', 'Distribuidora La Esquina S.A.', 'J0310000021876', '2270-1199', 'compras@laesquina.ni', 'Km 4 Carretera a Masaya, Managua'),
  ('RUC', 'Colegio San Lucas', 'J0810000030045', '2244-6620', 'administracion@colegiosanlucas.ni', 'Las Colinas, Managua'),
  ('Cédula', 'Laura Pérez', '001-110599-0044F', '8577-3321', 'laura.perez@correo.ni', 'Linda Vista, Managua')
) AS v(tipo, nombre, documento, telefono, correo, direccion)
JOIN tipo_documento d ON d.nombre = v.tipo
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. Compras y pedidos (solo en una base sin movimientos)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  recibida INT := (SELECT id_estado_compra FROM estado_compra WHERE nombre = 'Recibida');
  transito INT := (SELECT id_estado_compra FROM estado_compra WHERE nombre = 'En tránsito');
  efectivo INT := (SELECT id_metodo_pago FROM metodo_pago WHERE nombre = 'Efectivo');
  transf INT := (SELECT id_metodo_pago FROM metodo_pago WHERE nombre = 'Transferencia');
  vendedor INT := (SELECT id_usuario FROM usuario WHERE nombre_usuario = 'mgutierrez');
  vendedor2 INT := (SELECT id_usuario FROM usuario WHERE nombre_usuario = 'jlopez');
  c INT;
  p INT;

BEGIN
  IF EXISTS (SELECT 1 FROM compra) OR EXISTS (SELECT 1 FROM pedido) THEN
    RAISE NOTICE '021: ya hay compras o pedidos; no se crean los de ejemplo.';
    RETURN;
  END IF;
  -- Los triggers registran a este usuario en el kardex y en el historial.
  PERFORM set_config('app.user_id', vendedor::TEXT, TRUE);

  -- Compras recibidas: dan las existencias iniciales.
  INSERT INTO compra(id_proveedor, id_estado_compra, fecha, fecha_entrega, numero_factura)
    VALUES ((SELECT id_proveedor FROM proveedor WHERE nit = 'J0310000004512'), recibida, CURRENT_DATE - 60, CURRENT_DATE - 55, 'FAC-0012451')
    RETURNING id_compra INTO c;
  INSERT INTO detalle_compra_insumo(id_compra, id_insumo, cantidad, precio_unitario)
    SELECT c, id_insumo, v.cant, v.precio FROM (VALUES
      ('Tela dry-fit', 120, 95), ('Tela licra para ciclismo', 40, 160), ('Tela algodón peinado', 100, 85)
    ) AS v(n, cant, precio) JOIN insumo ON insumo.nombre = v.n;

  INSERT INTO compra(id_proveedor, id_estado_compra, fecha, fecha_entrega, numero_factura)
    VALUES ((SELECT id_proveedor FROM proveedor WHERE nit = 'J0310000007788'), recibida, CURRENT_DATE - 50, CURRENT_DATE - 48, 'HB-3390')
    RETURNING id_compra INTO c;
  INSERT INTO detalle_compra_insumo(id_compra, id_insumo, cantidad, precio_unitario)
    SELECT c, id_insumo, 24, 120 FROM insumo WHERE nombre = 'Hilo poliéster';

  INSERT INTO compra(id_proveedor, id_estado_compra, fecha, fecha_entrega, numero_factura)
    VALUES ((SELECT id_proveedor FROM proveedor WHERE nit = 'J0310000009031'), recibida, CURRENT_DATE - 45, CURRENT_DATE - 43, 'ST-00877')
    RETURNING id_compra INTO c;
  INSERT INTO detalle_compra_insumo(id_compra, id_insumo, cantidad, precio_unitario)
    SELECT c, id_insumo, v.cant, v.precio FROM (VALUES
      ('Vinil textil', 30, 140), ('Papel de sublimación', 50, 35), ('Tinta de sublimación', 5, 1450)
    ) AS v(n, cant, precio) JOIN insumo ON insumo.nombre = v.n;

  INSERT INTO compra(id_proveedor, id_estado_compra, fecha, fecha_entrega, numero_factura)
    VALUES ((SELECT id_proveedor FROM proveedor WHERE nit = '001-120578-0004K'), recibida, CURRENT_DATE - 40, CURRENT_DATE - 40, 'MDJ-215')
    RETURNING id_compra INTO c;
  INSERT INTO detalle_compra_insumo(id_compra, id_insumo, cantidad, precio_unitario)
    SELECT c, id_insumo, v.cant, v.precio FROM (VALUES
      ('Cremallera de 20 cm', 50, 18), ('Elástico de 3 cm', 40, 12)
    ) AS v(n, cant, precio) JOIN insumo ON insumo.nombre = v.n;

  -- Compra en transito: aun no suma existencias.
  INSERT INTO compra(id_proveedor, id_estado_compra, fecha, fecha_entrega, numero_factura)
    VALUES ((SELECT id_proveedor FROM proveedor WHERE nit = 'J0310000004512'), transito, CURRENT_DATE - 3, CURRENT_DATE + 5, 'FAC-0012980')
    RETURNING id_compra INTO c;
  INSERT INTO detalle_compra_insumo(id_compra, id_insumo, cantidad, precio_unitario)
    SELECT c, id_insumo, 80, 95 FROM insumo WHERE nombre = 'Tela dry-fit';

  -- Pedidos. Cada uno nace como cotizacion con sus lineas (productos y la
  -- copia de la receta) y avanza por las etapas como en la aplicacion.
  CREATE TEMP TABLE ej_pedido(clave INT, cliente TEXT, vend INT, producto TEXT, talla TEXT, cant INT, dias INT, descripcion TEXT) ON COMMIT DROP;
  INSERT INTO ej_pedido VALUES
    (1, 'J0810000011223', vendedor, 'Camiseta de fútbol dry-fit M', 'M', 20, 40, 'Uniforme de local, azul y blanco, con número y escudo.'),
    (2, '401-090287-0010R', vendedor, 'Jersey de ciclismo L', 'L', 10, 25, 'Jersey sublimado para la vuelta a Masaya.'),
    (3, 'J0810000014567', vendedor2, 'Camiseta de fútbol dry-fit S', 'S', 30, 12, 'Camisetas de entrenamiento para la categoría infantil.'),
    (4, 'J0310000021876', vendedor2, 'Camiseta publicitaria L', 'L', 50, 20, 'Camisetas con logo para la feria de aniversario.'),
    (5, 'J0810000030045', vendedor, 'Camiseta publicitaria M', 'M', 25, 5, 'Camisetas para el día del deporte (cotización).');

  FOR p IN SELECT clave FROM ej_pedido ORDER BY clave LOOP
    INSERT INTO pedido(id_cliente, id_estado_pedido, id_vendedor, fecha_creacion, fecha_entrega, descripcion)
      SELECT cl.id_cliente, (SELECT id_estado_pedido FROM estado_pedido WHERE orden = 1), e.vend,
             CURRENT_DATE - e.dias, CURRENT_DATE - e.dias + 21, e.descripcion
      FROM ej_pedido e JOIN cliente cl ON cl.documento = e.cliente WHERE e.clave = p
      RETURNING id_pedido INTO c;
    UPDATE ej_pedido SET clave = -c WHERE clave = p; -- guarda el id real (negativo) en la fila
    INSERT INTO detalle_pedido_producto(id_pedido, id_producto, cantidad, precio_unitario)
      SELECT c, pr.id_producto, e.cant, pr.precio_venta FROM ej_pedido e JOIN producto pr ON pr.nombre = e.producto WHERE e.clave = -c;
    INSERT INTO detalle_pedido_talla(id_pedido, id_talla, cantidad)
      SELECT c, t.id_talla, e.cant FROM ej_pedido e JOIN talla t ON t.nombre = e.talla WHERE e.clave = -c;
    INSERT INTO detalle_pedido_insumo(id_pedido, id_insumo, cantidad, precio_unitario, de_receta)
      SELECT c, r.id_insumo, r.cantidad * e.cant, 0, TRUE
      FROM ej_pedido e JOIN producto pr ON pr.nombre = e.producto JOIN receta_producto r ON r.id_producto = pr.id_producto
      WHERE e.clave = -c;
  END LOOP;

  -- 1: entregado y pagado (C$ 9 000).
  SELECT -clave INTO p FROM ej_pedido WHERE cliente = 'J0810000011223';
  INSERT INTO abono(id_pedido, id_metodo_pago, monto, fecha) VALUES (p, transf, 5000, CURRENT_DATE - 39);
  UPDATE pedido SET id_estado_pedido = (SELECT id_estado_pedido FROM estado_pedido WHERE orden = 2), fecha_inicio = CURRENT_DATE - 39 WHERE id_pedido = p;
  INSERT INTO abono(id_pedido, id_metodo_pago, monto, fecha) VALUES (p, efectivo, 4000, CURRENT_DATE - 20);
  UPDATE pedido SET id_estado_pedido = (SELECT id_estado_pedido FROM estado_pedido WHERE orden = 4) WHERE id_pedido = p;
  UPDATE pedido SET id_estado_pedido = (SELECT id_estado_pedido FROM estado_pedido WHERE orden = 5) WHERE id_pedido = p;

  -- 2: terminado con saldo pendiente (C$ 7 800, abonado 4 000).
  SELECT -clave INTO p FROM ej_pedido WHERE cliente = '401-090287-0010R';
  INSERT INTO abono(id_pedido, id_metodo_pago, monto, fecha) VALUES (p, efectivo, 4000, CURRENT_DATE - 24);
  UPDATE pedido SET id_estado_pedido = (SELECT id_estado_pedido FROM estado_pedido WHERE orden = 2), fecha_inicio = CURRENT_DATE - 24 WHERE id_pedido = p;
  UPDATE pedido SET id_estado_pedido = (SELECT id_estado_pedido FROM estado_pedido WHERE orden = 3) WHERE id_pedido = p;

  -- 3: en produccion (C$ 12 600, abonado la mitad).
  SELECT -clave INTO p FROM ej_pedido WHERE cliente = 'J0810000014567';
  INSERT INTO abono(id_pedido, id_metodo_pago, monto, fecha) VALUES (p, transf, 6300, CURRENT_DATE - 11);
  UPDATE pedido SET id_estado_pedido = (SELECT id_estado_pedido FROM estado_pedido WHERE orden = 2), fecha_inicio = CURRENT_DATE - 11 WHERE id_pedido = p;

  -- 4: completado y pagado, listo para entregar (C$ 9 000).
  SELECT -clave INTO p FROM ej_pedido WHERE cliente = 'J0310000021876';
  INSERT INTO abono(id_pedido, id_metodo_pago, monto, fecha) VALUES (p, transf, 9000, CURRENT_DATE - 19);
  UPDATE pedido SET id_estado_pedido = (SELECT id_estado_pedido FROM estado_pedido WHERE orden = 2), fecha_inicio = CURRENT_DATE - 19 WHERE id_pedido = p;
  UPDATE pedido SET id_estado_pedido = (SELECT id_estado_pedido FROM estado_pedido WHERE orden = 4) WHERE id_pedido = p;

  -- 5: queda como cotizacion aprobada, sin abonos.
END $$;

COMMIT;
