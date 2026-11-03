-- =====================================================================
-- 017 · Insumos de personalizacion defectuosos
--
-- Igual que las prendas defectuosas (011), cada insumo de personalizacion
-- del pedido guarda cuanto se echo a perder (en la unidad del insumo). Lo
-- perdido se descuenta del inventario junto con la receta de los productos
-- (lineas `de_receta`, que el frontend recalcula al guardar), asi que el
-- kardex no cambia. No se cobra: el total del pedido sigue igual.
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

ALTER TABLE detalle_pedido_insumo ADD COLUMN IF NOT EXISTS defectuosas NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE detalle_pedido_insumo DROP CONSTRAINT IF EXISTS detalle_pedido_insumo_defectuosas_check;
ALTER TABLE detalle_pedido_insumo ADD CONSTRAINT detalle_pedido_insumo_defectuosas_check CHECK (defectuosas >= 0);

COMMIT;
