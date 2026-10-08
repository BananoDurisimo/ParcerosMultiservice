import { Router } from 'express';
import { query } from '../db/pool.js';
const router=Router();
const catalogs={permisos:'permiso',privilegios:'privilegio',tipos_insumo:'tipo_insumo',unidades_medida:'unidad_medida',tallas:'talla',estados_pedido:'estado_pedido',estados_compra:'estado_compra',tipos_documento:'tipo_documento',metodos_pago:'metodo_pago'};
router.get('/catalogos/:name',async(req,res,next)=>{try{const table=catalogs[req.params.name];if(!table)return res.status(404).json({message:'Catálogo no encontrado.'});const {rows}=await query(`SELECT * FROM ${table} ORDER BY 1`);res.json(rows)}catch(e){next(e)}});
router.get('/inventario/stock',async(req,res,next)=>{try{const {rows}=await query('SELECT i.*,s.stock,t.nombre tipo,u.nombre unidad,u.abreviatura FROM insumo i JOIN v_insumo_stock s ON s.id_insumo=i.id_insumo JOIN tipo_insumo t ON t.id_tipo_insumo=i.id_tipo_insumo JOIN unidad_medida u ON u.id_unidad_medida=i.id_unidad_medida ORDER BY i.nombre');res.json(rows)}catch(e){next(e)}});
router.get('/movimientos',async(req,res,next)=>{try{const {rows}=await query('SELECT m.*,u.nombre_empleado usuario FROM movimientos m LEFT JOIN usuario u ON u.id_usuario=m.id_usuario ORDER BY m.fecha_cambio DESC LIMIT 200');res.json(rows)}catch(e){next(e)}});
router.get('/dashboard/resumen',async(req,res,next)=>{try{const {rows}=await query("SELECT (SELECT COALESCE(SUM(total),0) FROM v_pedido_total) ventas,(SELECT COALESCE(SUM(total),0) FROM v_compra_total) compras,(SELECT COALESCE(SUM(saldo),0) FROM v_pedido_total) por_cobrar,(SELECT COUNT(*) FROM insumo i JOIN v_insumo_stock s ON s.id_insumo=i.id_insumo WHERE s.stock<=i.stock_minimo) bajo_stock");res.json(rows[0])}catch(e){next(e)}});
export default router;
