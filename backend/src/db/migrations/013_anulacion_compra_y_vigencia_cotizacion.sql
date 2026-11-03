-- =====================================================================
-- 013 · Anulacion de compras con justificacion y vigencia de cotizaciones
--
-- 1. Compra anulada: guarda el motivo (obligatorio) y una compra Recibida
--    no se puede anular (sus insumos ya ingresaron al inventario).
-- 2. Cotizacion vigente hasta el 31 de diciembre del año en que se creo:
--    vencida, ya no recibe abonos (y por eso no pasa a pedido).
-- Las existencias de los insumos solo cambian por compras y pedidos: la API
-- deja de registrar ajustes manuales (crud.js); la tabla no cambia.
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

-- 1. Anulacion de compras
ALTER TABLE compra ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

CREATE OR REPLACE FUNCTION validar_anulacion_compra() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE anulada INT; recibida INT;
BEGIN
  SELECT id_estado_compra INTO anulada FROM estado_compra WHERE nombre = 'Anulada';
  SELECT id_estado_compra INTO recibida FROM estado_compra WHERE nombre = 'Recibida';
  IF NEW.id_estado_compra = anulada AND (TG_OP = 'INSERT' OR OLD.id_estado_compra <> anulada) THEN
    IF TG_OP = 'UPDATE' AND OLD.id_estado_compra = recibida THEN
      RAISE EXCEPTION 'Una compra recibida no se puede anular: sus insumos ya ingresaron al inventario.';
    END IF;
    IF NEW.motivo_anulacion IS NULL OR length(trim(NEW.motivo_anulacion)) < 10 THEN
      RAISE EXCEPTION 'Indique el motivo de la anulación (mínimo 10 caracteres).';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_compra_anulacion ON compra;
CREATE TRIGGER trg_compra_anulacion BEFORE INSERT OR UPDATE OF id_estado_compra, motivo_anulacion ON compra
  FOR EACH ROW EXECUTE FUNCTION validar_anulacion_compra();

-- 2. Cotizacion vencida: no recibe abonos
CREATE OR REPLACE FUNCTION validar_vigencia_cotizacion() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE p RECORD;
BEGIN
  SELECT pe.fecha_creacion, e.orden INTO p FROM pedido pe JOIN estado_pedido e USING (id_estado_pedido) WHERE pe.id_pedido = NEW.id_pedido;
  IF p.orden = 1 AND CURRENT_DATE > make_date(extract(year FROM p.fecha_creacion)::int, 12, 31) THEN
    RAISE EXCEPTION 'La cotización está vencida (era válida hasta el 31/12/%): no puede recibir abonos.', extract(year FROM p.fecha_creacion)::int;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_abono_vigencia ON abono;
CREATE TRIGGER trg_abono_vigencia BEFORE INSERT ON abono
  FOR EACH ROW EXECUTE FUNCTION validar_vigencia_cotizacion();

COMMIT;
