# Parceros Multiservice

Sistema de gestión de **Parceros Multiservice** (proyecto formativo SENA). El
repositorio tiene dos partes:

| Carpeta | Qué es | Stack |
|---|---|---|
| `/` (`src/`) | Frontend: sitio público y sistema de gestión | React 18 + Vite + React Router |
| `backend/` | API REST con auditoría y permisos por rol | Node.js + Express + PostgreSQL |

El frontend no usa librerías de UI ni de gráficos: el sistema de diseño (colores,
tipografía, iconografía, componentes y gráficos SVG) está hecho a mano según la guía
de estilos del equipo. La API está documentada en [`backend/README.md`](backend/README.md).

---

## Sitio publicado

- Frontend: **https://bananodurisimo.github.io/ParcerosMultiservice/**
- API: **https://parceros-multiservice-api.onrender.com** (Render; la primera
  petición tras un rato inactiva puede tardar en responder)

## Cómo ejecutarlo

Por defecto el frontend usa la API publicada en Render, así que basta con:

```bash
npm install
npm run dev      # http://localhost:5173
```

Para trabajar contra una API local, levante `backend/` (ver su README) y copie
`.env.example` como `.env`:

```
VITE_API_URL=http://localhost:3000
```

Otros comandos: `npm run build` (compila a `dist/`), `npm run preview` y
`npm run deploy` (publica el sitio, ver abajo). Las pruebas del backend se
ejecutan con `npm test` dentro de `backend/`.

## Despliegue

El sitio vive en GitHub Pages y se sirve desde el subdirectorio
`/ParcerosMultiservice/`, por eso `vite.config.js` fija `base` en la compilación
y el router usa ese mismo valor como `basename`. Como Pages no reescribe rutas,
el despliegue copia `index.html` a `404.html`: así recargar `/app/pedidos`
carga la aplicación en lugar de dar error.

Hay tres caminos, todos ya configurados:

| | Cuándo se usa | Qué hace |
|---|---|---|
| `scripts/hooks/pre-push` | Automático, en cada push a `main` | Publica desde tu equipo, enganchado al mismo push |
| `npm run deploy` | Manual, desde tu equipo | Compila y empuja `dist/` a la rama `gh-pages` |
| `.github/workflows/deploy.yml` | Manual, desde la pestaña Actions | Compila y publica con GitHub Actions |

El despliegue automático es un hook de Git, no un workflow: `npm install` apunta
`core.hooksPath` a `scripts/hooks/` (script `prepare`), y desde ahí cada push a
`main` compila y publica el sitio. Si la publicación falla, el push de `main`
sigue su curso y basta con ejecutar `npm run deploy` después. Para saltarse el
hook en un push puntual: `git push --no-verify`.

> **Nota:** el workflow de Actions quedó en disparo manual porque la cuenta tiene
> Actions bloqueado por facturación: cada push dejaba un run fallido y su correo
> de error, sin publicar nada. Por eso el despliegue automático se hace con el
> hook. Cuando Actions vuelva a estar disponible, se puede devolver el disparador
> `push` del workflow, quitar el hook y cambiar Settings > Pages a "GitHub
> Actions" como origen, porque hoy Pages sirve la rama `gh-pages`.

## Acceso

Los datos viven en PostgreSQL, no en el frontend. El único usuario inicial lo crea
`npm run seed` en `backend/`:

| Correo | Contraseña | Rol |
|---|---|---|
| admin@parceros.ni | 123456 | Administrador |

Cambie la contraseña en el primer ingreso (Mi cuenta → Seguridad). Los demás roles
y usuarios se crean desde Configuración → Roles y Usuarios.

---

## Vistas incluidas

**Web**

| Ruta | Vista |
|---|---|
| `/` | Home (landing público: eslogan, carrusel, empresa, Instagram, FAQ, contacto y footer) |
| `/login` | Inicio de sesión |
| `/recuperar` | Recuperación de contraseña (y `?token=…` para restablecerla) |
| `/app` | Dashboard con KPIs y gráficos |
| `/app/roles` | Roles y permisos |
| `/app/usuarios` | Usuarios |
| `/app/movimientos` | Movimientos (historial de cambios de todos los módulos) |
| `/app/insumos` | Insumos y control de existencias |
| `/app/proveedores` | Proveedores |
| `/app/compras` | Compras de insumos a proveedores |
| `/app/categorias-producto` | Categorías de producto (tipo de prenda) |
| `/app/productos` | Productos base (prenda + talla + tela) con precio de venta y receta de insumos |
| `/app/clientes` | Clientes |
| `/app/pedidos` | Cotizaciones · Pedidos · Ventas (pestañas sobre el mismo registro) |
| `/app/abonos` | Abonos y saldos |
| `/app/cuenta` | Mi cuenta (perfil, seguridad, preferencias, actividad) |

