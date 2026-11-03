-- =====================================================================
-- 007 · Documento del usuario y descarga de la cotizacion
--
-- 1. El usuario guarda el tipo de documento (Cédula, RUC…), como el cliente.
-- 2. El nombre de usuario deja de pedirse: se inicia sesion con el correo.
--    La columna se conserva (opcional) para no perder los datos existentes.
-- 3. Privilegio «Descargar cotización» en el modulo Cotizaciones: el PDF que
--    se entrega al cliente.
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

ALTER TABLE usuario ADD COLUMN IF NOT EXISTS id_tipo_documento INT REFERENCES tipo_documento;
ALTER TABLE usuario ALTER COLUMN nombre_usuario DROP NOT NULL;

INSERT INTO privilegio(id_permiso, nombre)
  SELECT id_permiso, 'Descargar cotización' FROM permiso WHERE nombre = 'Cotizaciones'
ON CONFLICT (id_permiso, nombre) DO NOTHING;

-- El Administrador conserva el acceso completo; los demas roles lo reciben
-- desde el formulario de Roles.
INSERT INTO rolxprivilegio(id_rol, id_privilegio)
  SELECT r.id_rol, pr.id_privilegio FROM rol r
  JOIN rolxpermiso rp ON rp.id_rol = r.id_rol
  JOIN privilegio pr ON pr.id_permiso = rp.id_permiso AND pr.nombre = 'Descargar cotización'
  WHERE r.nombre = 'Administrador'
ON CONFLICT DO NOTHING;

COMMIT;
