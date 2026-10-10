import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import BottomBar from './BottomBar.jsx';
import Icon from '@shared/components/Icon.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { NAV } from '@shared/data/nav.js';

const RUTAS = NAV.flatMap((g) => g.items);

const TITULOS = {
  '/app': 'Dashboard',
  '/app/roles': 'Roles',
  '/app/usuarios': 'Usuarios',
  '/app/movimientos': 'Movimientos',
  '/app/insumos': 'Insumos',
  '/app/proveedores': 'Proveedores',
  '/app/compras': 'Compras',
  '/app/categorias-producto': 'Categorías de producto',
  '/app/productos': 'Productos',
  '/app/clientes': 'Clientes',
  '/app/pedidos': 'Pedidos',
  '/app/abonos': 'Abonos',
  '/app/cuenta': 'Mi cuenta',
};

/** Se muestra cuando el rol del usuario no tiene el permiso del modulo. */
function SinAcceso() {
  return (
    <div className="card empty anim-page">
      <div className="ico-wrap"><Icon name="lock" size={22} /></div>
      <div style={{ fontWeight: 500, color: 'var(--text)' }}>Acceso restringido</div>
      <p className="caption" style={{ marginTop: 4 }}>Su rol no tiene permiso para este módulo. Solicite el acceso al administrador.</p>
    </div>
  );
}

/** Mientras llegan los datos de la API. El plan gratuito de Render apaga el
 *  servidor si nadie lo usa y la primera peticion puede tardar casi un minuto. */
function CargandoDatos() {
  const { estadoDatos, errorDatos, cargar } = useData();
  const { logout } = useAuth();
  const fallo = estadoDatos === 'error';
  return (
    <div className="carga-datos" role="status" aria-live="polite">
      <div className="card card-pad carga-datos-card">
        {fallo ? <Icon name="alert" size={26} /> : <span className="carga-spinner" aria-hidden="true" />}
        <strong>{fallo ? 'No fue posible cargar los datos' : 'Conectando con el servidor…'}</strong>
        <p className="caption">
          {fallo ? errorDatos : 'Si el servidor estaba en reposo puede tardar hasta un minuto la primera vez.'}
        </p>
        {fallo && (
          <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={cargar}><Icon name="refresh" size={15} /> Reintentar</button>
            <button className="btn" onClick={logout}>Cerrar sesión</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { isAuth, puede, cargandoSesion } = useAuth();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { setDrawer(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }, [loc.pathname]);

  if (!isAuth) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (cargandoSesion) return <CargandoDatos />;

  const ruta = RUTAS.find((it) => it.to === loc.pathname);
  const permitido = !ruta || puede(ruta.permiso);

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
            {permitido ? <Outlet /> : <SinAcceso />}
          </main>
        </div>
      </div>
      <BottomBar />
    </div>
  );
}
