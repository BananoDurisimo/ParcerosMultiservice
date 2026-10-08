import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import auth from './routes/auth.js';
import datos from './routes/datos.js';
import crud from './routes/crud.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL?.split(',').map((o) => o.trim()) || true }));
/* El diseño del pedido y el comprobante del abono viajan como imagen
   (data URL) mientras no haya un servicio de archivos: hasta 5 MB cada uno. */
app.use(express.json({ limit: '8mb' }));

app.get('/api/health', (_, res) => res.json({ ok: true, service: 'parceros-multiservice-api' }));
app.use('/api/auth', auth);
app.use('/api', requireAuth, datos);
app.use('/api', requireAuth, crud);
app.use((_, res) => res.status(404).json({ message: 'Ruta no encontrada.' }));

/*
 * Errores de PostgreSQL traducidos a mensajes para el usuario. `campo`
 * permite al frontend mostrar el error dentro del campo del formulario.
 */
const CAMPO = /Key \(([^)]+)\)=/;
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'El archivo adjunto es demasiado grande.' });
  switch (err.code) {
    case '23505': {
      const campo = err.detail?.match(CAMPO)?.[1];
      return res.status(409).json({ campo, message: 'Ya existe un registro con este valor.' });
    }
    case '23503':
      return res.status(409).json({ message: req.method === 'DELETE'
        ? 'No se puede eliminar: tiene registros asociados. Puede desactivarlo en su lugar.'
        : 'Uno de los registros relacionados no existe.' });
    case '23502':
      return res.status(400).json({ campo: err.column, message: 'Este campo no puede estar vacío.' });
    case '23514':
    case '22P02':
    case '22001':
    case '22003':
      return res.status(400).json({ message: 'Hay un valor no válido en el formulario.' });
    case 'P0001': // RAISE EXCEPTION de los triggers
      return res.status(400).json({ message: err.message });
    default:
      console.error(err);
      return res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

export default app;
