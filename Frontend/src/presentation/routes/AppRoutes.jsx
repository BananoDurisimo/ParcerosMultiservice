import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AppLayout from '@presentation/widgets/layout/AppLayout.jsx';
import NotFound from '@presentation/pages/NotFound.jsx';

import Home from '@presentation/pages/home/Home.jsx';
import Login from '@presentation/pages/auth/Login.jsx';
import Recuperar from '@presentation/pages/auth/Recuperar.jsx';
import Cuenta from '@presentation/pages/auth/Cuenta.jsx';
import Dashboard from '@presentation/pages/dashboard/Dashboard.jsx';
import Roles from '@presentation/pages/configuracion/Roles.jsx';
import Usuarios from '@presentation/pages/configuracion/Usuarios.jsx';
import Movimientos from '@presentation/pages/configuracion/Movimientos.jsx';
import CategoriasInsumo from '@presentation/pages/compras/CategoriasInsumo.jsx';
import Insumos from '@presentation/pages/compras/Insumos.jsx';
import Proveedores from '@presentation/pages/compras/Proveedores.jsx';
import Compras from '@presentation/pages/compras/Compras.jsx';
import Clientes from '@presentation/pages/ventas/Clientes.jsx';
import Pedidos from '@presentation/pages/ventas/Pedidos.jsx';
import Abonos from '@presentation/pages/ventas/Abonos.jsx';
import CategoriasProducto from '@presentation/pages/productos/CategoriasProducto.jsx';
import Productos from '@presentation/pages/productos/Productos.jsx';

/**
 * Mapa de rutas. Cada bloque corresponde a un macroproceso (feature) y el
 * orden es el mismo del menu lateral (core/constants/nav.js).
 */
export default function AppRoutes() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Publico */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar" element={<Recuperar />} />

        {/* Privado */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />

          {/* Configuracion */}
          <Route path="roles" element={<Roles />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="movimientos" element={<Movimientos />} />

          {/* Compras */}
          <Route path="categorias-insumo" element={<CategoriasInsumo />} />
          <Route path="insumos" element={<Insumos />} />
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="compras" element={<Compras />} />

          {/* Productos */}
          <Route path="categorias-producto" element={<CategoriasProducto />} />
          <Route path="productos" element={<Productos />} />

          {/* Ventas */}
          <Route path="clientes" element={<Clientes />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="abonos" element={<Abonos />} />

          <Route path="cuenta" element={<Cuenta />} />
        </Route>

        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
