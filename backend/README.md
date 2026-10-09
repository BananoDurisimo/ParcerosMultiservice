# API de Parceros Multiservice

Backend REST con Node.js, Express y PostgreSQL. El esquema conserva el modelo de
DBDiagram: no almacena totales ni existencias; se calculan con vistas
(`v_pedido_total`, `v_compra_total`, `v_insumo_stock`).

## Inicio rápido

1. Cree una base de datos PostgreSQL: `CREATE DATABASE parceros_multiservice;`.
2. Copie `.env.example` como `.env` y ajuste `DATABASE_URL` y `JWT_SECRET`.
   Para una conexión externa de Render/Supabase, configure también `DB_SSL=true`.
3. Ejecute `npm install` dentro de esta carpeta.
4. Ejecute `npm run migrate`: aplica en orden las migraciones de
   `src/db/migrations` que falten y las anota en `schema_migrations`.
5. Ejecute `npm run seed` para los tipos de insumo, las unidades, el rol
   Administrador y su usuario.
6. Ejecute `npm run dev`. La API queda en `http://localhost:3000/api`.

El usuario inicial es `admin@parceros.ni`, con clave `Cambiar123!`. Cámbiela al
primer inicio de sesión (Mi cuenta > Seguridad).

## Migraciones

| Archivo | Contenido |
|---|---|
| `001_initial_schema.sql` | Tablas, vistas, kardex e historial |
| `002_conexion_frontend.sql` | Auditoría corregida (id del registro y sin contraseña), adjuntos como `TEXT`, catálogos y permisos con los valores del frontend, regla privilegio ↔ módulo |
| `003_proteger_rol_administrador.sql` | Reactiva el rol Administrador y lo protege con un trigger: no se puede inactivar ni renombrar |
| `004_proteger_usuario_admin.sql` | Reactiva el usuario `admin@parceros.ni` y lo protege con triggers: no se puede inactivar ni eliminar |
| `005_modulo_reportes.sql` | Permiso `Reportes` con los privilegios Ver detalle y Exportar, asignados al Administrador |

`npm start` ejecuta las migraciones pendientes antes de iniciar el servidor,
así que en Render basta con desplegar. Son idempotentes: no se repiten.

## Rutas

Todas, salvo `health` y `login`, requieren `Authorization: Bearer <token>`.

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/api/health` | Estado del servicio |
| `POST` | `/api/auth/login` | `{ correo, contrasena }` → `{ token, user }` |
| `GET` | `/api/auth/me` | Usuario de la sesión con sus acciones por módulo |
| `POST` | `/api/auth/logout` | Registra el cierre de sesión |
| `PUT` | `/api/auth/clave` | `{ actual, nueva }`: cambio de la propia contraseña |
| `GET` | `/api/datos` | Todas las tablas que usa el frontend en una sola respuesta |
| `POST` | `/api/{coleccion}` | Crear |
| `PUT` | `/api/{coleccion}/:id` | Editar, cambiar estado o anular |
| `DELETE` | `/api/{coleccion}/:id` | Eliminar |

Colecciones: `clientes`, `proveedores`, `insumos`, `roles` (con `permisos` y
`privilegios`), `usuarios` (con `contrasena` al crear), `compras` (con
`detalles`), `pedidos` (con `insumos`) y `abonos`.

## Seguridad

- Cada escritura exige el privilegio del módulo en el servidor: crear necesita
  "Agregar", modificar "Editar", "Cambiar estado" o "Anular", y eliminar
  "Eliminar". Sin permiso sobre Usuarios, cada quien solo edita su perfil.
- Las contraseñas se guardan con bcrypt y nunca salen de la base de datos ni
  aparecen en el historial de movimientos.
- Cada escritura corre en una transacción con el usuario de la petición
  (`app.user_id`), que es el responsable que registran los triggers.

## Errores

Las respuestas de error traen `{ message }` y, cuando aplica, `campo` con el
nombre de la columna (p. ej. un documento repetido devuelve `409` con
`campo: "documento"`).

## Pendiente

- Recuperación de contraseña por correo: la tabla `recuperacion_clave` existe,
  falta el servicio de envío de correos.
- Archivos (diseño y comprobante) en un servicio de almacenamiento: hoy se
  guardan como data URL en columnas `TEXT`.
