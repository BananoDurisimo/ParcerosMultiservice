import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import BottomBar from './BottomBar.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';

const TITULOS = {
  '/app': 'Dashboard',
  '/app/roles': 'Roles',
  '/app/usuarios': 'Usuarios',
  '/app/insumos': 'Insumos',
  '/app/categorias': 'Categorías',
  '/app/productos': 'Productos',
  '/app/proveedores': 'Proveedores',
  '/app/compras': 'Compras',
  '/app/clientes': 'Clientes',
  '/app/pedidos': 'Pedidos',
  '/app/abonos': 'Abonos',
  '/app/cuenta': 'Mi cuenta',
};

export default function AppLayout() {
  const { isAuth } = useAuth();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { setDrawer(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }, [loc.pathname]);

  if (!isAuth) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;

  return (
    <div className="app">
      <div className="app-body">
        <Sidebar
          collapsed={collapsed}
          open={drawer}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          onClose={() => setDrawer(false)}
        />
        {drawer && <div className="drawer-backdrop" onClick={() => setDrawer(false)} />}

        <div className={`main ${collapsed ? 'is-wide' : ''}`}>
          <TopBar titulo={TITULOS[loc.pathname] || 'Parceros Multiservice'} onOpenMenu={() => setDrawer(true)} />
          <main className="content" key={loc.pathname}>
            <Outlet />
          </main>
        </div>
      </div>
      <BottomBar />
    </div>
  );
}
