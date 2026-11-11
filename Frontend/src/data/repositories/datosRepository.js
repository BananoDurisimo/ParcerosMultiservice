import * as remoto from '@data/datasources/parcerosApi.js';
import { deServidor } from '@data/mappers/adaptador.js';

/*
 * Repositorio de los datos del sistema: une la fuente remota (la API) con el
 * mapeador, para que la capa de presentacion trabaje con las colecciones del
 * frontend y no con las tablas de la base de datos.
 */

/** Todas las colecciones ya traducidas al formato del frontend. */
export const cargarDatos = async () => deServidor(await remoto.obtenerDatos());

/** Adjunto de un registro (data URL, o '' si no tiene). */
export const cargarArchivo = async (col, id) => (await remoto.obtenerArchivo(col, id)).archivo || '';

/* `cuerpo` ya viene en el formato de la base de datos (aServidor). */
export const crearRegistro = (col, cuerpo) => remoto.crear(col, cuerpo);
export const actualizarRegistro = (col, id, cuerpo) => remoto.actualizar(col, id, cuerpo);
export const eliminarRegistro = (col, id) => remoto.eliminar(col, id);
