-- =====================================================================
-- 002 · Ajustes para conectar el frontend
--
-- 1. Auditoria: id del registro correcto y sin la contrasena.
-- 2. Archivos adjuntos como TEXT (diseño y comprobante).
-- 3. Catalogos alineados con los valores que usa el frontend.
-- 4. Permisos y privilegios alineados con los modulos del frontend.
-- 5. Regla: un privilegio solo si el rol tiene activo su modulo.
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- 1. Auditoria
--    La version anterior tomaba el primer id_* que encontraba en la fila:
--    en un pedido devolvia id_cliente, en una compra id_proveedor y en un
--    abono id_pedido. Ahora cada trigger indica su llave primaria.
--    La contrasena (hash) nunca se copia al historial.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auditar() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  pk TEXT := TG_ARGV[0];
  antes JSONB := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) - 'contrasena_hash' END;
  despues JSONB := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) - 'contrasena_hash' END;
BEGIN
  -- Un UPDATE que solo cambio la contrasena no se registra.
  IF TG_OP = 'UPDATE' AND antes = despues THEN RETURN NEW; END IF;
  INSERT INTO movimientos(tabla, id_registro, accion, valor_anterior, valor_nuevo, id_usuario)
  VALUES (TG_TABLE_NAME, (COALESCE(despues, antes) ->> pk)::INT, TG_OP, antes, despues, app_user_id());
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_audit_cliente ON cliente;
DROP TRIGGER IF EXISTS trg_audit_proveedor ON proveedor;
DROP TRIGGER IF EXISTS trg_audit_insumo ON insumo;
DROP TRIGGER IF EXISTS trg_audit_compra ON compra;
DROP TRIGGER IF EXISTS trg_audit_pedido ON pedido;
DROP TRIGGER IF EXISTS trg_audit_abono ON abono;
DROP TRIGGER IF EXISTS trg_audit_usuario ON usuario;
DROP TRIGGER IF EXISTS trg_audit_rol ON rol;
CREATE TRIGGER trg_audit_cliente AFTER INSERT OR UPDATE OR DELETE ON cliente FOR EACH ROW EXECUTE FUNCTION auditar('id_cliente');
CREATE TRIGGER trg_audit_proveedor AFTER INSERT OR UPDATE OR DELETE ON proveedor FOR EACH ROW EXECUTE FUNCTION auditar('id_proveedor');
CREATE TRIGGER trg_audit_insumo AFTER INSERT OR UPDATE OR DELETE ON insumo FOR EACH ROW EXECUTE FUNCTION auditar('id_insumo');
CREATE TRIGGER trg_audit_compra AFTER INSERT OR UPDATE OR DELETE ON compra FOR EACH ROW EXECUTE FUNCTION auditar('id_compra');
CREATE TRIGGER trg_audit_pedido AFTER INSERT OR UPDATE OR DELETE ON pedido FOR EACH ROW EXECUTE FUNCTION auditar('id_pedido');
CREATE TRIGGER trg_audit_abono AFTER INSERT OR UPDATE OR DELETE ON abono FOR EACH ROW EXECUTE FUNCTION auditar('id_abono');
CREATE TRIGGER trg_audit_usuario AFTER INSERT OR UPDATE OR DELETE ON usuario FOR EACH ROW EXECUTE FUNCTION auditar('id_usuario');
CREATE TRIGGER trg_audit_rol AFTER INSERT OR UPDATE OR DELETE ON rol FOR EACH ROW EXECUTE FUNCTION auditar('id_rol');

-- Historial anterior sin el hash de la contrasena.
UPDATE movimientos SET valor_anterior = valor_anterior - 'contrasena_hash', valor_nuevo = valor_nuevo - 'contrasena_hash'
WHERE tabla = 'usuario';

-- El saldo admite editar un abono existente: se descuenta el propio monto.
CREATE OR REPLACE FUNCTION validar_abono() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE saldo NUMERIC;
BEGIN
  SELECT v.saldo INTO saldo FROM v_pedido_total v WHERE v.id_pedido = NEW.id_pedido;
  IF TG_OP = 'UPDATE' AND OLD.id_pedido = NEW.id_pedido THEN saldo := saldo + OLD.monto; END IF;
  IF NEW.monto > saldo + 0.005 THEN RAISE EXCEPTION 'El abono excede el saldo pendiente del pedido.'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_abono_saldo ON abono;
CREATE TRIGGER trg_abono_saldo BEFORE INSERT OR UPDATE OF monto, id_pedido ON abono FOR EACH ROW EXECUTE FUNCTION validar_abono();

-- ---------------------------------------------------------------------
-- 2. Archivos adjuntos
--    Mientras no haya un servicio de archivos, el frontend envia la imagen
--    como data URL, que no cabe en VARCHAR(255).
-- ---------------------------------------------------------------------
ALTER TABLE pedido ALTER COLUMN ruta_imagen_diseno TYPE TEXT;
ALTER TABLE abono ALTER COLUMN ruta_comprobante TYPE TEXT;

-- ---------------------------------------------------------------------
-- 3. Catalogos con los mismos valores del frontend
-- ---------------------------------------------------------------------
INSERT INTO estado_pedido(nombre, orden, consume_inventario) VALUES
  ('Cotización aprobada por el cliente', 1, FALSE),
  ('Pedido en proceso', 2, TRUE),
  ('Pedido completado - falta pago', 3, TRUE),
  ('Pedido completado', 4, TRUE),
  ('Pedido entregado / vendido', 5, TRUE)
ON CONFLICT (orden) DO UPDATE SET nombre = EXCLUDED.nombre, consume_inventario = EXCLUDED.consume_inventario;

