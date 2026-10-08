BEGIN;

CREATE TABLE permiso (id_permiso SERIAL PRIMARY KEY, nombre VARCHAR(40) NOT NULL UNIQUE);
CREATE TABLE privilegio (id_privilegio SERIAL PRIMARY KEY, id_permiso INT NOT NULL REFERENCES permiso, nombre VARCHAR(40) NOT NULL, UNIQUE(id_permiso,nombre));
CREATE TABLE rol (id_rol SERIAL PRIMARY KEY, nombre VARCHAR(40) NOT NULL UNIQUE, activo BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE rolxpermiso (id_rol INT REFERENCES rol ON DELETE CASCADE, id_permiso INT REFERENCES permiso ON DELETE CASCADE, PRIMARY KEY(id_rol,id_permiso));
CREATE TABLE rolxprivilegio (id_rol INT REFERENCES rol ON DELETE CASCADE, id_privilegio INT REFERENCES privilegio ON DELETE CASCADE, PRIMARY KEY(id_rol,id_privilegio));
CREATE TABLE usuario (id_usuario SERIAL PRIMARY KEY, id_rol INT NOT NULL REFERENCES rol, nombre_usuario VARCHAR(40) NOT NULL UNIQUE, contrasena_hash VARCHAR(100) NOT NULL, correo_empresarial VARCHAR(120) NOT NULL UNIQUE, nombre_empleado VARCHAR(120) NOT NULL, documento VARCHAR(30) UNIQUE, telefono VARCHAR(20), cargo VARCHAR(60), fecha_ingreso DATE, activo BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE recuperacion_clave (id_recuperacion SERIAL PRIMARY KEY, id_usuario INT NOT NULL REFERENCES usuario, token_hash VARCHAR(100) NOT NULL UNIQUE, vence TIMESTAMP NOT NULL, usado BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE acceso (id_acceso SERIAL PRIMARY KEY, id_usuario INT REFERENCES usuario, correo VARCHAR(120) NOT NULL, resultado VARCHAR(20) NOT NULL CHECK(resultado IN ('LOGIN','LOGIN_FALLIDO','LOGOUT')), fecha TIMESTAMP NOT NULL DEFAULT NOW());

CREATE TABLE tipo_insumo (id_tipo_insumo SERIAL PRIMARY KEY, nombre VARCHAR(40) NOT NULL UNIQUE);
CREATE TABLE unidad_medida (id_unidad_medida SERIAL PRIMARY KEY, nombre VARCHAR(30) NOT NULL UNIQUE, abreviatura VARCHAR(10) NOT NULL UNIQUE);
CREATE TABLE talla (id_talla SERIAL PRIMARY KEY, nombre VARCHAR(10) NOT NULL UNIQUE, orden SMALLINT NOT NULL);
CREATE TABLE estado_pedido (id_estado_pedido SERIAL PRIMARY KEY, nombre VARCHAR(60) NOT NULL UNIQUE, orden SMALLINT NOT NULL UNIQUE, consume_inventario BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE estado_compra (id_estado_compra SERIAL PRIMARY KEY, nombre VARCHAR(30) NOT NULL UNIQUE, ingresa_inventario BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE tipo_documento (id_tipo_documento SERIAL PRIMARY KEY, nombre VARCHAR(40) NOT NULL UNIQUE);
CREATE TABLE metodo_pago (id_metodo_pago SERIAL PRIMARY KEY, nombre VARCHAR(30) NOT NULL UNIQUE);

CREATE TABLE proveedor (id_proveedor SERIAL PRIMARY KEY, id_tipo_insumo INT NOT NULL REFERENCES tipo_insumo, nombre VARCHAR(120) NOT NULL, nombre_persona_contacto VARCHAR(120), nit VARCHAR(30) NOT NULL UNIQUE, telefono VARCHAR(20), correo VARCHAR(120), direccion VARCHAR(200), activo BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE insumo (id_insumo SERIAL PRIMARY KEY, id_tipo_insumo INT NOT NULL REFERENCES tipo_insumo, id_unidad_medida INT NOT NULL REFERENCES unidad_medida, nombre VARCHAR(80) NOT NULL UNIQUE, stock_minimo NUMERIC(10,2) NOT NULL DEFAULT 20 CHECK(stock_minimo >= 0), precio_unitario NUMERIC(10,2) NOT NULL CHECK(precio_unitario >= 0), activo BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE compra (id_compra SERIAL PRIMARY KEY, id_proveedor INT NOT NULL REFERENCES proveedor, id_estado_compra INT NOT NULL REFERENCES estado_compra, fecha DATE NOT NULL DEFAULT CURRENT_DATE, fecha_entrega DATE);
CREATE TABLE detalle_compra_insumo (id_compra INT REFERENCES compra ON DELETE CASCADE, id_insumo INT REFERENCES insumo, cantidad NUMERIC(10,2) NOT NULL CHECK(cantidad>0), precio_unitario NUMERIC(10,2) NOT NULL CHECK(precio_unitario>=0), PRIMARY KEY(id_compra,id_insumo));

CREATE TABLE cliente (id_cliente SERIAL PRIMARY KEY, id_tipo_documento INT NOT NULL REFERENCES tipo_documento, nombre VARCHAR(120) NOT NULL, documento VARCHAR(30) NOT NULL UNIQUE, telefono VARCHAR(20), correo VARCHAR(120) NOT NULL UNIQUE, direccion VARCHAR(200), activo BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE pedido (id_pedido SERIAL PRIMARY KEY, id_cliente INT NOT NULL REFERENCES cliente, id_estado_pedido INT NOT NULL REFERENCES estado_pedido, id_vendedor INT REFERENCES usuario, fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE, fecha_inicio DATE, fecha_entrega DATE, descripcion TEXT, ruta_imagen_diseno VARCHAR(255));
CREATE TABLE detalle_pedido_insumo (id_pedido INT REFERENCES pedido ON DELETE CASCADE, id_insumo INT REFERENCES insumo, cantidad NUMERIC(10,2) NOT NULL CHECK(cantidad>0), precio_unitario NUMERIC(10,2) NOT NULL CHECK(precio_unitario>=0), PRIMARY KEY(id_pedido,id_insumo));
CREATE TABLE detalle_pedido_talla (id_pedido INT REFERENCES pedido ON DELETE CASCADE, id_talla INT REFERENCES talla, cantidad INT NOT NULL CHECK(cantidad>0), PRIMARY KEY(id_pedido,id_talla));
CREATE TABLE historial_estado_pedido (id_historial SERIAL PRIMARY KEY, id_pedido INT NOT NULL REFERENCES pedido ON DELETE CASCADE, id_estado_pedido INT NOT NULL REFERENCES estado_pedido, fecha TIMESTAMP NOT NULL DEFAULT NOW(), id_usuario INT REFERENCES usuario);
CREATE TABLE abono (id_abono SERIAL PRIMARY KEY, id_pedido INT NOT NULL REFERENCES pedido, id_metodo_pago INT NOT NULL REFERENCES metodo_pago, monto NUMERIC(10,2) NOT NULL CHECK(monto>0), fecha DATE NOT NULL DEFAULT CURRENT_DATE, ruta_comprobante VARCHAR(255));
CREATE TABLE movimiento_inventario (id_movimiento_inventario SERIAL PRIMARY KEY, id_insumo INT NOT NULL REFERENCES insumo, cantidad NUMERIC(10,2) NOT NULL CHECK(cantidad<>0), origen VARCHAR(10) NOT NULL CHECK(origen IN ('COMPRA','PEDIDO','AJUSTE')), id_compra INT REFERENCES compra, id_pedido INT REFERENCES pedido, fecha TIMESTAMP NOT NULL DEFAULT NOW(), id_usuario INT REFERENCES usuario, CHECK((id_compra IS NOT NULL)::int + (id_pedido IS NOT NULL)::int <= 1));
CREATE TABLE movimientos (id_movimiento SERIAL PRIMARY KEY, tabla VARCHAR(40) NOT NULL, id_registro INT NOT NULL, accion VARCHAR(10) NOT NULL, valor_anterior JSONB, valor_nuevo JSONB, id_usuario INT REFERENCES usuario, fecha_cambio TIMESTAMP NOT NULL DEFAULT NOW());

CREATE OR REPLACE VIEW v_insumo_stock AS SELECT i.id_insumo, COALESCE(SUM(mi.cantidad),0)::NUMERIC(10,2) AS stock FROM insumo i LEFT JOIN movimiento_inventario mi ON mi.id_insumo=i.id_insumo GROUP BY i.id_insumo;
CREATE OR REPLACE VIEW v_compra_total AS SELECT c.id_compra, COALESCE(SUM(d.cantidad*d.precio_unitario),0)::NUMERIC(12,2) AS total FROM compra c LEFT JOIN detalle_compra_insumo d ON d.id_compra=c.id_compra GROUP BY c.id_compra;
CREATE OR REPLACE VIEW v_pedido_total AS SELECT p.id_pedido, COALESCE(SUM(d.cantidad*d.precio_unitario),0)::NUMERIC(12,2) AS total, COALESCE((SELECT SUM(a.monto) FROM abono a WHERE a.id_pedido=p.id_pedido),0)::NUMERIC(12,2) AS abonado, (COALESCE(SUM(d.cantidad*d.precio_unitario),0)-COALESCE((SELECT SUM(a.monto) FROM abono a WHERE a.id_pedido=p.id_pedido),0))::NUMERIC(12,2) AS saldo FROM pedido p LEFT JOIN detalle_pedido_insumo d ON d.id_pedido=p.id_pedido GROUP BY p.id_pedido;

CREATE OR REPLACE FUNCTION app_user_id() RETURNS INT LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.user_id', true),'')::INT $$;
CREATE OR REPLACE FUNCTION auditar() RETURNS TRIGGER LANGUAGE plpgsql AS $$ DECLARE fila JSONB; registro INT; BEGIN
  fila := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  registro := COALESCE((fila->>'id_usuario')::INT,(fila->>'id_rol')::INT,(fila->>'id_cliente')::INT,(fila->>'id_proveedor')::INT,(fila->>'id_insumo')::INT,(fila->>'id_compra')::INT,(fila->>'id_pedido')::INT,(fila->>'id_abono')::INT);
  INSERT INTO movimientos(tabla,id_registro,accion,valor_anterior,valor_nuevo,id_usuario) VALUES (TG_TABLE_NAME,registro,TG_OP,CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END,app_user_id()); RETURN COALESCE(NEW,OLD); END $$;
CREATE OR REPLACE FUNCTION validar_abono() RETURNS TRIGGER LANGUAGE plpgsql AS $$ DECLARE saldo NUMERIC; BEGIN SELECT v.saldo INTO saldo FROM v_pedido_total v WHERE v.id_pedido=NEW.id_pedido; IF NEW.monto > saldo THEN RAISE EXCEPTION 'El abono excede el saldo pendiente'; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION compra_kardex() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
  IF TG_OP='UPDATE' AND OLD.id_estado_compra=NEW.id_estado_compra THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN DELETE FROM movimiento_inventario WHERE id_compra=NEW.id_compra AND origen='COMPRA'; END IF;
  IF (SELECT ingresa_inventario FROM estado_compra WHERE id_estado_compra=NEW.id_estado_compra) THEN INSERT INTO movimiento_inventario(id_insumo,cantidad,origen,id_compra,id_usuario) SELECT id_insumo,cantidad,'COMPRA',NEW.id_compra,app_user_id() FROM detalle_compra_insumo WHERE id_compra=NEW.id_compra; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION pedido_kardex() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
  IF TG_OP='UPDATE' AND OLD.id_estado_pedido=NEW.id_estado_pedido THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN DELETE FROM movimiento_inventario WHERE id_pedido=NEW.id_pedido AND origen='PEDIDO'; END IF;
  IF (SELECT consume_inventario FROM estado_pedido WHERE id_estado_pedido=NEW.id_estado_pedido) THEN IF EXISTS(SELECT 1 FROM detalle_pedido_insumo d JOIN v_insumo_stock s ON s.id_insumo=d.id_insumo WHERE d.id_pedido=NEW.id_pedido AND s.stock<d.cantidad) THEN RAISE EXCEPTION 'Inventario insuficiente para iniciar el pedido'; END IF; INSERT INTO movimiento_inventario(id_insumo,cantidad,origen,id_pedido,id_usuario) SELECT id_insumo,-cantidad,'PEDIDO',NEW.id_pedido,app_user_id() FROM detalle_pedido_insumo WHERE id_pedido=NEW.id_pedido; END IF; INSERT INTO historial_estado_pedido(id_pedido,id_estado_pedido,id_usuario) VALUES(NEW.id_pedido,NEW.id_estado_pedido,app_user_id()); RETURN NEW; END $$;
CREATE TRIGGER trg_abono_saldo BEFORE INSERT ON abono FOR EACH ROW EXECUTE FUNCTION validar_abono();
CREATE OR REPLACE FUNCTION recompra_kardex() RETURNS TRIGGER LANGUAGE plpgsql AS $$ DECLARE compra_id INT; BEGIN
  compra_id := COALESCE(NEW.id_compra,OLD.id_compra);
  IF (SELECT ingresa_inventario FROM compra c JOIN estado_compra e ON e.id_estado_compra=c.id_estado_compra WHERE c.id_compra=compra_id) THEN
    DELETE FROM movimiento_inventario WHERE id_compra=compra_id AND origen='COMPRA';
    INSERT INTO movimiento_inventario(id_insumo,cantidad,origen,id_compra,id_usuario) SELECT id_insumo,cantidad,'COMPRA',compra_id,app_user_id() FROM detalle_compra_insumo WHERE id_compra=compra_id;
  END IF; RETURN COALESCE(NEW,OLD); END $$;
CREATE OR REPLACE FUNCTION repedido_kardex() RETURNS TRIGGER LANGUAGE plpgsql AS $$ DECLARE pedido_id INT; BEGIN
  pedido_id := COALESCE(NEW.id_pedido,OLD.id_pedido);
  IF (SELECT consume_inventario FROM pedido p JOIN estado_pedido e ON e.id_estado_pedido=p.id_estado_pedido WHERE p.id_pedido=pedido_id) THEN
    IF EXISTS(SELECT 1 FROM detalle_pedido_insumo d JOIN v_insumo_stock s ON s.id_insumo=d.id_insumo WHERE d.id_pedido=pedido_id AND s.stock + COALESCE((SELECT SUM(-mi.cantidad) FROM movimiento_inventario mi WHERE mi.id_pedido=pedido_id AND mi.id_insumo=d.id_insumo),0)<d.cantidad) THEN RAISE EXCEPTION 'Inventario insuficiente para el pedido'; END IF;
    DELETE FROM movimiento_inventario WHERE id_pedido=pedido_id AND origen='PEDIDO';
    INSERT INTO movimiento_inventario(id_insumo,cantidad,origen,id_pedido,id_usuario) SELECT id_insumo,-cantidad,'PEDIDO',pedido_id,app_user_id() FROM detalle_pedido_insumo WHERE id_pedido=pedido_id;
  END IF; RETURN COALESCE(NEW,OLD); END $$;
CREATE TRIGGER trg_compra_kardex AFTER INSERT OR UPDATE OF id_estado_compra ON compra FOR EACH ROW EXECUTE FUNCTION compra_kardex();
CREATE TRIGGER trg_pedido_kardex AFTER INSERT OR UPDATE OF id_estado_pedido ON pedido FOR EACH ROW EXECUTE FUNCTION pedido_kardex();
CREATE TRIGGER trg_detalle_compra_kardex AFTER INSERT OR UPDATE OR DELETE ON detalle_compra_insumo FOR EACH ROW EXECUTE FUNCTION recompra_kardex();
CREATE TRIGGER trg_detalle_pedido_kardex AFTER INSERT OR UPDATE OR DELETE ON detalle_pedido_insumo FOR EACH ROW EXECUTE FUNCTION repedido_kardex();
CREATE TRIGGER trg_audit_cliente AFTER INSERT OR UPDATE OR DELETE ON cliente FOR EACH ROW EXECUTE FUNCTION auditar();
CREATE TRIGGER trg_audit_proveedor AFTER INSERT OR UPDATE OR DELETE ON proveedor FOR EACH ROW EXECUTE FUNCTION auditar();
CREATE TRIGGER trg_audit_insumo AFTER INSERT OR UPDATE OR DELETE ON insumo FOR EACH ROW EXECUTE FUNCTION auditar();
CREATE TRIGGER trg_audit_compra AFTER INSERT OR UPDATE OR DELETE ON compra FOR EACH ROW EXECUTE FUNCTION auditar();
CREATE TRIGGER trg_audit_pedido AFTER INSERT OR UPDATE OR DELETE ON pedido FOR EACH ROW EXECUTE FUNCTION auditar();
CREATE TRIGGER trg_audit_abono AFTER INSERT OR UPDATE OR DELETE ON abono FOR EACH ROW EXECUTE FUNCTION auditar();
CREATE TRIGGER trg_audit_usuario AFTER INSERT OR UPDATE OR DELETE ON usuario FOR EACH ROW EXECUTE FUNCTION auditar();
CREATE TRIGGER trg_audit_rol AFTER INSERT OR UPDATE OR DELETE ON rol FOR EACH ROW EXECUTE FUNCTION auditar();
COMMIT;
