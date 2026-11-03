-- =====================================================================
-- 006 · Productos base, categorias, recetas y exportacion por modulo
--
-- 1. Se retira el modulo Reportes: cada modulo genera su propio reporte.
-- 2. Tallas: catalogo de la tabla `talla`, que estaba vacia.
-- 3. Categorias de producto (tipo de prenda) y productos base. Un producto
--    es una prenda en una talla y una tela (p. ej. «Jersey XL Drift») con su
--    precio de venta y su receta: los insumos que gasta una unidad.
-- 4. Pedido con productos: detalle_pedido_producto guarda lo que se cobra
--    (cantidad x precio de venta). Los insumos de la receta se copian a
--    detalle_pedido_insumo con `de_receta` y precio 0: descuentan inventario
--    pero no se cobran, porque el precio del producto ya los incluye. Los
--    insumos de personalizacion (estampado, colores, diseño) siguen como
--    lineas con su precio.
-- 5. Total del pedido = productos + insumos de personalizacion.
-- 6. Inventario: el consumo de un pedido se agrupa por insumo, porque un
--    mismo insumo puede venir de la receta y de la personalizacion.
-- 7. Privilegio «Exportar» (exportar y generar el reporte) en los modulos
--    de abonos, cotizaciones, pedidos, ventas, insumos y compras.
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- 1. Retirar el modulo Reportes (los roles pierden el permiso y sus acciones)
-- ---------------------------------------------------------------------
DELETE FROM privilegio WHERE id_permiso IN (SELECT id_permiso FROM permiso WHERE nombre = 'Reportes');
DELETE FROM permiso WHERE nombre = 'Reportes';

-- ---------------------------------------------------------------------
-- 2. Tallas
-- ---------------------------------------------------------------------
INSERT INTO talla(nombre, orden) VALUES
  ('2', 1), ('4', 2), ('6', 3), ('8', 4), ('10', 5), ('12', 6), ('14', 7), ('16', 8),
  ('XS', 9), ('S', 10), ('M', 11), ('L', 12), ('XL', 13), ('XXL', 14), ('XXXL', 15), ('Única', 16)
