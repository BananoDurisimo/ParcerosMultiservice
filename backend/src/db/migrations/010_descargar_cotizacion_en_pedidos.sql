-- =====================================================================
-- 010 · Descargar la cotizacion tambien desde Pedidos
--
-- Privilegio «Descargar cotización» en el modulo Pedidos (ya existia en
-- Cotizaciones), asignado al Administrador. Los demas roles lo reciben
-- desde el formulario de Roles.
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

INSERT INTO privilegio(id_permiso, nombre)
  SELECT id_permiso, 'Descargar cotización' FROM permiso WHERE nombre = 'Pedidos'
ON CONFLICT (id_permiso, nombre) DO NOTHING;

INSERT INTO rolxprivilegio(id_rol, id_privilegio)
  SELECT r.id_rol, pr.id_privilegio FROM rol r
  JOIN rolxpermiso rp ON rp.id_rol = r.id_rol
  JOIN privilegio pr ON pr.id_permiso = rp.id_permiso AND pr.nombre = 'Descargar cotización'
  WHERE r.nombre = 'Administrador'
ON CONFLICT DO NOTHING;

COMMIT;
