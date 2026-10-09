/** Menu de macroprocesos (punto 2 y 4 de la guia). `permiso` es el nombre
 *  del permiso (tabla `permiso`) que el rol necesita para ver el modulo; una
 *  lista indica que basta con tener uno de ellos. */
export const NAV = [
  { section: null, items: [{ to: '/app', icon: 'home', label: 'Inicio', end: true }] },
  {
    section: 'Configuración',
    items: [
      { to: '/app/roles', icon: 'shield', label: 'Roles', permiso: 'Roles' },
      { to: '/app/usuarios', icon: 'user', label: 'Usuarios', permiso: 'Usuarios' },
      { to: '/app/movimientos', icon: 'history', label: 'Movimientos', permiso: 'Movimientos' },
    ],
  },
  {
    section: 'Compras',
    items: [
      { to: '/app/insumos', icon: 'package', label: 'Insumos', permiso: 'Insumos' },
      { to: '/app/proveedores', icon: 'truck', label: 'Proveedores', permiso: 'Proveedores' },
      { to: '/app/compras', icon: 'cart', label: 'Compras', permiso: 'Compras' },
    ],
  },
  {
    section: 'Ventas',
    items: [
      { to: '/app/clientes', icon: 'users', label: 'Clientes', permiso: 'Clientes' },
      /* Cotizaciones, pedidos y ventas son el mismo registro: se gestionan
         desde Pedidos, cada una en su pestaña. */
      { to: '/app/pedidos', icon: 'clipboard', label: 'Pedidos', permiso: ['Cotizaciones', 'Pedidos', 'Ventas'] },
      { to: '/app/abonos', icon: 'coin', label: 'Abonos', permiso: 'Abonos' },
      { to: '/app/reportes', icon: 'chart', label: 'Reportes', permiso: 'Reportes' },
    ],
  },
];

/** Barra inferior movil (punto 4c): maximo 5 accesos. */
export const BOTTOM = [
  { to: '/app', icon: 'home', label: 'Inicio', end: true },
  { to: '/app/compras', icon: 'cart', label: 'Compras', permiso: 'Compras' },
  { to: '/app/abonos', icon: 'dollar', label: 'Abonos', permiso: 'Abonos' },
  { to: '/app/pedidos', icon: 'clipboard', label: 'Pedidos', permiso: ['Cotizaciones', 'Pedidos', 'Ventas'] },
  { to: '/app/cuenta', icon: 'user', label: 'Cuenta' },
];