ON CONFLICT (nombre) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. Categorias, productos y recetas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categoria_producto (
  id_categoria_producto SERIAL PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE,
  descripcion VARCHAR(200),
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS producto (
  id_producto SERIAL PRIMARY KEY,
  id_categoria_producto INT NOT NULL REFERENCES categoria_producto,
  id_talla INT NOT NULL REFERENCES talla,
  id_insumo_tela INT NOT NULL REFERENCES insumo,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  precio_venta NUMERIC(10,2) NOT NULL CHECK (precio_venta >= 0),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (id_categoria_producto, id_talla, id_insumo_tela)
);

CREATE TABLE IF NOT EXISTS receta_producto (
  id_producto INT REFERENCES producto ON DELETE CASCADE,
  id_insumo INT REFERENCES insumo,
  cantidad NUMERIC(10,3) NOT NULL CHECK (cantidad > 0),
  PRIMARY KEY (id_producto, id_insumo)
);

-- ---------------------------------------------------------------------
-- 4. Pedido con productos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detalle_pedido_producto (
  id_pedido INT REFERENCES pedido ON DELETE CASCADE,
  id_producto INT REFERENCES producto,
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
  PRIMARY KEY (id_pedido, id_producto)
);

ALTER TABLE detalle_pedido_insumo ADD COLUMN IF NOT EXISTS de_receta BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE detalle_pedido_insumo DROP CONSTRAINT IF EXISTS detalle_pedido_insumo_pkey;
ALTER TABLE detalle_pedido_insumo ADD PRIMARY KEY (id_pedido, id_insumo, de_receta);

-- ---------------------------------------------------------------------
-- 5. Total del pedido: productos + insumos (los de receta van a precio 0)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_pedido_total AS
SELECT t.id_pedido, t.total::NUMERIC(12,2) AS total, t.abonado::NUMERIC(12,2) AS abonado, (t.total - t.abonado)::NUMERIC(12,2) AS saldo
FROM (
  SELECT p.id_pedido,
    COALESCE((SELECT SUM(d.cantidad * d.precio_unitario) FROM detalle_pedido_insumo d WHERE d.id_pedido = p.id_pedido), 0)
      + COALESCE((SELECT SUM(dp.cantidad * dp.precio_unitario) FROM detalle_pedido_producto dp WHERE dp.id_pedido = p.id_pedido), 0) AS total,
    COALESCE((SELECT SUM(a.monto) FROM abono a WHERE a.id_pedido = p.id_pedido), 0) AS abonado
  FROM pedido p
) t;

-- ---------------------------------------------------------------------
-- 6. Inventario: consumo agrupado por insumo
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_pedido_consumo AS
SELECT id_pedido, id_insumo, SUM(cantidad)::NUMERIC(12,3) AS cantidad
FROM detalle_pedido_insumo GROUP BY id_pedido, id_insumo;

CREATE OR REPLACE FUNCTION pedido_kardex() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.id_estado_pedido = NEW.id_estado_pedido THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN DELETE FROM movimiento_inventario WHERE id_pedido = NEW.id_pedido AND origen = 'PEDIDO'; END IF;
  IF (SELECT consume_inventario FROM estado_pedido WHERE id_estado_pedido = NEW.id_estado_pedido) THEN
    IF EXISTS (SELECT 1 FROM v_pedido_consumo c JOIN v_insumo_stock s ON s.id_insumo = c.id_insumo
               WHERE c.id_pedido = NEW.id_pedido AND s.stock < c.cantidad) THEN
      RAISE EXCEPTION 'Inventario insuficiente para iniciar el pedido';
    END IF;
    INSERT INTO movimiento_inventario(id_insumo, cantidad, origen, id_pedido, id_usuario)
      SELECT id_insumo, -cantidad, 'PEDIDO', NEW.id_pedido, app_user_id() FROM v_pedido_consumo WHERE id_pedido = NEW.id_pedido;
  END IF;
  INSERT INTO historial_estado_pedido(id_pedido, id_estado_pedido, id_usuario) VALUES (NEW.id_pedido, NEW.id_estado_pedido, app_user_id());
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION repedido_kardex() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE pedido_id INT;
BEGIN
  pedido_id := COALESCE(NEW.id_pedido, OLD.id_pedido);
  IF (SELECT consume_inventario FROM pedido p JOIN estado_pedido e ON e.id_estado_pedido = p.id_estado_pedido WHERE p.id_pedido = pedido_id) THEN
    IF EXISTS (
      SELECT 1 FROM v_pedido_consumo c JOIN v_insumo_stock s ON s.id_insumo = c.id_insumo
      WHERE c.id_pedido = pedido_id
        AND s.stock + COALESCE((SELECT SUM(-mi.cantidad) FROM movimiento_inventario mi WHERE mi.id_pedido = pedido_id AND mi.id_insumo = c.id_insumo), 0) < c.cantidad
    ) THEN
      RAISE EXCEPTION 'Inventario insuficiente para el pedido';
    END IF;
    DELETE FROM movimiento_inventario WHERE id_pedido = pedido_id AND origen = 'PEDIDO';
    INSERT INTO movimiento_inventario(id_insumo, cantidad, origen, id_pedido, id_usuario)
      SELECT id_insumo, -cantidad, 'PEDIDO', pedido_id, app_user_id() FROM v_pedido_consumo WHERE id_pedido = pedido_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

-- Auditoria de las tablas nuevas.
DROP TRIGGER IF EXISTS trg_audit_categoria_producto ON categoria_producto;
CREATE TRIGGER trg_audit_categoria_producto AFTER INSERT OR UPDATE OR DELETE ON categoria_producto
  FOR EACH ROW EXECUTE FUNCTION auditar('id_categoria_producto');
DROP TRIGGER IF EXISTS trg_audit_producto ON producto;
CREATE TRIGGER trg_audit_producto AFTER INSERT OR UPDATE OR DELETE ON producto
  FOR EACH ROW EXECUTE FUNCTION auditar('id_producto');

-- ---------------------------------------------------------------------
-- 7. Permisos de los modulos nuevos y privilegio «Exportar»
-- ---------------------------------------------------------------------
CREATE TEMP TABLE acceso_006(modulo VARCHAR(40), accion VARCHAR(40)) ON COMMIT DROP;
INSERT INTO acceso_006(modulo, accion) VALUES
  ('Categorías de producto','Agregar'),('Categorías de producto','Editar'),('Categorías de producto','Ver detalle'),
  ('Categorías de producto','Cambiar estado'),('Categorías de producto','Eliminar'),
  ('Productos','Agregar'),('Productos','Editar'),('Productos','Ver detalle'),('Productos','Cambiar estado'),('Productos','Eliminar'),
  ('Abonos','Exportar'),('Cotizaciones','Exportar'),('Pedidos','Exportar'),('Ventas','Exportar'),
  ('Insumos','Exportar'),('Compras','Exportar');

INSERT INTO permiso(nombre) SELECT DISTINCT modulo FROM acceso_006 ON CONFLICT (nombre) DO NOTHING;
INSERT INTO privilegio(id_permiso, nombre)
  SELECT p.id_permiso, a.accion FROM acceso_006 a JOIN permiso p ON p.nombre = a.modulo
ON CONFLICT (id_permiso, nombre) DO NOTHING;

-- El Administrador conserva el acceso completo (primero los modulos, luego sus acciones).
INSERT INTO rolxpermiso(id_rol, id_permiso)
  SELECT r.id_rol, p.id_permiso FROM rol r CROSS JOIN permiso p WHERE r.nombre = 'Administrador'
ON CONFLICT DO NOTHING;
INSERT INTO rolxprivilegio(id_rol, id_privilegio)
  SELECT r.id_rol, pr.id_privilegio FROM rol r CROSS JOIN privilegio pr WHERE r.nombre = 'Administrador'
ON CONFLICT DO NOTHING;
-- Los demas roles reciben «Exportar» desde el formulario de Roles, como
-- cualquier otro privilegio.

COMMIT;