**Mobile** — el layout es responsive; por debajo de 900px el sidebar se convierte en
drawer y aparece la barra inferior con los 5 accesos definidos en la guía:
Inicio, Compras, Abonos, Pedidos y Cuenta. Las tablas se transforman en listas.

---

## Funcionalidad implementada

- **Modo claro / oscuro** en todas las vistas (incluido el landing y el login).
  Se guarda en `localStorage`, respeta `prefers-color-scheme` y no parpadea al recargar.
  Se cambia desde la topbar, el sidebar o Cuenta → Preferencias.
- **Roles con permisos y privilegios**: cada rol tiene los módulos a los que entra
  (permisos) y las acciones que puede hacer en cada uno (privilegios: agregar, editar,
  ver detalle, cambiar estado, anular, eliminar, ver/descargar diseño o comprobante). Los
  botones de cada pantalla aparecen solo si el rol tiene el privilegio.
- **Registro, consulta, edición, cambio de estado y eliminación** en todos los módulos
  (menos el historial de movimientos, que es la auditoría). Eliminar pide confirmación y
  se impide cuando otros registros dependen de la fila (un cliente con pedidos, un rol con
  usuarios…): en esos casos se inactiva, y las compras además se pueden anular.
- **Llaves foráneas con buscador** en todos los formularios (cliente, proveedor, insumo,
  rol, pedido) y validación de todos los campos al confirmar.
- **Cotizaciones, pedidos y ventas** son el mismo registro: la cotización guarda insumos,
  descripción e imagen del diseño; el primer abono (50% o total) la pasa a pedido en
  proceso; al terminarlo queda en «falta pago» o «completado» según el saldo; y la entrega
  se registra en Ventas. Máximo dos abonos por pedido.
- **Historial de movimientos** (Configuración → Movimientos): cada alta y cambio hecho en
  el sistema queda registrado con el responsable, la fecha y hora y el detalle campo por
  campo de `valor_anterior` frente a `valor_nuevo`, junto con los inicios de sesión, los
  intentos fallidos y los cierres de sesión.
- **Estados editables desde el listado**: cada estado (y el rol del usuario o el método
  de pago del abono) se cambia directamente en la fila de la tabla o de la lista móvil,
  sin abrir el detalle ni el formulario. Componente `ui/EstadoCell.jsx`.
- **Validación de campos** con mensajes en línea (requeridos, correo, teléfono,
  numéricos, caracteres especiales) más notificación de error.
- **Notificaciones**: toasts de éxito / error / alerta / validación / información
  y campana en la topbar alimentada por el estado real (stock bajo, saldos pendientes,
  compras en tránsito).
- **Tablas** con búsqueda, filtros desplegables, ordenamiento por columna,
  paginación ("Mostrando 1-8 de 42 …") y estado vacío.
- **Dashboard según el rol**: el Administrador y el Gerente ven todo; el Vendedor solo los
  indicadores de ventas y el Almacenista solo los de compras. Indicadores y gráficos
  alimentados por los datos reales del `DataContext` y recalculados con el selector de
  periodo Hoy · Semana · Mes · Año:

  | # | Gráfico | Tipo | Qué muestra |
  |---|---|---|---|
  | 1 | Ventas / Compras | Línea de área con tooltip | Tendencia del periodo |
  | 2 | Pedidos por estado | Barras verticales | Carga de trabajo por etapa |
  | 3 | Compras por tipo de insumo | Dona | En qué se gasta el presupuesto |
  | 4 | Recaudo por método de pago | Dona | Cómo pagan los clientes |
  | 5 | Insumos con menores existencias | Barras horizontales con umbral | Riesgo de desabasto |

  Los KPI (ventas, compras, abonos por cobrar y pedidos activos) muestran su
  variación real contra el periodo anterior, no un porcentaje fijo. Todo está hecho
  a mano en SVG/CSS, sin librerías de gráficos.
- **Animaciones**: entrada de páginas y tarjetas escalonada, contador animado en los KPI,
  trazado progresivo de las líneas del gráfico, transiciones de modales, drawer, toasts,
  hover en filas y botones. Todo respeta `prefers-reduced-motion`.
- **Productos base y recetas**: un producto es una prenda en una talla y una tela
  (p. ej. «Jersey XL Drift») con su precio de venta y la receta de insumos de una unidad.
  En la cotización o el pedido se agregan productos (se cobra su precio) y el sistema
  calcula solo los insumos de la receta, que descuentan inventario sin cobrarse aparte;
  la personalización (estampados, colores…) se agrega como insumos con su precio.
