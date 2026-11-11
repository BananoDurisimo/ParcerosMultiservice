-- =====================================================================
-- 020 · Integridad, concurrencia y rendimiento
--
-- 1. Indices en las llaves foraneas y en las consultas frecuentes.
-- 2. Abonos: el pedido se bloquea mientras se valida el saldo, para que dos
--    abonos simultaneos no lo superen.
-- 3. Estado del pedido: el recorrido que ya aplicaba el frontend se valida
--    tambien en la base de datos.
-- 4. Inventario: un cambio de estado entre etapas que ya consumen no vuelve a
--    escribir el kardex (se perdian la fecha y el responsable originales), y
--    la verificacion de existencias se hace en serie.
-- Es idempotente y no borra ni modifica datos existentes.
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- 1. Indices
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_abono_pedido ON abono(id_pedido);
CREATE INDEX IF NOT EXISTS idx_pedido_cliente ON pedido(id_cliente);
CREATE INDEX IF NOT EXISTS idx_compra_proveedor ON compra(id_proveedor);
CREATE INDEX IF NOT EXISTS idx_historial_pedido ON historial_estado_pedido(id_pedido);
CREATE INDEX IF NOT EXISTS idx_mov_inv_insumo ON movimiento_inventario(id_insumo);
CREATE INDEX IF NOT EXISTS idx_mov_inv_pedido ON movimiento_inventario(id_pedido) WHERE id_pedido IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mov_inv_compra ON movimiento_inventario(id_compra) WHERE id_compra IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usuario_correo ON usuario(lower(correo_empresarial));

-- ---------------------------------------------------------------------
-- 2. Abonos: validacion del saldo en serie por pedido (reglas de la 015)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_abono() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v RECORD;
  saldo NUMERIC;
  previos INT;
BEGIN
  IF NEW.anulado THEN RETURN NEW; END IF;
  -- Otro abono del mismo pedido espera aqui hasta que este termine.
  PERFORM 1 FROM pedido WHERE id_pedido = NEW.id_pedido FOR UPDATE;
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

-- ---------------------------------------------------------------------
-- 3. Recorrido de estados del pedido (orden de estado_pedido):
--    1 cotizacion -> 2 en proceso (con un abono vigente)
--    2 -> 3 falta pago (con saldo) · 2 -> 4 completado (sin saldo)
--    3 -> 4 al saldarse · 4 -> 3 si se anula un abono
--    4 -> 5 entregado (sin saldo)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_estado_pedido() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  de SMALLINT;
  a SMALLINT;
  saldo NUMERIC;
BEGIN
  IF NEW.id_estado_pedido = OLD.id_estado_pedido THEN RETURN NEW; END IF;
  SELECT orden INTO de FROM estado_pedido WHERE id_estado_pedido = OLD.id_estado_pedido;
  SELECT orden INTO a FROM estado_pedido WHERE id_estado_pedido = NEW.id_estado_pedido;
  IF (de, a) NOT IN ((1, 2), (2, 3), (2, 4), (3, 4), (4, 3), (4, 5)) THEN
    RAISE EXCEPTION 'El pedido no puede pasar a ese estado desde su estado actual.';
  END IF;
  SELECT t.saldo INTO saldo FROM v_pedido_total t WHERE t.id_pedido = NEW.id_pedido;
  IF a = 2 AND NOT EXISTS (SELECT 1 FROM abono WHERE id_pedido = NEW.id_pedido AND NOT anulado) THEN
    RAISE EXCEPTION 'Registre el abono inicial para iniciar el pedido.';
  END IF;
  IF a IN (4, 5) AND saldo > 0.005 THEN RAISE EXCEPTION 'El pedido tiene saldo pendiente.'; END IF;
  IF a = 3 AND saldo <= 0.005 THEN RAISE EXCEPTION 'El pedido ya está pagado en su totalidad.'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_pedido_estado ON pedido;
CREATE TRIGGER trg_pedido_estado BEFORE UPDATE OF id_estado_pedido ON pedido
  FOR EACH ROW EXECUTE FUNCTION validar_estado_pedido();

-- ---------------------------------------------------------------------
-- 4. Inventario
--    Candado unico para verificar y descontar existencias: dos pedidos que
--    inician a la vez no pueden gastar las mismas unidades. Es un candado
--    global (suficiente para este volumen); si hiciera falta mas
--    concurrencia, pasar a un candado por insumo.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pedido_kardex() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  antes BOOLEAN := FALSE;
  ahora BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.id_estado_pedido = NEW.id_estado_pedido THEN RETURN NEW; END IF;
  SELECT consume_inventario INTO ahora FROM estado_pedido WHERE id_estado_pedido = NEW.id_estado_pedido;
  IF TG_OP = 'UPDATE' THEN
    SELECT consume_inventario INTO antes FROM estado_pedido WHERE id_estado_pedido = OLD.id_estado_pedido;
  END IF;
  IF antes AND NOT ahora THEN
    DELETE FROM movimiento_inventario WHERE id_pedido = NEW.id_pedido AND origen = 'PEDIDO';
  ELSIF ahora AND NOT antes THEN
    PERFORM pg_advisory_xact_lock(7001);
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
    PERFORM pg_advisory_xact_lock(7001);
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

COMMIT;
