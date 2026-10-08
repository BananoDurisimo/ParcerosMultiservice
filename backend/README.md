# API de Parceros Multiservice

Backend REST con Node.js, Express y PostgreSQL. El esquema conserva el modelo de
DBDiagram: no almacena totales ni existencias; se calculan con vistas.

## Inicio rápido

1. Cree una base de datos PostgreSQL: `CREATE DATABASE parceros_multiservice;`.
2. Copie `.env.example` como `.env` y ajuste `DATABASE_URL` y `JWT_SECRET`.
   Para una conexión externa de Render/Supabase, configure también `DB_SSL=true`.
3. Ejecute `npm install` dentro de esta carpeta.
4. Ejecute `npm run migrate` para crear tablas, restricciones, vistas y triggers.
5. Ejecute `npm run seed` para los catálogos y el administrador inicial.
6. Ejecute `npm run dev`. La API queda en `http://localhost:3000/api`.

El usuario inicial es `admin@parceros.ni`, con clave `Cambiar123!`. Cámbiela al
primer inicio de sesión.

## Rutas principales

- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET|POST|PUT|DELETE /api/{clientes,proveedores,insumos,compras,pedidos,abonos,usuarios,roles}`
- `GET /api/catalogos/:nombre` para catálogos de solo lectura.
- `GET /api/dashboard/resumen`, `GET /api/inventario/stock`, `GET /api/movimientos`

Las rutas protegidas requieren `Authorization: Bearer <token>`. Las operaciones
de escritura registran auditoría en `movimientos`; los cambios de estado de
compras y pedidos actualizan el kardex mediante triggers de PostgreSQL.
