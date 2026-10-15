-- =====================================================================
-- 008 · Rol Administrador completo y bloqueado
--
-- 1. Recuperacion: el Administrador vuelve a tener TODOS los modulos y TODAS
--    sus acciones, y queda activo.
-- 2. Bloqueo: el rol Administrador no se puede editar, cambiar de estado,
--    eliminar ni perder permisos o privilegios. Los mensajes llegan al
--    frontend como error 400 (codigo P0001).
--    Si un modulo o una accion se retira del sistema (una migracion borra el
--    permiso o el privilegio), su asignacion se borra igual: ya no existe.
-- Los modulos nuevos que agreguen migraciones futuras se le siguen sumando.
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

-- 1. Recuperacion (primero el modulo y luego sus acciones: lo exige la
--    regla de la 002).
UPDATE rol SET activo = TRUE WHERE nombre = 'Administrador' AND NOT activo;
INSERT INTO rolxpermiso(id_rol, id_permiso)
  SELECT r.id_rol, p.id_permiso FROM rol r CROSS JOIN permiso p WHERE r.nombre = 'Administrador'
ON CONFLICT DO NOTHING;
INSERT INTO rolxprivilegio(id_rol, id_privilegio)
  SELECT r.id_rol, pr.id_privilegio FROM rol r CROSS JOIN privilegio pr WHERE r.nombre = 'Administrador'
ON CONFLICT DO NOTHING;

-- 2a. La fila del rol: ningun cambio (nombre, estado) ni eliminacion.
--     Un UPDATE que deja todo igual no molesta a nadie y se deja pasar.
CREATE OR REPLACE FUNCTION proteger_rol_administrador() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.nombre = 'Administrador' AND (TG_OP = 'DELETE' OR NEW IS DISTINCT FROM OLD) THEN
    RAISE EXCEPTION 'El rol Administrador está protegido: no se puede modificar ni eliminar.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS trg_rol_administrador ON rol;
CREATE TRIGGER trg_rol_administrador BEFORE UPDATE OR DELETE ON rol
  FOR EACH ROW EXECUTE FUNCTION proteger_rol_administrador();

-- 2b. Sus permisos y privilegios: no se pueden quitar. Si el modulo o la
--     accion se retira del sistema, el padre ya no existe y se permite.
CREATE OR REPLACE FUNCTION proteger_permisos_administrador() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM rol WHERE id_rol = OLD.id_rol AND nombre = 'Administrador')
     AND EXISTS (SELECT 1 FROM permiso WHERE id_permiso = OLD.id_permiso) THEN
    RAISE EXCEPTION 'El rol Administrador está protegido: sus permisos y privilegios no se pueden quitar.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE OR REPLACE FUNCTION proteger_privilegios_administrador() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM rol WHERE id_rol = OLD.id_rol AND nombre = 'Administrador')
     AND EXISTS (SELECT 1 FROM privilegio WHERE id_privilegio = OLD.id_privilegio) THEN
    RAISE EXCEPTION 'El rol Administrador está protegido: sus permisos y privilegios no se pueden quitar.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS trg_rolxpermiso_administrador ON rolxpermiso;
CREATE TRIGGER trg_rolxpermiso_administrador BEFORE UPDATE OR DELETE ON rolxpermiso
  FOR EACH ROW EXECUTE FUNCTION proteger_permisos_administrador();
DROP TRIGGER IF EXISTS trg_rolxprivilegio_administrador ON rolxprivilegio;
CREATE TRIGGER trg_rolxprivilegio_administrador BEFORE UPDATE OR DELETE ON rolxprivilegio
  FOR EACH ROW EXECUTE FUNCTION proteger_privilegios_administrador();

COMMIT;
