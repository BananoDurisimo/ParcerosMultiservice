BEGIN;

-- Modulo Reportes (ingresos recibidos): consultar el detalle de un movimiento
-- y exportar el reporte. Los valores coinciden con el frontend
-- (src/shared/data/mock.js · EXPORTAR / VER_DETALLE).
INSERT INTO permiso(nombre) VALUES ('Reportes') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO privilegio(id_permiso, nombre)
  SELECT p.id_permiso, a.accion FROM permiso p CROSS JOIN (VALUES ('Ver detalle'), ('Exportar')) AS a(accion)
  WHERE p.nombre = 'Reportes'
ON CONFLICT (id_permiso, nombre) DO NOTHING;

-- El Administrador conserva el acceso completo (primero el modulo, luego sus acciones).
INSERT INTO rolxpermiso(id_rol, id_permiso)
  SELECT r.id_rol, p.id_permiso FROM rol r CROSS JOIN permiso p WHERE r.nombre = 'Administrador' AND p.nombre = 'Reportes'
ON CONFLICT DO NOTHING;
INSERT INTO rolxprivilegio(id_rol, id_privilegio)
  SELECT r.id_rol, pr.id_privilegio FROM rol r
  JOIN permiso p ON p.nombre = 'Reportes' JOIN privilegio pr ON pr.id_permiso = p.id_permiso
  WHERE r.nombre = 'Administrador'
ON CONFLICT DO NOTHING;

COMMIT;
