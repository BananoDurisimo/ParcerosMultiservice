import { Router } from 'express';
import { pool, query } from '../db/pool.js';

const resources = {
  clientes: { table:'cliente', id:'id_cliente', fields:['id_tipo_documento','nombre','documento','telefono','correo','direccion','activo'] },
  proveedores: { table:'proveedor', id:'id_proveedor', fields:['id_tipo_insumo','nombre','nombre_persona_contacto','nit','telefono','correo','direccion','activo'] },
  insumos: { table:'insumo', id:'id_insumo', fields:['id_tipo_insumo','id_unidad_medida','nombre','stock_minimo','precio_unitario','activo'] },
  usuarios: { table:'usuario', id:'id_usuario', fields:['id_rol','nombre_usuario','correo_empresarial','nombre_empleado','documento','telefono','cargo','fecha_ingreso','activo'] },
  roles: { table:'rol', id:'id_rol', fields:['nombre','activo'] },
};
const router = Router();
const clean = (cfg, body) => Object.fromEntries(cfg.fields.filter(k => body[k] !== undefined).map(k => [k, body[k]]));

router.get('/:resource', async (req,res,next) => { try {
  const cfg=resources[req.params.resource]; if(!cfg) return next();
  const { rows } = await query(`SELECT * FROM ${cfg.table} ORDER BY ${cfg.id} DESC`); res.json(rows);
} catch(e){next(e)} });
router.get('/:resource/:id', async (req,res,next) => { try {
  const cfg=resources[req.params.resource]; if(!cfg) return next();
  const {rows}=await query(`SELECT * FROM ${cfg.table} WHERE ${cfg.id}=$1`,[req.params.id]); if(!rows[0]) return res.status(404).json({message:'Registro no encontrado.'}); res.json(rows[0]);
} catch(e){next(e)} });
router.post('/:resource', async (req,res,next) => { try {
  const cfg=resources[req.params.resource]; if(!cfg) return next(); const data=clean(cfg,req.body);
  if(req.params.resource==='usuarios') return res.status(400).json({message:'Los usuarios se crean desde /api/admin/usuarios.'});
  const keys=Object.keys(data); const {rows}=await query(`INSERT INTO ${cfg.table} (${keys.join(',')}) VALUES (${keys.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,Object.values(data)); res.status(201).json(rows[0]);
} catch(e){next(e)} });
router.put('/:resource/:id', async (req,res,next) => { try {
  const cfg=resources[req.params.resource]; if(!cfg) return next(); const data=clean(cfg,req.body); const keys=Object.keys(data); if(!keys.length) return res.status(400).json({message:'No hay cambios.'});
  const {rows}=await query(`UPDATE ${cfg.table} SET ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} WHERE ${cfg.id}=$${keys.length+1} RETURNING *`,[...Object.values(data),req.params.id]); if(!rows[0]) return res.status(404).json({message:'Registro no encontrado.'}); res.json(rows[0]);
} catch(e){next(e)} });
router.delete('/:resource/:id', async (req,res,next) => { try { const cfg=resources[req.params.resource]; if(!cfg) return next(); const result=await query(`DELETE FROM ${cfg.table} WHERE ${cfg.id}=$1`,[req.params.id]); if(!result.rowCount) return res.status(404).json({message:'Registro no encontrado.'}); res.status(204).end(); } catch(e){next(e)} });

async function saveLines(client, table, idName, id, lines, fields) { for(const line of lines || []) { await client.query(`INSERT INTO ${table}(${idName},${fields.join(',')}) VALUES ($1,${fields.map((_,i)=>'$'+(i+2)).join(',')})`, [id,...fields.map(f=>line[f])]); } }
router.get('/documentos/compras', async(req,res,next)=>{try { const {rows}=await query('SELECT c.*,p.nombre proveedor,ec.nombre estado,COALESCE(v.total,0) total FROM compra c JOIN proveedor p ON p.id_proveedor=c.id_proveedor JOIN estado_compra ec ON ec.id_estado_compra=c.id_estado_compra LEFT JOIN v_compra_total v ON v.id_compra=c.id_compra ORDER BY c.id_compra DESC');res.json(rows)}catch(e){next(e)}});
router.post('/documentos/compras', async(req,res,next)=>{ const client=await pool.connect();try {await client.query('BEGIN');const b=req.body;const {rows}=await client.query('INSERT INTO compra(id_proveedor,id_estado_compra,fecha,fecha_entrega) VALUES($1,$2,$3,$4) RETURNING *',[b.id_proveedor,b.id_estado_compra,b.fecha,b.fecha_entrega||null]);await saveLines(client,'detalle_compra_insumo','id_compra',rows[0].id_compra,b.detalles,['id_insumo','cantidad','precio_unitario']);await client.query('COMMIT');res.status(201).json(rows[0])}catch(e){await client.query('ROLLBACK');next(e)}finally{client.release()} });
router.get('/documentos/pedidos', async(req,res,next)=>{try {const {rows}=await query('SELECT p.*,c.nombre cliente,e.nombre estado,v.total,v.abonado,v.saldo FROM pedido p JOIN cliente c ON c.id_cliente=p.id_cliente JOIN estado_pedido e ON e.id_estado_pedido=p.id_estado_pedido JOIN v_pedido_total v ON v.id_pedido=p.id_pedido ORDER BY p.id_pedido DESC');res.json(rows)}catch(e){next(e)}});
router.post('/documentos/pedidos', async(req,res,next)=>{const client=await pool.connect();try{await client.query('BEGIN');const b=req.body;const {rows}=await client.query('INSERT INTO pedido(id_cliente,id_estado_pedido,id_vendedor,fecha_creacion,fecha_inicio,fecha_entrega,descripcion,ruta_imagen_diseno) VALUES($1,$2,$3,COALESCE($4,CURRENT_DATE),$5,$6,$7,$8) RETURNING *',[b.id_cliente,b.id_estado_pedido,req.user.id_usuario,b.fecha_creacion,b.fecha_inicio||null,b.fecha_entrega||null,b.descripcion||null,b.ruta_imagen_diseno||null]);await saveLines(client,'detalle_pedido_insumo','id_pedido',rows[0].id_pedido,b.insumos,['id_insumo','cantidad','precio_unitario']);await saveLines(client,'detalle_pedido_talla','id_pedido',rows[0].id_pedido,b.tallas,['id_talla','cantidad']);await client.query('COMMIT');res.status(201).json(rows[0])}catch(e){await client.query('ROLLBACK');next(e)}finally{client.release()}});
router.patch('/documentos/pedidos/:id/estado',async(req,res,next)=>{try{const {rows}=await query('UPDATE pedido SET id_estado_pedido=$1, fecha_inicio=COALESCE(fecha_inicio,CASE WHEN (SELECT consume_inventario FROM estado_pedido WHERE id_estado_pedido=$1) THEN CURRENT_DATE END) WHERE id_pedido=$2 RETURNING *',[req.body.id_estado_pedido,req.params.id]);if(!rows[0])return res.status(404).json({message:'Pedido no encontrado.'});res.json(rows[0])}catch(e){next(e)}});
router.post('/documentos/abonos',async(req,res,next)=>{try{const b=req.body;const {rows}=await query('INSERT INTO abono(id_pedido,id_metodo_pago,monto,fecha,ruta_comprobante) VALUES($1,$2,$3,COALESCE($4,CURRENT_DATE),$5) RETURNING *',[b.id_pedido,b.id_metodo_pago,b.monto,b.fecha,b.ruta_comprobante||null]);res.status(201).json(rows[0])}catch(e){next(e)}});
export default router;
