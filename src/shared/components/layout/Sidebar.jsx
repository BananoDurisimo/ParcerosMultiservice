import { NavLink, useLocation } from 'react-router-dom';
import Icon from '@shared/components/Icon.jsx';
import Logo from '@shared/components/Logo.jsx';
import { NAV } from '@shared/data/nav.js';
import { useAuth } from '@shared/context/AuthContext.jsx';

export default function Sidebar({ collapsed, open, onToggleCollapse, onClose }) {
  const { puede } = useAuth();
  const loc = useLocation();

  /* Etapa abierta de Pedidos: la de la direccion o, sin ella, la primera
     que el rol puede ver (la misma que abre la pagina). */
  const hijoActivo = (it) => {
    if (loc.pathname !== it.to) return null;
    const visibles = it.hijos.filter((h) => puede(h.permiso));
    const vista = new URLSearchParams(loc.search).get('vista');
    return (visibles.find((h) => h.vista === vista) || visibles[0])?.vista;
  };

  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${open ? 'is-open' : ''}`}>
      <div className="sidebar-top">
        <button className="icon-btn" onClick={onToggleCollapse} aria-label="Colapsar menú">
          <Icon name="menu" size={19} />
        </button>
        <div className="brand">
          <Logo className="brand-mark" />
          <div className="brand-name">
            Parceros
            <small>Multiservice</small>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((grupo, gi) => {
          const items = grupo.items.filter((it) => puede(it.permiso));
          if (!items.length) return null;
          return (
            <div key={gi}>
              {grupo.section && <div className="nav-section">{grupo.section}</div>}
              {items.map((it) => (
                <div key={it.to}>
                  <NavLink
                    to={it.to}
                    end={it.end}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    onClick={onClose}
                    title={it.label}
                  >
                    <Icon name={it.icon} size={18} />
                    <span>{it.label}</span>
                  </NavLink>
                  {it.hijos && !collapsed && (
                    <div className="nav-hijos">
                      {it.hijos.filter((h) => puede(h.permiso)).map((h) => (
                        <NavLink
                          key={h.vista}
                          to={`${it.to}?vista=${h.vista}`}
                          className={() => `nav-hijo ${hijoActivo(it) === h.vista ? 'active' : ''}`}
                          onClick={onClose}
                        >
                          {h.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <NavLink to="/app/cuenta" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose} style={{ borderRadius: 8 }}>
          <Icon name="settings" size={18} />
          <span>Cuenta</span>
        </NavLink>
      </div>
    </aside>
  );
}
