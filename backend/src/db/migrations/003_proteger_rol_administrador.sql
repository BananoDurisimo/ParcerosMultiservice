BEGIN;

-- Recuperacion: reactiva el rol Administrador si alguien lo inactivo.
UPDATE rol SET activo = TRUE WHERE nombre = 'Administrador' AND NOT activo;

-- El rol Administrador no se puede inactivar ni renombrar: sin el no queda
-- nadie que pueda entrar al sistema a corregirlo. El mensaje llega al
-- frontend como error 400 (codigo P0001).
CREATE OR REPLACE FUNCTION proteger_rol_administrador() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.nombre = 'Administrador' AND (NOT NEW.activo OR NEW.nombre <> OLD.nombre) THEN
    RAISE EXCEPTION 'El rol Administrador no se puede inactivar ni cambiar de nombre.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_rol_administrador ON rol;
CREATE TRIGGER trg_rol_administrador BEFORE UPDATE ON rol
  FOR EACH ROW EXECUTE FUNCTION proteger_rol_administrador();

COMMIT;
