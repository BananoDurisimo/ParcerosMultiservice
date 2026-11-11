import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import Icon from '@core/widgets/Icon.jsx';
import Logo from '@core/widgets/Logo.jsx';
import { NAV } from '@core/constants/nav.js';
import { useAuth } from '@presentation/blocs/AuthContext.jsx';

export default function Sidebar({ collapsed, open, onToggleCollapse, onClose }) {
  const { puede } = useAuth();
  const loc = useLocation();

  /* Con el menu contraido solo se ven los iconos: al pasar el mouse (o el
     foco del teclado) se muestra el nombre del modulo al lado. Se dibuja
     fuera del menu, en una capa fija, porque el menu tiene su propio scroll
     y lo recortaria. */
  const [tip, setTip] = useState(null);
  const mostrarTip = (texto) => (e) => {
    if (!collapsed) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ texto, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const ocultarTip = () => setTip(null);
  const conTip = (texto) => ({
    onMouseEnter: mostrarTip(texto), onMouseLeave: ocultarTip, onFocus: mostrarTip(texto), onBlur: ocultarTip,
    'aria-label': collapsed ? texto : undefined,
  });

  /* Etapa abierta de Pedidos: la de la direccion o, sin ella, la primera
     que el rol puede ver (la misma que abre la pagina). */
  const hijoActivo = (it) => {
    if (loc.pathname !== it.to) return null;
    const visibles = it.hijos.filter((h) => puede(h.permiso));
    const vista = new URLSearchParams(loc.search).get('vista');
    return (visibles.find((h) => h.vista === vista) || visibles[0])?.vista;
  };

  /* Cada categoria es un desplegable y solo una queda abierta, para no tener
     que desplazarse por todo el menu. Se abre sola la del modulo actual. */
  const grupoDe = (path) => NAV.find((g) => g.items.some((it) => it.to === path))?.section;
  const [abierto, setAbierto] = useState(() => grupoDe(loc.pathname));
  useEffect(() => {
    const g = grupoDe(loc.pathname);
    if (g) setAbierto(g);
  }, [loc.pathname]);

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

      <nav className="sidebar-nav" onScroll={ocultarTip}>
        {NAV.map((grupo, gi) => {
          const items = grupo.items.filter((it) => puede(it.permiso));
          if (!items.length) return null;
          const cerrado = !!grupo.section && abierto !== grupo.section;
          return (
            <div key={gi} className={`nav-grupo ${cerrado ? 'is-closed' : ''}`}>
              {grupo.section && (
                <button
                  type="button"
                  className="nav-section"
                  aria-expanded={!cerrado}
                  onClick={() => setAbierto(cerrado ? grupo.section : null)}
                >
                  {grupo.section} <Icon name="chevD" size={13} />
                </button>
              )}
              <div className="nav-grupo-items">
              {items.map((it) => (
                <div key={it.to}>
                  <NavLink
                    to={it.to}
                    end={it.end}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    onClick={onClose}
                    {...conTip(it.label)}
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
            </div>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <NavLink to="/app/cuenta" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose} style={{ borderRadius: 8 }} {...conTip('Cuenta')}>
          <Icon name="settings" size={18} />
          <span>Cuenta</span>
        </NavLink>
      </div>

      {collapsed && tip && createPortal(
        <div className="sb-tip" role="tooltip" style={{ top: tip.top, left: tip.left }}>{tip.texto}</div>,
        document.body
      )}
    </aside>
  );
}
