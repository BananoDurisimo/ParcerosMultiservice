import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const name of ['Roles','Usuarios','Clientes','Proveedores','Insumos','Compras','Pedidos','Abonos','Movimientos']) await client.query('INSERT INTO permiso(nombre) VALUES($1) ON CONFLICT(nombre) DO NOTHING',[name]);
    const actions=['Agregar','Editar','Ver detalle','Eliminar','Cambiar estado'];
    await client.query("INSERT INTO rol(nombre) VALUES('Administrador') ON CONFLICT(nombre) DO NOTHING");
    const {rows:[adminRole]}=await client.query("SELECT id_rol FROM rol WHERE nombre='Administrador'");
    await client.query('INSERT INTO rolxpermiso SELECT $1,id_permiso FROM permiso ON CONFLICT DO NOTHING',[adminRole.id_rol]);
    await client.query('INSERT INTO privilegio(id_permiso,nombre) SELECT p.id_permiso,a.nombre FROM permiso p CROSS JOIN unnest($1::text[]) a(nombre) ON CONFLICT DO NOTHING',[actions]);
    await client.query('INSERT INTO rolxprivilegio SELECT $1,id_privilegio FROM privilegio ON CONFLICT DO NOTHING',[adminRole.id_rol]);
    for (const [n,a] of [['Telas','m'],['Hilos','cono'],['Accesorios','unidad']]) { await client.query('INSERT INTO tipo_insumo(nombre) VALUES($1) ON CONFLICT DO NOTHING',[n]); await client.query('INSERT INTO unidad_medida(nombre,abreviatura) VALUES($1,$2) ON CONFLICT(nombre) DO NOTHING',[a==='m'?'Metro':a==='cono'?'Cono':'Unidad',a]); }
    for (const n of ['Cédula','NIT','Pasaporte']) await client.query('INSERT INTO tipo_documento(nombre) VALUES($1) ON CONFLICT DO NOTHING',[n]);
    for (const n of ['Efectivo','Transferencia','Tarjeta']) await client.query('INSERT INTO metodo_pago(nombre) VALUES($1) ON CONFLICT DO NOTHING',[n]);
    for (const [n,o,c] of [['Cotización',1,false],['Pedido en proceso',2,true],['Falta pago',3,true],['Completado',4,true],['Entregado',5,true]]) await client.query('INSERT INTO estado_pedido(nombre,orden,consume_inventario) VALUES($1,$2,$3) ON CONFLICT(nombre) DO NOTHING',[n,o,c]);
    for (const [n,i] of [['En tránsito',false],['Recibida',true],['Anulada',false]]) await client.query('INSERT INTO estado_compra(nombre,ingresa_inventario) VALUES($1,$2) ON CONFLICT(nombre) DO NOTHING',[n,i]);
    const hash=await bcrypt.hash('Cambiar123!',12);
    await client.query("INSERT INTO usuario(id_rol,nombre_usuario,contrasena_hash,correo_empresarial,nombre_empleado,cargo) VALUES($1,'admin',$2,'admin@parceros.ni','Administrador del sistema','Administrador') ON CONFLICT(correo_empresarial) DO NOTHING",[adminRole.id_rol,hash]);
    await client.query('COMMIT'); console.log('Datos semilla creados.');
  } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); await pool.end(); }
};
run().catch(e=>{console.error(e.message);process.exitCode=1});
