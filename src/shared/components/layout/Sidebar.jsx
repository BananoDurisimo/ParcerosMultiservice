import { NavLink } from 'react-router-dom';
import Icon from '@shared/components/Icon.jsx';
import Logo from '@shared/components/Logo.jsx';
import { NAV } from '@shared/data/nav.js';
import { useAuth } from '@shared/context/AuthContext.jsx';

export default function Sidebar({ collapsed, open, onToggleCollapse, onClose }) {
  const { puede } = useAuth();

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
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                  title={it.label}
                >
                  <Icon name={it.icon} size={18} />
                  <span>{it.label}</span>
                </NavLink>
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
