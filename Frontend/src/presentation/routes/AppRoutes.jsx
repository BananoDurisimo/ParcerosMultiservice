import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AppLayout from '@presentation/widgets/layout/AppLayout.jsx';
import NotFound from '@presentation/pages/NotFound.jsx';
import Licencias from '@presentation/pages/Licencias.jsx';
import Home from '@presentation/pages/home/Home.jsx';

/* El sitio publico carga de inmediato; cada pantalla del sistema se descarga
   la primera vez que se visita, para que la pagina de inicio no cargue con
   el codigo de todos los modulos. */
const Login = lazy(() => import('@presentation/pages/auth/Login.jsx'));
const Recuperar = lazy(() => import('@presentation/pages/auth/Recuperar.jsx'));
const Cuenta = lazy(() => import('@presentation/pages/auth/Cuenta.jsx'));
const Dashboard = lazy(() => import('@presentation/pages/dashboard/Dashboard.jsx'));
const Roles = lazy(() => import('@presentation/pages/configuracion/Roles.jsx'));
const Usuarios = lazy(() => import('@presentation/pages/configuracion/Usuarios.jsx'));
const CategoriasInsumo = lazy(() => import('@presentation/pages/compras/CategoriasInsumo.jsx'));
const Insumos = lazy(() => import('@presentation/pages/compras/Insumos.jsx'));
const Proveedores = lazy(() => import('@presentation/pages/compras/Proveedores.jsx'));
const Compras = lazy(() => import('@presentation/pages/compras/Compras.jsx'));
const Clientes = lazy(() => import('@presentation/pages/ventas/Clientes.jsx'));
const Pedidos = lazy(() => import('@presentation/pages/ventas/Pedidos.jsx'));
const Abonos = lazy(() => import('@presentation/pages/ventas/Abonos.jsx'));
const CategoriasProducto = lazy(() => import('@presentation/pages/productos/CategoriasProducto.jsx'));
const Productos = lazy(() => import('@presentation/pages/productos/Productos.jsx'));

/**
 * Mapa de rutas. Cada bloque corresponde a un macroproceso (feature) y el
 * orden es el mismo del menu lateral (core/constants/nav.js).
 */
export default function AppRoutes() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={null}>
      <Routes>
        {/* Publico */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/licencias" element={<Licencias publico />} />

        {/* Privado */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />

          {/* Configuracion */}
          <Route path="roles" element={<Roles />} />
          <Route path="usuarios" element={<Usuarios />} />

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
          <Route path="licencias" element={<Licencias />} />
        </Route>

        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
