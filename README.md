# Parceros Multiservice — Frontend

Capa de presentación (Sprint 07) del sistema de gestión de **Parceros Multiservice**.
Construido con **React 18 + Vite + React Router**, sin dependencias de UI externas:
todo el sistema de diseño (colores, tipografía, iconografía, componentes) está
implementado según la guía de estilos del equipo.

> Solo frontend. No hay backend: los datos provienen de `src/shared/data/mock.js` y viven
> en memoria a través de `DataContext`. Al conectar la API REST de Node.js basta con
> reemplazar las funciones de ese contexto por llamadas HTTP.

---

## Sitio publicado

**https://bananodurisimo.github.io/ParcerosMultiservice/**

## Cómo ejecutarlo

```bash
npm install
npm run dev      # http://localhost:5173
```

Otros comandos: `npm run build` (compila a `dist/`), `npm run preview` y
`npm run deploy` (publica el sitio, ver abajo).

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

## Usuarios de prueba

| Correo | Contraseña | Rol |
|---|---|---|
| admin@parceros.ni | 123456 | Administrador |
| gerente@parceros.ni | 123456 | Gerente |
| vendedor@parceros.ni | 123456 | Vendedor |
| almacen@parceros.ni | 123456 | Almacenista |

En la pantalla de login puede hacer clic en el rol para autocompletar las credenciales.

---

## Vistas incluidas

**Web**

| Ruta | Vista |
|---|---|
| `/` | Home (landing público: eslogan, carrusel, empresa, Instagram, FAQ, contacto y footer) |
| `/login` | Inicio de sesión |
| `/recuperar` | Recuperación de contraseña |
| `/app` | Dashboard con KPIs y gráficos |
| `/app/roles` | Roles y permisos |
| `/app/usuarios` | Usuarios |
| `/app/movimientos` | Movimientos (historial de cambios de todos los módulos) |
| `/app/insumos` | Insumos y control de existencias |
| `/app/categorias` | Categorías de productos |
| `/app/productos` | Catálogo de productos |
| `/app/proveedores` | Proveedores |
| `/app/compras` | Compras a proveedores |
| `/app/clientes` | Clientes |
| `/app/pedidos` | Pedidos y trazabilidad |
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
- **CRUD completo** en los 11 módulos: crear, ver detalle, editar y eliminar, con
  modales animados y confirmación antes de borrar.
- **Historial de movimientos** (Configuración → Movimientos): bitácora de solo consulta
  de la tabla `movimientos`, con el módulo afectado, la acción (creación / modificación /
  eliminación), el responsable, la fecha y hora, y el detalle campo por campo de
  `valor_anterior` frente a `valor_nuevo`.
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
- **Dashboard con 4 KPI y 6 gráficos**, todos alimentados por los datos reales del
  `DataContext` y recalculados con el selector de periodo Hoy · Semana · Mes · Año:

  | # | Gráfico | Tipo | Qué muestra |
  |---|---|---|---|
  | 1 | Ventas / Compras | Línea de área con tooltip | Tendencia del periodo |
  | 2 | Pedidos por estado | Barras verticales | Carga de trabajo por etapa |
  | 3 | Productos más vendidos | Barras horizontales | Top 5 por monto vendido |
  | 4 | Compras por tipo de insumo | Dona | En qué se gasta el presupuesto |
  | 5 | Recaudo por método de pago | Dona | Cómo pagan los clientes |
  | 6 | Insumos con menores existencias | Barras horizontales con umbral | Riesgo de desabasto |

  Los 4 KPI (ventas, compras, abonos por cobrar y pedidos activos) muestran su
  variación real contra el periodo anterior, no un porcentaje fijo. Todo está hecho
  a mano en SVG/CSS, sin librerías de gráficos.
- **Animaciones**: entrada de páginas y tarjetas escalonada, contador animado en los KPI,
  trazado progresivo de las líneas del gráfico, transiciones de modales, drawer, toasts,
  hover en filas y botones. Todo respeta `prefers-reduced-motion`.
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
│  ├─ compras/                 Insumos · Categorías · Productos · Proveedores · Compras
│  └─ ventas/                  Clientes · Pedidos · Abonos
│     └─ index.js              Barril: qué expone la funcionalidad hacia afuera
│
├─ shared/                     Transversal a todas las funcionalidades
│  ├─ components/
│  │  ├─ Icon.jsx              Iconografía completa del sistema (SVG)
│  │  ├─ CrudPage.jsx          Página CRUD reutilizable (la usan los 11 módulos)
│  │  ├─ charts/               AreaChart · BarChart · HBarChart · DonutChart
│  │  ├─ layout/               Sidebar · TopBar · BottomBar · Footer · AppLayout
│  │  └─ ui/                   DataTable · Modal · ConfirmDialog · Form · KpiCard ·
│  │                           EstadoCell (estado editable en lista) · Carousel …
│  ├─ context/                 ThemeContext · AuthContext · ToastContext · DataContext
│  └─ data/                    mock.js (datos de ejemplo) · nav.js (menú)
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

### Relación con la arquitectura por capas

Este proyecto es la **capa de presentación**. `DataContext` es el único punto que
toca los datos, de modo que al integrar la API REST solo cambia ese archivo: los
componentes y las páginas quedan intactos.

---

Equipo de Desarrollo VP · © 2026 Parceros Multiservice
