import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import rutas from './routes/index.js';
import { manejarErrores, rutaNoEncontrada } from './errors/errorHandler.js';

const app = express();
/* Origenes permitidos: los de FRONTEND_URL (la pagina publicada) y siempre el
   servidor de desarrollo local, para poder probar el frontend en el equipo
   contra esta API sin tocar la configuracion. Sin FRONTEND_URL se permite todo. */
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use(cors({ origin: (origen, cb) => cb(null, !origen || !env.frontendUrls || env.frontendUrls.includes(origen) || LOCAL.test(origen)) }));
/* El diseño del pedido y el comprobante del abono viajan como imagen
   (data URL) mientras no haya un servicio de archivos: hasta 5 MB cada uno. */
app.use(express.json({ limit: '8mb' }));

app.use('/api', rutas);
app.use(rutaNoEncontrada);
app.use(manejarErrores);

export default app;
