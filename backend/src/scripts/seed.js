import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';

/*
 * Datos iniciales minimos. Los catalogos, los permisos y los privilegios los
 * crea la migracion 002 con los mismos valores del frontend; aqui solo se
 * agregan los tipos de insumo, las unidades de medida, el rol Administrador
 * con acceso completo y su usuario. Se puede ejecutar varias veces.
 */
const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const n of ['Tela', 'Hilo', 'Estampado', 'Accesorio']) {
      await client.query('INSERT INTO tipo_insumo(nombre) VALUES($1) ON CONFLICT DO NOTHING', [n]);
    }
    for (const [n, a] of [['Metro', 'm'], ['Yarda', 'yd'], ['Unidad', 'u'], ['Rollo', 'rollo'], ['Kilogramo', 'kg'], ['Docena', 'doc'], ['Cono', 'cono']]) {
      await client.query('INSERT INTO unidad_medida(nombre,abreviatura) VALUES($1,$2) ON CONFLICT DO NOTHING', [n, a]);
    }

    await client.query("INSERT INTO rol(nombre) VALUES('Administrador') ON CONFLICT(nombre) DO NOTHING");
    const { rows: [admin] } = await client.query("SELECT id_rol FROM rol WHERE nombre='Administrador'");
    await client.query('INSERT INTO rolxpermiso SELECT $1,id_permiso FROM permiso ON CONFLICT DO NOTHING', [admin.id_rol]);
    await client.query('INSERT INTO rolxprivilegio SELECT $1,id_privilegio FROM privilegio ON CONFLICT DO NOTHING', [admin.id_rol]);

    const hash = await bcrypt.hash('Cambiar123!', 12);
    await client.query(
      "INSERT INTO usuario(id_rol,nombre_usuario,contrasena_hash,correo_empresarial,nombre_empleado,cargo,fecha_ingreso) VALUES($1,'admin',$2,'admin@parceros.ni','Administrador del sistema','Administrador',CURRENT_DATE) ON CONFLICT(correo_empresarial) DO NOTHING",
      [admin.id_rol, hash]
    );

    await client.query('COMMIT');
    console.log('Datos semilla creados.');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
};
run().catch((e) => { console.error(e.message); process.exitCode = 1; });
