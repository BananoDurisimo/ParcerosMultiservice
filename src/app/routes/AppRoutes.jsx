import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AppLayout from '@shared/components/layout/AppLayout.jsx';
import NotFound from '@app/pages/NotFound.jsx';
import { Home } from '@features/home';

/* El sitio publico carga de inmediato; el resto se descarga por
   funcionalidad la primera vez que se visita (un archivo por macroproceso),
   para que la pagina de inicio no cargue con el codigo de todo el sistema. */
const de = (cargar, nombre) => lazy(() => cargar().then((m) => ({ default: m[nombre] })));
const auth = () => import('@features/auth');
const configuracion = () => import('@features/configuracion');
const compras = () => import('@features/compras');
const ventas = () => import('@features/ventas');
const productos = () => import('@features/productos');

const Login = de(auth, 'Login');
const Recuperar = de(auth, 'Recuperar');
const Cuenta = de(auth, 'Cuenta');
const Dashboard = de(() => import('@features/dashboard'), 'Dashboard');
const Roles = de(configuracion, 'Roles');
const Usuarios = de(configuracion, 'Usuarios');
const Movimientos = de(configuracion, 'Movimientos');
const CategoriasInsumo = de(compras, 'CategoriasInsumo');
const Insumos = de(compras, 'Insumos');
const Proveedores = de(compras, 'Proveedores');
const Compras = de(compras, 'Compras');
const Clientes = de(ventas, 'Clientes');
const Pedidos = de(ventas, 'Pedidos');
const Abonos = de(ventas, 'Abonos');
const CategoriasProducto = de(productos, 'CategoriasProducto');
const Productos = de(productos, 'Productos');

/**
 * Mapa de rutas. Cada bloque corresponde a un macroproceso (feature) y el
 * orden es el mismo del menu lateral (shared/data/nav.js).
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
      </Suspense>
    </BrowserRouter>
  );
}
