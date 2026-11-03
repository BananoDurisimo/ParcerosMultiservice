-- =====================================================================
-- 016 · Catalogo de tallas: XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL y 6XL
--
-- La tabla `talla` es fija del sistema (no se edita desde el aplicativo) y
-- se usa en los productos base. Se reemplaza el catalogo de la 006:
-- - XXL y XXXL pasan a llamarse 2XL y 3XL (conservan su id).
-- - Se agregan 4XL, 5XL y 6XL.
-- - Se quitan las tallas de niño (2 a 16) y «Única», salvo que algun
--   producto ya las use.
-- - El orden va de la mas pequeña a la mas grande.
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

UPDATE talla SET nombre = '2XL'
 WHERE nombre = 'XXL' AND NOT EXISTS (SELECT 1 FROM talla WHERE nombre = '2XL');
UPDATE talla SET nombre = '3XL'
 WHERE nombre = 'XXXL' AND NOT EXISTS (SELECT 1 FROM talla WHERE nombre = '3XL');

INSERT INTO talla(nombre, orden) VALUES
  ('XS', 1), ('S', 2), ('M', 3), ('L', 4), ('XL', 5),
  ('2XL', 6), ('3XL', 7), ('4XL', 8), ('5XL', 9), ('6XL', 10)
ON CONFLICT (nombre) DO NOTHING;

DELETE FROM talla t
 WHERE t.nombre NOT IN ('XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL')
   AND NOT EXISTS (SELECT 1 FROM producto p WHERE p.id_talla = t.id_talla);

UPDATE talla SET orden = CASE nombre
  WHEN 'XS' THEN 1 WHEN 'S' THEN 2 WHEN 'M' THEN 3 WHEN 'L' THEN 4 WHEN 'XL' THEN 5
  WHEN '2XL' THEN 6 WHEN '3XL' THEN 7 WHEN '4XL' THEN 8 WHEN '5XL' THEN 9 WHEN '6XL' THEN 10
  ELSE 100 END;

COMMIT;
