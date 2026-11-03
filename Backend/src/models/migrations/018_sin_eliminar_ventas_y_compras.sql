-- =====================================================================
-- 018 · Ventas y compras no se eliminan
--
-- Una venta es dinero cobrado y una compra es mercaderia recibida o en
-- camino: se conservan siempre en el historial. La compra se da de baja
-- anulandola con motivo; la venta no se borra. Se retira el privilegio
-- «Eliminar» de los modulos Ventas y Compras (sus asignaciones a los roles
-- se borran en cascada). La API tambien lo rechaza.
-- Es idempotente: se puede ejecutar mas de una vez sin duplicar datos.
-- =====================================================================
BEGIN;

DELETE FROM privilegio pr USING permiso p
WHERE p.id_permiso = pr.id_permiso AND p.nombre IN ('Ventas', 'Compras') AND pr.nombre = 'Eliminar';

COMMIT;
