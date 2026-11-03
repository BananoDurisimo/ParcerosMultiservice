-- =====================================================================
-- 016 · Unidad «Centímetro» y sin cheque
--
-- 1. Las telas y cintas se miden en yardas, metros o centimetros: se agrega
--    la unidad que faltaba.
-- 2. El cheque deja de ser un metodo de pago. Solo se borra si ningun abono
--    lo usa; si ya hay abonos pagados con cheque, se conserva para ellos y el
--    frontend deja de ofrecerlo.
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

-- 1. Centimetro
INSERT INTO unidad_medida(nombre, abreviatura) VALUES ('Centímetro', 'cm') ON CONFLICT DO NOTHING;

-- 2. Cheque
DELETE FROM metodo_pago m
 WHERE m.nombre = 'Cheque'
   AND NOT EXISTS (SELECT 1 FROM abono a WHERE a.id_metodo_pago = m.id_metodo_pago);

COMMIT;
