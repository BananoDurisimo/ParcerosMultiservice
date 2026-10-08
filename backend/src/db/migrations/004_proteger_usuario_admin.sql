BEGIN;

-- Recuperacion: reactiva el usuario admin si alguien lo inactivo.
UPDATE usuario SET activo = TRUE WHERE correo_empresarial = 'admin@parceros.ni' AND NOT activo;

-- El usuario admin inicial no se puede inactivar ni eliminar: es la cuenta de
-- respaldo para volver a entrar al sistema. El mensaje llega al frontend como
-- error 400 (codigo P0001).
CREATE OR REPLACE FUNCTION proteger_usuario_admin() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.correo_empresarial = 'admin@parceros.ni' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'El usuario admin no se puede eliminar.';
    ELSIF NOT NEW.activo THEN
      RAISE EXCEPTION 'El usuario admin no se puede inactivar.';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS trg_usuario_admin_update ON usuario;
CREATE TRIGGER trg_usuario_admin_update BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION proteger_usuario_admin();
DROP TRIGGER IF EXISTS trg_usuario_admin_delete ON usuario;
CREATE TRIGGER trg_usuario_admin_delete BEFORE DELETE ON usuario
  FOR EACH ROW EXECUTE FUNCTION proteger_usuario_admin();

COMMIT;
