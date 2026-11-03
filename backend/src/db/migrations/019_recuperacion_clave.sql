-- =====================================================================
-- 019 · Recuperacion de contraseña por correo
--
-- Cada solicitud genera un enlace de un solo uso, valido 30 minutos. Se
-- guarda el hash SHA-256 del token, no el token: si la base se filtra, los
-- enlaces vigentes no quedan expuestos.
-- =====================================================================
CREATE TABLE recuperacion_clave (
  token_hash CHAR(64) PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuario ON DELETE CASCADE,
  vence TIMESTAMP NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT FALSE
);
