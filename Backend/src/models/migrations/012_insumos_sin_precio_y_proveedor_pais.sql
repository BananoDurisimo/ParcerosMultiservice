-- =====================================================================
-- 012 · Insumos sin precio y proveedor con pais
--
-- 1. El insumo deja de tener precio: lo que se vende son los productos.
--    La columna se conserva (opcional, 0 por defecto) para no perder el
--    historico; la compra sigue guardando lo que se pago en cada linea.
-- 2. Proveedor: se registra con nombre, telefono, pais y tipo de insumo.
--    El NIT deja de ser obligatorio; los datos que ya existen se conservan.
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

-- 1. Insumo sin precio
ALTER TABLE insumo ALTER COLUMN precio_unitario SET DEFAULT 0;
ALTER TABLE insumo ALTER COLUMN precio_unitario DROP NOT NULL;

-- 2. Proveedor
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS pais VARCHAR(60) NOT NULL DEFAULT 'Nicaragua';
ALTER TABLE proveedor ALTER COLUMN nit DROP NOT NULL;

COMMIT;
