-- =====================================================================
-- 014 · Una compra recibida no vuelve a «En tránsito», pero si se anula
--
-- Reemplaza la regla de la 013:
-- - Recibida -> En tránsito: no se permite.
-- - Recibida -> Anulada: se permite, con motivo; sus insumos salen del
--   inventario (lo hace compra_kardex), salvo que ya se hayan gastado.
-- - Anular sigue exigiendo el motivo (minimo 10 caracteres).
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION validar_anulacion_compra() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE anulada INT; recibida INT; transito INT; faltan TEXT;
BEGIN
  SELECT id_estado_compra INTO anulada FROM estado_compra WHERE nombre = 'Anulada';
  SELECT id_estado_compra INTO recibida FROM estado_compra WHERE nombre = 'Recibida';
  SELECT id_estado_compra INTO transito FROM estado_compra WHERE nombre = 'En tránsito';

  IF TG_OP = 'UPDATE' AND OLD.id_estado_compra = recibida AND NEW.id_estado_compra = transito THEN
    RAISE EXCEPTION 'Una compra recibida no puede volver a «En tránsito». Si hubo un error, anúlela.';
  END IF;

  IF NEW.id_estado_compra = anulada AND (TG_OP = 'INSERT' OR OLD.id_estado_compra <> anulada) THEN
    IF NEW.motivo_anulacion IS NULL OR length(trim(NEW.motivo_anulacion)) < 10 THEN
      RAISE EXCEPTION 'Indique el motivo de la anulación (mínimo 10 caracteres).';
    END IF;
    -- Anular una recibida retira sus insumos: no se puede si ya se gastaron.
    IF TG_OP = 'UPDATE' AND OLD.id_estado_compra = recibida THEN
      SELECT string_agg(i.nombre, ', ') INTO faltan
      FROM detalle_compra_insumo d
      JOIN insumo i ON i.id_insumo = d.id_insumo
      JOIN v_insumo_stock s ON s.id_insumo = d.id_insumo
      WHERE d.id_compra = NEW.id_compra AND s.stock < d.cantidad;
      IF faltan IS NOT NULL THEN
        RAISE EXCEPTION 'No se puede anular: los insumos de esta compra ya se usaron en producción (%).', faltan;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

COMMIT;