- **Exportar y reporte por módulo** (cotizaciones, pedidos, ventas, abonos, insumos y
  compras; privilegio «Exportar»): «Exportar» descarga la tabla a PDF o Excel y «Reporte»
  genera un PDF con indicadores, resumen agrupado y detalle. Ambos usan lo que muestra la
  tabla (búsqueda y filtros aplicados) y se generan en el navegador, sin librerías
  (`shared/lib/exportar.js`).
- **Trazabilidad del pedido** en línea de tiempo con los cinco estados de la ficha.

---

## Estructura (Feature Based)

El código se organiza por **funcionalidad**, no por tipo de archivo: cada macroproceso
del menú es una carpeta en `features/` que agrupa sus páginas, sus componentes y sus
datos propios. Lo que usan dos o más funcionalidades vive en `shared/`, y el armado de
la aplicación (proveedores y rutas) en `app/`.

```
src/
├─ app/                        Ensamblado de la aplicación
│  ├─ App.jsx                  Composición: proveedores + rutas + splash
│  ├─ providers/               AppProviders (tema, avisos, sesión, datos)
│  ├─ routes/                  AppRoutes (mapa de rutas por macroproceso)
│  └─ pages/NotFound.jsx       Ruta no encontrada
│
├─ features/                   Una carpeta por macroproceso
│  ├─ home/                    Landing público (pages · data · assets)
│  ├─ auth/                    Login · Recuperar · Cuenta
│  ├─ dashboard/               Dashboard con KPIs y gráficos
│  ├─ configuracion/           Roles · Usuarios · Movimientos
│  │  ├─ pages/                Una vista por módulo
│  │  └─ components/           MovimientoDetalle (comparativo antes / después)
│  ├─ compras/                 Insumos · Proveedores · Compras
│  ├─ productos/               Categorías de producto · Productos (con su receta)
│  └─ ventas/                  Clientes · Pedidos (cotizaciones, pedidos, ventas) · Abonos
│
├─ shared/                     Transversal a todas las funcionalidades
│  ├─ components/
│  │  ├─ Icon.jsx              Iconografía completa del sistema (SVG)
│  │  ├─ CrudPage.jsx          Página CRUD reutilizable (la usan todos los módulos)
│  │  ├─ charts/               AreaChart · BarChart · HBarChart · DonutChart
│  │  ├─ layout/               Sidebar · TopBar · BottomBar · Footer · AppLayout
│  │  └─ ui/                   DataTable · Modal · ConfirmDialog · Form · KpiCard ·
│  │                           EstadoCell (estado editable en lista) · Carousel …
│  ├─ context/                 ThemeContext · AuthContext · ToastContext · DataContext
│  ├─ api/                     cliente.js (HTTP + token) · adaptador.js (BD ↔ colecciones)
│  └─ data/                    mock.js (constantes y utilidades) · nav.js (menú)
│
├─ assets/                     Recursos globales (logo)
└─ styles/globals.css          Tokens de color, tipografía y componentes
```

**Reglas de dependencia:** `app` puede importar de `features` y de `shared`;
`features` importa de `shared`; `shared` no importa de `features`. Así ninguna
funcionalidad depende de otra y se pueden agregar o quitar módulos sin tocar el resto.

### Alias de importación

Para no encadenar `../../..`, cada capa tiene su alias (definidos en `vite.config.js`
y en `jsconfig.json` para el autocompletado del editor):

| Alias | Carpeta |
|---|---|
| `@app/…` | `src/app` |
| `@features/…` | `src/features` |
| `@shared/…` | `src/shared` |
| `@assets/…` · `@styles/…` | `src/assets` · `src/styles` |

```jsx
import DataTable from '@shared/components/ui/DataTable.jsx';
import { Roles, Usuarios, Movimientos } from '@features/configuracion';
```

### Relación con la API

`DataContext` es el único punto que toca los datos: carga todo con `GET /api/datos`
y crea, edita o elimina con `POST/PUT/DELETE /api/{coleccion}` mediante
`shared/api/cliente.js`. `adaptador.js` traduce las tablas de la base de datos
(`id_cliente`, `activo`, `id_estado_pedido`…) a las colecciones que usan las páginas
(`id`, `estado`…), por eso las vistas no conocen el esquema SQL. `mock.js` ya no
contiene datos de ejemplo: solo constantes (estados, privilegios, colores) y
formateadores. El token de sesión se guarda en `sessionStorage` y se envía como
`Authorization: Bearer`; si la API responde 401, la sesión se cierra.

---

Equipo de Desarrollo VP · © 2026 Parceros Multiservice