INSERT INTO estado_compra(nombre, ingresa_inventario) VALUES
  ('Recibida', TRUE), ('En tránsito', FALSE), ('Anulada', FALSE)
ON CONFLICT (nombre) DO UPDATE SET ingresa_inventario = EXCLUDED.ingresa_inventario;

INSERT INTO tipo_documento(nombre) VALUES ('Cédula'), ('RUC'), ('Pasaporte'), ('Cédula de residencia')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO metodo_pago(nombre) VALUES ('Efectivo'), ('Transferencia'), ('Tarjeta'), ('Cheque')
ON CONFLICT (nombre) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Permisos (modulos) y privilegios (acciones) del frontend
--    (src/shared/data/mock.js · ACCIONES_MODULO)
-- ---------------------------------------------------------------------
CREATE TEMP TABLE acceso_frontend(modulo VARCHAR(40), accion VARCHAR(40)) ON COMMIT DROP;
INSERT INTO acceso_frontend(modulo, accion) VALUES
  ('Roles','Agregar'),('Roles','Editar'),('Roles','Ver detalle'),('Roles','Cambiar estado'),('Roles','Eliminar'),
  ('Usuarios','Agregar'),('Usuarios','Editar'),('Usuarios','Ver detalle'),('Usuarios','Cambiar estado'),('Usuarios','Eliminar'),
  ('Movimientos','Ver detalle'),
  ('Insumos','Agregar'),('Insumos','Editar'),('Insumos','Ver detalle'),('Insumos','Cambiar estado'),('Insumos','Eliminar'),
  ('Proveedores','Agregar'),('Proveedores','Editar'),('Proveedores','Ver detalle'),('Proveedores','Cambiar estado'),('Proveedores','Eliminar'),
  ('Compras','Agregar'),('Compras','Editar'),('Compras','Ver detalle'),('Compras','Cambiar estado'),('Compras','Anular'),('Compras','Eliminar'),
  ('Clientes','Agregar'),('Clientes','Editar'),('Clientes','Ver detalle'),('Clientes','Cambiar estado'),('Clientes','Eliminar'),
  ('Cotizaciones','Agregar'),('Cotizaciones','Editar'),('Cotizaciones','Ver detalle'),('Cotizaciones','Cambiar estado'),('Cotizaciones','Eliminar'),('Cotizaciones','Ver diseño'),('Cotizaciones','Descargar diseño'),
  ('Pedidos','Agregar'),('Pedidos','Editar'),('Pedidos','Ver detalle'),('Pedidos','Cambiar estado'),('Pedidos','Eliminar'),('Pedidos','Ver diseño'),('Pedidos','Descargar diseño'),
  ('Ventas','Ver detalle'),('Ventas','Cambiar estado'),('Ventas','Eliminar'),('Ventas','Ver diseño'),('Ventas','Descargar diseño'),('Ventas','Ver comprobante'),('Ventas','Descargar comprobante'),
  ('Abonos','Agregar'),('Abonos','Editar'),('Abonos','Ver detalle'),('Abonos','Eliminar'),('Abonos','Ver comprobante'),('Abonos','Descargar comprobante');

INSERT INTO permiso(nombre) SELECT DISTINCT modulo FROM acceso_frontend ON CONFLICT (nombre) DO NOTHING;
INSERT INTO privilegio(id_permiso, nombre)
  SELECT p.id_permiso, a.accion FROM acceso_frontend a JOIN permiso p ON p.nombre = a.modulo
ON CONFLICT (id_permiso, nombre) DO NOTHING;

-- Acciones que el frontend no ofrece (p. ej. "Agregar" en Movimientos).
DELETE FROM privilegio pr USING permiso p
WHERE p.id_permiso = pr.id_permiso
  AND NOT EXISTS (SELECT 1 FROM acceso_frontend a WHERE a.modulo = p.nombre AND a.accion = pr.nombre);

-- El Administrador conserva el acceso completo.
INSERT INTO rolxpermiso(id_rol, id_permiso)
  SELECT r.id_rol, p.id_permiso FROM rol r CROSS JOIN permiso p WHERE r.nombre = 'Administrador'
ON CONFLICT DO NOTHING;
INSERT INTO rolxprivilegio(id_rol, id_privilegio)
  SELECT r.id_rol, pr.id_privilegio FROM rol r CROSS JOIN privilegio pr WHERE r.nombre = 'Administrador'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. Un privilegio exige el modulo activo; quitar el modulo quita sus
--    privilegios (la misma regla del formulario de roles).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_privilegio_rol() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM rolxpermiso rp JOIN privilegio pr ON pr.id_permiso = rp.id_permiso
    WHERE rp.id_rol = NEW.id_rol AND pr.id_privilegio = NEW.id_privilegio
  ) THEN
    RAISE EXCEPTION 'El rol no tiene activo el módulo de este privilegio.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_rolxprivilegio_modulo ON rolxprivilegio;
CREATE TRIGGER trg_rolxprivilegio_modulo BEFORE INSERT OR UPDATE ON rolxprivilegio
  FOR EACH ROW EXECUTE FUNCTION validar_privilegio_rol();

CREATE OR REPLACE FUNCTION quitar_privilegios_modulo() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM rolxprivilegio rx USING privilegio pr
  WHERE rx.id_privilegio = pr.id_privilegio AND rx.id_rol = OLD.id_rol AND pr.id_permiso = OLD.id_permiso;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_rolxpermiso_quitar ON rolxpermiso;
CREATE TRIGGER trg_rolxpermiso_quitar AFTER DELETE ON rolxpermiso
  FOR EACH ROW EXECUTE FUNCTION quitar_privilegios_modulo();

COMMIT;
