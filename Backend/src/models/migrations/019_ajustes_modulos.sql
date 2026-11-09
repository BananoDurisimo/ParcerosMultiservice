-- =====================================================================
-- 019 · Ajustes de modulos
--
-- 1. Se retira el modulo Movimientos: se quitan los triggers de auditoria,
--    la tabla `movimientos` (con su historial) y el permiso con sus
--    privilegios (las asignaciones a los roles se borran en cascada, 008).
-- 2. El modulo Compras pasa a llamarse «Órdenes de pedido».
-- 3. Proveedor con tipo: persona natural o persona juridica.
-- 4. Compra (orden de pedido) con numero de factura.
-- 5. Cliente con pais: define los tipos de documento que se le ofrecen.
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

-- 1. Movimientos
DROP FUNCTION IF EXISTS auditar() CASCADE;
DROP TABLE IF EXISTS movimientos;
DELETE FROM privilegio pr USING permiso p WHERE p.id_permiso = pr.id_permiso AND p.nombre = 'Movimientos';
DELETE FROM permiso WHERE nombre = 'Movimientos';

-- 2. Compras -> Órdenes de pedido
UPDATE permiso SET nombre = 'Órdenes de pedido' WHERE nombre = 'Compras';

-- 3. Tipo de proveedor
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS tipo_proveedor VARCHAR(20) NOT NULL DEFAULT 'Persona jurídica';
ALTER TABLE proveedor DROP CONSTRAINT IF EXISTS proveedor_tipo_proveedor_check;
ALTER TABLE proveedor ADD CONSTRAINT proveedor_tipo_proveedor_check
  CHECK (tipo_proveedor IN ('Persona natural', 'Persona jurídica'));

-- 4. Numero de factura (las compras anteriores no lo tienen)
ALTER TABLE compra ADD COLUMN IF NOT EXISTS numero_factura VARCHAR(30);

-- 5. Pais del cliente
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS pais VARCHAR(60) NOT NULL DEFAULT 'Nicaragua';

COMMIT;
