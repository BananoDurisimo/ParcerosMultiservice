/** Menu de macroprocesos (punto 2 y 4 de la guia). */
export const NAV = [
  { section: null, items: [{ to: '/app', icon: 'home', label: 'Inicio', end: true }] },
  {
    section: 'Configuración',
    items: [
      { to: '/app/roles', icon: 'shield', label: 'Roles' },
      { to: '/app/usuarios', icon: 'user', label: 'Usuarios' },
      { to: '/app/movimientos', icon: 'history', label: 'Movimientos' },
    ],
  },
  {
    section: 'Compras',
    items: [
      { to: '/app/insumos', icon: 'package', label: 'Insumos' },
      { to: '/app/categorias', icon: 'category', label: 'Categorías' },
      { to: '/app/productos', icon: 'shirt', label: 'Productos' },
      { to: '/app/proveedores', icon: 'truck', label: 'Proveedores' },
      { to: '/app/compras', icon: 'cart', label: 'Compras' },
    ],
  },
  {
    section: 'Ventas',
    items: [
      { to: '/app/clientes', icon: 'users', label: 'Clientes' },
      { to: '/app/pedidos', icon: 'clipboard', label: 'Pedidos' },
      { to: '/app/abonos', icon: 'coin', label: 'Abonos' },
    ],
  },
];

/** Barra inferior movil (punto 4c): maximo 5 accesos. */
export const BOTTOM = [
  { to: '/app', icon: 'home', label: 'Inicio', end: true },
  { to: '/app/compras', icon: 'cart', label: 'Compras' },
  { to: '/app/abonos', icon: 'dollar', label: 'Abonos' },
  { to: '/app/pedidos', icon: 'clipboard', label: 'Pedidos' },
  { to: '/app/cuenta', icon: 'user', label: 'Cuenta' },
];
