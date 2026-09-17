import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '@shared/components/Icon.jsx';
import ThemeToggle from '@shared/components/ui/ThemeToggle.jsx';
import ConfirmDialog from '@shared/components/ui/ConfirmDialog.jsx';
import { useAuth, iniciales } from '@shared/context/AuthContext.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';

const TONO_ICO = { error: 'xC', warning: 'alert', info: 'info', success: 'checkC' };

export default function TopBar({ titulo, onOpenMenu }) {
  const { user, logout } = useAuth();
  const { notificaciones } = useData();
  const toast = useToast();
  const nav = useNavigate();
  const [openBell, setOpenBell] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const [leidas, setLeidas] = useState(false);
  const [confirmSalir, setConfirmSalir] = useState(false);
  const bellRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setOpenBell(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pedirSalir = () => {
    setOpenMenu(false);
    setOpenBell(false);
    setConfirmSalir(true);
  };

  const salir = () => {
    setConfirmSalir(false);
    logout();
    toast.info('Su sesión se cerró correctamente.', 'Sesión finalizada');
    nav('/login', { replace: true });
  };

  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onOpenMenu} aria-label="Abrir menú" style={{ display: 'none' }} data-mobile-menu>
        <Icon name="menu" size={20} />
      </button>
      <style>{`@media (max-width: 900px){ [data-mobile-menu]{ display:inline-flex !important; } }`}</style>

      <Link to="/app" className="icon-btn" title="Inicio" aria-label="Inicio">
        <Icon name="home" size={19} />
      </Link>
      <span className="title" style={{ marginLeft: 4 }}>{titulo}</span>

      <div className="grow" />

      <ThemeToggle />

      <div className="dropdown" ref={bellRef}>
        <button
          className="icon-btn"
          onClick={() => { setOpenBell((v) => !v); setOpenMenu(false); setLeidas(true); }}
          aria-label="Notificaciones"
        >
          <Icon name="bell" size={19} />
          {!leidas && notificaciones.length > 0 && <span className="bell-dot" />}
        </button>

        {openBell && (
          <div className="dropdown-menu notif-panel">
            <div className="notif-head">
              <strong style={{ fontSize: 13.5 }}>Notificaciones</strong>
              <span className="badge badge-primary">{notificaciones.length}</span>
            </div>
            <div className="notif-list">
              {notificaciones.length === 0 && <div className="empty" style={{ padding: 28 }}>Sin notificaciones</div>}
              {notificaciones.map((n) => (
                <div className="notif-item" key={n.id}>
                  <div className="notif-ico" style={{ background: `var(--${n.tipo}-bg)`, color: `var(--${n.tipo}-fg)` }}>
                    <Icon name={TONO_ICO[n.tipo]} size={16} />
                  </div>
                  <div className="grow">
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{n.titulo}</div>
                    <div className="caption">{n.texto}</div>
                    <div className="caption" style={{ opacity: .75, marginTop: 2 }}>{n.tiempo}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: 8, borderTop: '1px solid var(--border-soft)' }}>
              <button className="btn btn-sm btn-block btn-ghost" onClick={() => setOpenBell(false)}>Cerrar</button>
            </div>
          </div>
        )}
      </div>

      <div className="dropdown" ref={menuRef}>
        <button className="profile-btn" onClick={() => { setOpenMenu((v) => !v); setOpenBell(false); }}>
          <span className="avatar">{iniciales(user?.nombre)}</span>
          <span style={{ fontSize: 13 }} className="hide-sm">{user?.nombre?.split(' ').slice(0, 2).join(' ')}</span>
          <Icon name="chevD" size={14} />
        </button>
        {openMenu && (
          <div className="dropdown-menu" onClick={() => setOpenMenu(false)}>
            <div style={{ padding: '8px 11px' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.nombre}</div>
              <div className="caption">{user?.rol}</div>
            </div>
            <div className="dropdown-sep" />
            <Link className="dropdown-item" to="/app/cuenta"><Icon name="user" size={16} /> Mi perfil</Link>
            <Link className="dropdown-item" to="/app"><Icon name="home" size={16} /> Inicio</Link>
            <Link className="dropdown-item" to="/"><Icon name="sparkle" size={16} /> Sitio público</Link>
            <div className="dropdown-sep" />
            <button className="dropdown-item danger" onClick={pedirSalir}><Icon name="logout" size={16} /> Cerrar sesión</button>
          </div>
        )}
      </div>
      <style>{`@media (max-width: 640px){ .hide-sm{ display:none; } }`}</style>

      <ConfirmDialog
        open={confirmSalir}
        onClose={() => setConfirmSalir(false)}
        onConfirm={salir}
        titulo="Cerrar sesión"
        mensaje="¿Desea cerrar la sesión actual? Deberá ingresar nuevamente sus credenciales para acceder al sistema."
        confirmLabel="Cerrar sesión"
        tono="warning"
      />
    </header>
  );
}
