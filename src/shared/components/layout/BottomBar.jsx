import { NavLink } from 'react-router-dom';
import Icon from '@shared/components/Icon.jsx';
import { BOTTOM } from '@shared/data/nav.js';

/** Punto 4c: navegacion inferior en mobile (maximo 5 accesos). */
export default function BottomBar() {
  return (
    <nav className="bottombar" aria-label="Navegación inferior">
      {BOTTOM.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `bb-item ${isActive ? 'active' : ''}`}>
          <Icon name={it.icon} size={21} />
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}
