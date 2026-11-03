-- =====================================================================
-- 011 · Abonos libres, prendas defectuosas y categorias de insumo
--
-- 1. Metodo de pago «Mixto».
-- 2. Abonos: el monto es libre y no hay limite de abonos por pedido. El
--    primero debe ser de al menos el 50% del total; ninguno puede pasar el
--    saldo (esto ya lo validaba la 002).
-- 3. Prendas defectuosas: cada producto del pedido guarda cuantas salieron
--    mal. Su receta se descuenta del inventario (el frontend la suma a la
--    copia de la receta del pedido); el precio no cambia.
-- 4. Categorias de insumo: la tabla tipo_insumo pasa a administrarse desde
--    su propio modulo (descripcion, estado, auditoria y permisos).
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

-- 1. Metodo de pago
INSERT INTO metodo_pago(nombre) VALUES ('Mixto') ON CONFLICT (nombre) DO NOTHING;

-- 2. Primer abono de al menos el 50% del total, y nunca mas que el saldo.
CREATE OR REPLACE FUNCTION validar_abono() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v RECORD;
  saldo NUMERIC;
  previos INT;
BEGIN
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

-- 3. Prendas defectuosas por producto del pedido
ALTER TABLE detalle_pedido_producto ADD COLUMN IF NOT EXISTS defectuosas INT NOT NULL DEFAULT 0;
ALTER TABLE detalle_pedido_producto DROP CONSTRAINT IF EXISTS detalle_pedido_producto_defectuosas_check;
ALTER TABLE detalle_pedido_producto ADD CONSTRAINT detalle_pedido_producto_defectuosas_check CHECK (defectuosas >= 0);

-- 4. Categorias de insumo
ALTER TABLE tipo_insumo ADD COLUMN IF NOT EXISTS descripcion VARCHAR(200);
ALTER TABLE tipo_insumo ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
DROP TRIGGER IF EXISTS trg_audit_tipo_insumo ON tipo_insumo;
CREATE TRIGGER trg_audit_tipo_insumo AFTER INSERT OR UPDATE OR DELETE ON tipo_insumo
  FOR EACH ROW EXECUTE FUNCTION auditar('id_tipo_insumo');

INSERT INTO permiso(nombre) VALUES ('Categorías de insumo') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO privilegio(id_permiso, nombre)
  SELECT p.id_permiso, a.accion FROM permiso p
  CROSS JOIN (VALUES ('Agregar'), ('Editar'), ('Ver detalle'), ('Cambiar estado'), ('Eliminar')) AS a(accion)
  WHERE p.nombre = 'Categorías de insumo'
ON CONFLICT (id_permiso, nombre) DO NOTHING;

-- El Administrador conserva el acceso completo (primero el modulo, luego sus acciones).
INSERT INTO rolxpermiso(id_rol, id_permiso)
  SELECT r.id_rol, p.id_permiso FROM rol r CROSS JOIN permiso p WHERE r.nombre = 'Administrador'
ON CONFLICT DO NOTHING;
INSERT INTO rolxprivilegio(id_rol, id_privilegio)
  SELECT r.id_rol, pr.id_privilegio FROM rol r CROSS JOIN privilegio pr WHERE r.nombre = 'Administrador'
ON CONFLICT DO NOTHING;

COMMIT;
