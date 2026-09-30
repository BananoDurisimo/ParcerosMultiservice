import Icon from '@shared/components/Icon.jsx';
import Logo from '@shared/components/Logo.jsx';
import { IG_PERFIL, IG_FACEBOOK } from '@features/home/data/instagram.js';
import { waLink } from '@features/home/data/contacto.js';

const AYUDA = [
  ['FAQ', '#faq'],
  ['Servicio al cliente', '#contacto'],
  ['Cómo comprar', '#nosotros'],
  ['Contáctanos', '#contacto'],
];

const OTROS = [
  ['Política de privacidad', '#privacidad'],
  ['Mapa del sitio', '#nosotros'],
  ['Suscripciones', '#redes'],
];

const REDES = [
  ['facebook', 'Facebook', IG_FACEBOOK],
  ['instagram', 'Instagram', IG_PERFIL],
  ['whatsapp', 'WhatsApp', waLink()],
];

/** Punto 6: pie de pagina institucional. */
export default function Footer({ compact = false }) {
  if (compact) {
    return (
      <footer className="footer">
        <div className="footer-inner center">
          <Logo className="footer-logo" size={62} radius={12} style={{ margin: '0 auto' }} />
          <p style={{ color: '#C3CAD5', fontSize: 13, marginTop: 12 }}>Fabricamos uniformes deportivos 100% personalizados.</p>
          <div className="row" style={{ justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
            {AYUDA.map(([t, h]) => <a key={t} href={h}>{t}</a>)}
          </div>
          <div className="social" style={{ justifyContent: 'center' }}>
            {REDES.map(([ico, l, h]) => (
              <a key={ico} href={h} target="_blank" rel="noreferrer" aria-label={l}><Icon name={ico} size={16} /></a>
            ))}
          </div>
          <div className="footer-bottom" style={{ justifyContent: 'center' }}>
            <span>Equipo de Desarrollo VP · © 2026 Parceros Multiservice</span>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-cols">
          <div className="footer-brand">
            <p className="footer-eslogan">
              Uniformes deportivos 100% personalizados, hechos en Nicaragua para su equipo o club.
            </p>
            <Logo className="footer-logo" size={62} radius={12} />
            <div className="social">
              {REDES.map(([ico, l, h]) => (
                <a key={ico} href={h} target="_blank" rel="noreferrer" aria-label={l}><Icon name={ico} size={16} /></a>
              ))}
            </div>
          </div>

          <div className="grow" />

          <div>
            <h4>Ayuda</h4>
            <ul>{AYUDA.map(([t, h]) => <li key={t}><a href={h}>{t}</a></li>)}</ul>
          </div>

          <div>
            <h4>Otros</h4>
            <ul>
              {OTROS.map(([t, h]) => <li key={t}><a href={h}>{t}</a></li>)}
              <li className="row" style={{ gap: 6 }}><Icon name="pin" size={14} /> Managua, Nicaragua</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="row" style={{ gap: 8 }}>
            Equipo de Desarrollo VP
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--primary)', display: 'grid', placeItems: 'center', color: '#fff' }} aria-label="LinkedIn">
              <Icon name="linkedin" size={13} />
            </a>
          </span>
          <span>© 2026 Parceros Multiservice. Todos los derechos reservados.</span>
        </div>
      </div>
    </footer>
  );
}
