import 'dotenv/config';

/*
 * Variables de entorno en un solo lugar (ver .env.example). Se leen una vez,
 * al iniciar el proceso.
 */
export const env = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  /* PostgreSQL local normalmente no usa TLS; proveedores administrados como
   * Render y Supabase lo exigen para conexiones externas. */
  dbSsl: process.env.DB_SSL === 'true' || /(?:render\.com|supabase\.co)/i.test(process.env.DATABASE_URL || ''),
  jwtSecret: process.env.JWT_SECRET,
  /* Origenes del frontend publicado, separados por coma. Sin valor se permite todo. */
  frontendUrls: process.env.FRONTEND_URL?.split(',').map((o) => o.trim()),
  /* Direccion del frontend para los enlaces de los correos. */
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  brevoApiKey: process.env.BREVO_API_KEY,
  correoRemitente: process.env.CORREO_REMITENTE,
};
