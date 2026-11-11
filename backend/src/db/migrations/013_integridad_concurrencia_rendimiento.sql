-- =====================================================================
-- 013 · Integridad, concurrencia y rendimiento
--
-- 1. Indices en las llaves foraneas y en las consultas frecuentes.
-- 2. Huella (md5) de los adjuntos: permite listar pedidos y abonos sin
--    enviar la imagen en cada recarga (el frontend la pide una sola vez).
-- 3. Auditoria sin adjuntos: el historial guardaba dos copias de la imagen
--    (hasta 5 MB cada una) por cada cambio. Ahora guarda solo su huella. Las
--    filas ya registradas NO se tocan; /api/datos las resume al leerlas.
-- 4. Abonos: el pedido se bloquea mientras se valida el saldo, para que dos
--    abonos simultaneos no lo superen.
-- 5. Estado del pedido: el recorrido que ya aplicaba el frontend se valida
--    tambien en la base de datos.
-- 6. Inventario: un cambio de estado entre etapas que ya consumen no vuelve a
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
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha_cambio DESC);
CREATE INDEX IF NOT EXISTS idx_acceso_fecha ON acceso(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_usuario_correo ON usuario(lower(correo_empresarial));

-- ---------------------------------------------------------------------
-- 2. Huella de los adjuntos
-- ---------------------------------------------------------------------
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS diseno_md5 TEXT GENERATED ALWAYS AS (md5(ruta_imagen_diseno)) STORED;
ALTER TABLE abono ADD COLUMN IF NOT EXISTS comprobante_md5 TEXT GENERATED ALWAYS AS (md5(ruta_comprobante)) STORED;

-- ---------------------------------------------------------------------
-- 3. Auditoria sin adjuntos
--    El adjunto se reemplaza por 'data:<md5>': el frontend lo sigue leyendo
--    como «Archivo adjunto» y detecta cuando cambio.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sin_adjuntos(fila JSONB) RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT (fila - 'contrasena_hash' - 'diseno_md5' - 'comprobante_md5')
    || CASE WHEN length(fila ->> 'ruta_imagen_diseno') > 64
            THEN jsonb_build_object('ruta_imagen_diseno', 'data:' || COALESCE(fila ->> 'diseno_md5', md5(fila ->> 'ruta_imagen_diseno')))
            ELSE '{}'::jsonb END
    || CASE WHEN length(fila ->> 'ruta_comprobante') > 64
            THEN jsonb_build_object('ruta_comprobante', 'data:' || COALESCE(fila ->> 'comprobante_md5', md5(fila ->> 'ruta_comprobante')))
            ELSE '{}'::jsonb END
$$;

CREATE OR REPLACE FUNCTION auditar() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  pk TEXT := TG_ARGV[0];
  antes JSONB := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE sin_adjuntos(to_jsonb(OLD)) END;
  despues JSONB := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE sin_adjuntos(to_jsonb(NEW)) END;
BEGIN
  -- Un UPDATE que solo cambio la contrasena no se registra.
  IF TG_OP = 'UPDATE' AND antes = despues THEN RETURN NEW; END IF;
  INSERT INTO movimientos(tabla, id_registro, accion, valor_anterior, valor_nuevo, id_usuario)
  VALUES (TG_TABLE_NAME, (COALESCE(despues, antes) ->> pk)::INT, TG_OP, antes, despues, app_user_id());
  RETURN COALESCE(NEW, OLD);
END $$;

-- ---------------------------------------------------------------------
-- 4. Abonos: validacion del saldo en serie por pedido
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_abono() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v RECORD;
  saldo NUMERIC;
  previos INT;
BEGIN
  -- Otro abono del mismo pedido espera aqui hasta que este termine.
  PERFORM 1 FROM pedido WHERE id_pedido = NEW.id_pedido FOR UPDATE;
  SELECT t.total, t.saldo INTO v FROM v_pedido_total t WHERE t.id_pedido = NEW.id_pedido;
  saldo := v.saldo;
  IF TG_OP = 'UPDATE' AND OLD.id_pedido = NEW.id_pedido THEN saldo := saldo + OLD.monto; END IF;
  IF NEW.monto > saldo + 0.005 THEN RAISE EXCEPTION 'El abono excede el saldo pendiente del pedido.'; END IF;
  -- Abonos anteriores a este: al editar, solo los que se registraron antes.
  SELECT count(*) INTO previos FROM abono a
  WHERE a.id_pedido = NEW.id_pedido AND (TG_OP = 'INSERT' OR a.id_abono < NEW.id_abono);
  IF previos = 0 AND NEW.monto < v.total * 0.5 - 0.005 THEN
    RAISE EXCEPTION 'El primer abono debe ser de al menos el 50%% del total del pedido.';
  END IF;
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------
-- 5. Recorrido de estados del pedido (orden de estado_pedido):
--    1 cotizacion -> 2 en proceso (con abono inicial)
--    2 -> 3 falta pago (con saldo) · 2 -> 4 completado (sin saldo)
--    3 -> 4 al saldarse · 4 -> 3 si se elimina un abono
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
  IF a = 2 AND NOT EXISTS (SELECT 1 FROM abono WHERE id_pedido = NEW.id_pedido) THEN
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
-- 6. Inventario
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
