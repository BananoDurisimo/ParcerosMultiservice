import { Link } from 'react-router-dom';
import Icon from '@shared/components/Icon.jsx';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="center anim-page" style={{ maxWidth: 430 }}>
        <div style={{ fontSize: 74, fontWeight: 700, letterSpacing: '-3px', color: 'var(--primary)' }}>404</div>
        <h1 style={{ marginTop: 6 }}>Página no encontrada</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          La dirección que intenta abrir no existe o fue movida dentro del sistema.
        </p>
        <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 20 }}>
          <Link className="btn btn-primary" to="/app"><Icon name="home" size={16} /> Ir al dashboard</Link>
          <Link className="btn" to="/"><Icon name="chevL" size={16} /> Sitio público</Link>
        </div>
      </div>
    </div>
  );
}
