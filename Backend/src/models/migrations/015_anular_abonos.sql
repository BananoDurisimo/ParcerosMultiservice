-- =====================================================================
-- 015 · Los abonos no se eliminan: se anulan con motivo
--
-- 1. abono.anulado + motivo_anulacion: el abono anulado se conserva como
--    registro, pero deja de contar en lo abonado (el saldo vuelve a subir).
--    El motivo es obligatorio (minimo 10 caracteres) y la anulacion es final.
-- 2. Total del pedido y reglas del abono: solo cuentan los abonos vigentes
--    (el primero de ellos debe ser de al menos el 50% del total).
-- 3. Permisos: Abonos pierde «Eliminar» y gana «Anular». Un abono no se borra
--    de la base de datos; al eliminar un pedido se borran con el sus abonos
--    anulados (el frontend exige anular antes los vigentes).
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

-- 1. Columnas
ALTER TABLE abono ADD COLUMN IF NOT EXISTS anulado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE abono ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

CREATE OR REPLACE FUNCTION validar_anulacion_abono() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.anulado AND NOT NEW.anulado THEN
    RAISE EXCEPTION 'Un abono anulado no se puede reactivar.';
  END IF;
  IF NEW.anulado AND NOT OLD.anulado AND (NEW.motivo_anulacion IS NULL OR length(trim(NEW.motivo_anulacion)) < 10) THEN
    RAISE EXCEPTION 'Indique el motivo de la anulación (mínimo 10 caracteres).';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_abono_anulacion ON abono;
CREATE TRIGGER trg_abono_anulacion BEFORE UPDATE OF anulado, motivo_anulacion ON abono
  FOR EACH ROW EXECUTE FUNCTION validar_anulacion_abono();

-- 2. Solo los abonos vigentes cuentan en lo abonado y en el saldo.
CREATE OR REPLACE VIEW v_pedido_total AS
SELECT t.id_pedido, t.total::NUMERIC(12,2) AS total, t.abonado::NUMERIC(12,2) AS abonado, (t.total - t.abonado)::NUMERIC(12,2) AS saldo
FROM (
  SELECT p.id_pedido,
    COALESCE((SELECT SUM(d.cantidad * d.precio_unitario) FROM detalle_pedido_insumo d WHERE d.id_pedido = p.id_pedido), 0)
      + COALESCE((SELECT SUM(dp.cantidad * dp.precio_unitario) FROM detalle_pedido_producto dp WHERE dp.id_pedido = p.id_pedido), 0) AS total,
    COALESCE((SELECT SUM(a.monto) FROM abono a WHERE a.id_pedido = p.id_pedido AND NOT a.anulado), 0) AS abonado
  FROM pedido p
) t;

CREATE OR REPLACE FUNCTION validar_abono() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v RECORD;
  saldo NUMERIC;
  previos INT;
BEGIN
  IF NEW.anulado THEN RETURN NEW; END IF;
  SELECT t.total, t.saldo INTO v FROM v_pedido_total t WHERE t.id_pedido = NEW.id_pedido;
  saldo := v.saldo;
  IF TG_OP = 'UPDATE' AND OLD.id_pedido = NEW.id_pedido AND NOT OLD.anulado THEN saldo := saldo + OLD.monto; END IF;
  IF NEW.monto > saldo + 0.005 THEN RAISE EXCEPTION 'El abono excede el saldo pendiente del pedido.'; END IF;
  -- Abonos vigentes anteriores a este: al editar, solo los que se registraron antes.
  SELECT count(*) INTO previos FROM abono a
  WHERE a.id_pedido = NEW.id_pedido AND NOT a.anulado AND (TG_OP = 'INSERT' OR a.id_abono < NEW.id_abono);
  IF previos = 0 AND NEW.monto < v.total * 0.5 - 0.005 THEN
    RAISE EXCEPTION 'El primer abono debe ser de al menos el 50%% del total del pedido.';
  END IF;
  RETURN NEW;
END $$;

-- 3. Permisos: «Anular» en lugar de «Eliminar»
INSERT INTO privilegio(id_permiso, nombre)
  SELECT id_permiso, 'Anular' FROM permiso WHERE nombre = 'Abonos'
ON CONFLICT (id_permiso, nombre) DO NOTHING;
-- Quien podia eliminar abonos pasa a poder anularlos.
INSERT INTO rolxprivilegio(id_rol, id_privilegio)
  SELECT x.id_rol, nuevo.id_privilegio
  FROM rolxprivilegio x
  JOIN privilegio viejo ON viejo.id_privilegio = x.id_privilegio AND viejo.nombre = 'Eliminar'
  JOIN permiso p ON p.id_permiso = viejo.id_permiso AND p.nombre = 'Abonos'
  JOIN privilegio nuevo ON nuevo.id_permiso = p.id_permiso AND nuevo.nombre = 'Anular'
ON CONFLICT DO NOTHING;
INSERT INTO rolxprivilegio(id_rol, id_privilegio)
  SELECT r.id_rol, pr.id_privilegio FROM rol r
  JOIN rolxpermiso rp ON rp.id_rol = r.id_rol
  JOIN privilegio pr ON pr.id_permiso = rp.id_permiso AND pr.nombre = 'Anular'
  JOIN permiso p ON p.id_permiso = pr.id_permiso AND p.nombre = 'Abonos'
  WHERE r.nombre = 'Administrador'
ON CONFLICT DO NOTHING;
-- Se retira «Eliminar» de Abonos (sus asignaciones se borran en cascada).
DELETE FROM privilegio pr USING permiso p
WHERE p.id_permiso = pr.id_permiso AND p.nombre = 'Abonos' AND pr.nombre = 'Eliminar';

COMMIT;
