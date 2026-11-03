import { NavLink } from 'react-router-dom';
import Icon from '@core/widgets/Icon.jsx';
import { BOTTOM } from '@core/constants/nav.js';
import { useAuth } from '@presentation/blocs/AuthContext.jsx';

/** Punto 4c: navegacion inferior en mobile (maximo 5 accesos). */
export default function BottomBar() {
  const { puede } = useAuth();

  return (
    <nav className="bottombar" aria-label="Navegación inferior">
      {BOTTOM.filter((it) => puede(it.permiso)).map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `bb-item ${isActive ? 'active' : ''}`}>
          <Icon name={it.icon} size={21} />
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}
