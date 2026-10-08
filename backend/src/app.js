import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import auth from './routes/auth.js';
import resources from './routes/resources.js';
import system from './routes/system.js';
import { requireAuth } from './middleware/auth.js';

const app=express();
app.use(cors({ origin: process.env.FRONTEND_URL?.split(',') || true }));
app.use(express.json({limit:'2mb'}));
app.get('/api/health',(_,res)=>res.json({ok:true,service:'parceros-multiservice-api'}));
app.use('/api/auth',auth);
app.use('/api',requireAuth,system);
app.use('/api',requireAuth,resources);
app.use((_,res)=>res.status(404).json({message:'Ruta no encontrada.'}));
app.use((err,req,res,next)=>{ console.error(err); const code=err.code==='23505'?409:err.code==='23503'?409:err.code==='22001'?400:500; res.status(code).json({message: code===500?'Error interno del servidor.':err.detail||err.message}); });
export default app;
