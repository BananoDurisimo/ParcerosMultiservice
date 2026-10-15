-- =====================================================================
-- 009 · El usuario admin siempre tiene el rol Administrador
--
-- 1. Recuperacion: admin@parceros.ni vuelve al rol Administrador (se le
--    habia asignado otro rol y solo veia los modulos de ese rol).
-- 2. Bloqueo: al usuario admin no se le puede cambiar el rol ni el correo
--    (con otro correo dejaria de estar protegido), ni inactivarlo ni
--    eliminarlo (esto ultimo ya lo impedia la 004). Sus demas datos -nombre,
--    telefono, documento- y su contraseña si se pueden actualizar.
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

UPDATE usuario SET id_rol = (SELECT id_rol FROM rol WHERE nombre = 'Administrador'), activo = TRUE
WHERE correo_empresarial = 'admin@parceros.ni'
  AND (id_rol IS DISTINCT FROM (SELECT id_rol FROM rol WHERE nombre = 'Administrador') OR NOT activo);

CREATE OR REPLACE FUNCTION proteger_usuario_admin() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.correo_empresarial = 'admin@parceros.ni' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'El usuario admin no se puede eliminar.';
    ELSIF NOT NEW.activo THEN
      RAISE EXCEPTION 'El usuario admin no se puede inactivar.';
    ELSIF NEW.id_rol IS DISTINCT FROM (SELECT id_rol FROM rol WHERE nombre = 'Administrador') THEN
      RAISE EXCEPTION 'El usuario admin siempre tiene el rol Administrador: no se le puede cambiar.';
    ELSIF NEW.correo_empresarial IS DISTINCT FROM OLD.correo_empresarial THEN
      RAISE EXCEPTION 'El correo del usuario admin no se puede cambiar.';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

COMMIT;
