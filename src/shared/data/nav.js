/** Menu de macroprocesos (punto 2 y 4 de la guia). `permiso` es el nombre
 *  del permiso (tabla `permiso`) que el rol necesita para ver el modulo. */
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
      { to: '/app/categorias', icon: 'category', label: 'Categorías', permiso: 'Categorías' },
      { to: '/app/productos', icon: 'shirt', label: 'Productos', permiso: 'Productos' },
      { to: '/app/variantes', icon: 'box', label: 'Variante producto', permiso: 'Variante producto' },
      { to: '/app/proveedores', icon: 'truck', label: 'Proveedores', permiso: 'Proveedores' },
      { to: '/app/compras', icon: 'cart', label: 'Compras', permiso: 'Compras' },
    ],
  },
  {
    section: 'Ventas',
    items: [
      { to: '/app/clientes', icon: 'users', label: 'Clientes', permiso: 'Clientes' },
      { to: '/app/pedidos', icon: 'clipboard', label: 'Pedidos', permiso: 'Pedidos' },
      { to: '/app/abonos', icon: 'coin', label: 'Abonos', permiso: 'Abonos' },
    ],
  },
];

/** Barra inferior movil (punto 4c): maximo 5 accesos. */
export const BOTTOM = [
  { to: '/app', icon: 'home', label: 'Inicio', end: true },
  { to: '/app/compras', icon: 'cart', label: 'Compras', permiso: 'Compras' },
  { to: '/app/abonos', icon: 'dollar', label: 'Abonos', permiso: 'Abonos' },
  { to: '/app/pedidos', icon: 'clipboard', label: 'Pedidos', permiso: 'Pedidos' },
  { to: '/app/cuenta', icon: 'user', label: 'Cuenta' },
];
