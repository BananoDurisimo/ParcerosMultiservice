import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AppLayout from '@shared/components/layout/AppLayout.jsx';
import NotFound from '@app/pages/NotFound.jsx';

import { Home } from '@features/home';
import { Login, Recuperar, Cuenta } from '@features/auth';
import { Dashboard } from '@features/dashboard';
import { Roles, Usuarios, Movimientos } from '@features/configuracion';
import { Insumos, Categorias, Productos, Proveedores, Compras } from '@features/compras';
import { Clientes, Pedidos, Abonos } from '@features/ventas';

/**
 * Mapa de rutas. Cada bloque corresponde a un macroproceso (feature) y el
 * orden es el mismo del menu lateral (shared/data/nav.js).
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
          <Route path="insumos" element={<Insumos />} />
          <Route path="categorias" element={<Categorias />} />
          <Route path="productos" element={<Productos />} />
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="compras" element={<Compras />} />

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
