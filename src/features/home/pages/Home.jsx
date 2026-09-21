import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@shared/components/Icon.jsx';
import Logo from '@shared/components/Logo.jsx';
import Carousel from '@shared/components/ui/Carousel.jsx';
import IgPost from '@shared/components/ui/IgPost.jsx';
import ThemeToggle from '@shared/components/ui/ThemeToggle.jsx';
import Footer from '@shared/components/layout/Footer.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';
import { IG_POSTS, IG_PERFIL, IG_USUARIO } from '@features/home/data/instagram.js';
import { SLIDES_INICIO } from '@features/home/data/carrusel.js';

/* Fotografia de referencia (Pexels, licencia libre). Ver src/assets/home/CREDITOS.md */
import imgTaller from '@features/home/assets/taller.jpg';

const FAQ = [
  { q: '¿Cuál es el tiempo de entrega?', a: 'Entre 7 y 12 días hábiles después de aprobado el diseño y registrado el abono inicial. En temporada alta le confirmamos la fecha exacta en la cotización.' },
  { q: '¿Qué deportes trabajan?', a: 'Fútbol, baloncesto, béisbol, softbol, voleibol, ciclismo y running, además de ropa de entrenamiento y calentamiento para clubes, ligas y academias.' },
  { q: '¿Cuál es la cantidad mínima de pedido?', a: 'Diez uniformes por diseño. Para reponer prendas de un equipo que ya fabricamos aceptamos pedidos desde una unidad.' },
  { q: '¿Incluyen el nombre y el número de cada jugador?', a: 'Sí. Cada prenda sale con el nombre, el número y el escudo que indique en la lista del equipo, sin costo adicional.' },
  { q: '¿Cómo se realiza el pago?', a: 'Con un abono del 50% se confirma el pedido y se reservan los insumos; el saldo se cancela contra entrega. Aceptamos efectivo, transferencia y tarjeta.' },
  { q: '¿Puedo enviar mi propio diseño?', a: 'Sí. Recibimos el diseño o el escudo del equipo en formato vectorial o de alta resolución y le enviamos una prueba digital antes de producir.' },
  { q: '¿Hacen envíos fuera de Managua?', a: 'Sí, despachamos a todo el país por encomienda. El costo del envío se agrega a la cotización según el destino.' },
  { q: '¿Puedo seguir el estado de mi pedido?', a: 'Sí. Cada pedido queda registrado en el sistema y le informamos su avance: cotización aprobada, en proceso, completado y entregado.' },
];

const CONTACTO = [
  { icon: 'phone', l: 'Teléfono', v: '+505 8455 2210', sub: 'Lunes a sábado · 8:00 a.m. – 5:00 p.m.', href: 'tel:+50584552210' },
  { icon: 'mail', l: 'Correo', v: 'ventas@parceros.ni', sub: 'Respondemos dentro de las 24 horas.', href: 'mailto:ventas@parceros.ni' },
  { icon: 'pin', l: 'Dirección', v: 'Bo. Monseñor Lezcano, Managua', sub: 'De la iglesia 2 c. al sur, 1 c. abajo.', href: 'https://maps.google.com/?q=Monse%C3%B1or+Lezcano+Managua' },
];

export default function Home() {
  const { isAuth } = useAuth();
  const toast = useToast();
  const [abierta, setAbierta] = useState(0);

  return (
    <div className="landing">
      {/* Franja de eslogan */}
      <div className="lp-strip">
        <Icon name="sparkle" size={13} />
        Uniformes deportivos 100% personalizados, hechos en Nicaragua para su equipo
      </div>

      {/* Barra de navegación */}
      <header className="pub-nav">
        <Link className="brand" to="/">
          <Logo className="brand-mark" />
          <div className="brand-name">Parceros<small>Multiservice</small></div>
        </Link>
        <div className="grow" />
        <nav className="pub-links hide-xs">
          <a href="#nosotros">Nosotros</a>
          <a href="#redes">Redes Sociales</a>
          <a href="#faq">Preguntas Frecuentes</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <ThemeToggle />
        <Link className="btn btn-primary btn-sm" to={isAuth ? '/app' : '/login'}>
          <Icon name="lock" size={15} /> {isAuth ? 'Ir al sistema' : 'Iniciar sesión'}
        </Link>
      </header>

      {/* Encabezado + carrusel principal */}
      <section className="lp-hero">
        <div className="lp-wrap">
          <h1 className="lp-title anim-page">
            Parceros
            <span>Multiservice</span>
          </h1>

          <Carousel
            className="hero-carousel anim-page"
            ariaLabel="Nuestros trabajos"
            items={SLIDES_INICIO}
            auto={6000}
            render={(s) => (
              <article className="slide has-img">
                <img className="slide-img" src={s.img} alt={s.alt} loading="lazy" />
                <div className="slide-body">
                  <a className="slide-eyebrow" href={s.enlace} target="_blank" rel="noreferrer">
                    <Icon name="instagram" size={13} /> @{IG_USUARIO}
                  </a>
                  {s.titulo && <h2>{s.titulo}</h2>}
                  <button
                    className="btn btn-sm slide-btn"
                    onClick={() => toast.success('Un asesor comercial se pondrá en contacto con usted.', 'Solicitud enviada')}
                  >
                    <Icon name="send" size={15} /> Solicitar cotización
                  </button>
                </div>
              </article>
            )}
          />
        </div>
      </section>

      {/* Sobre la empresa */}
      <section className="section lp-about" id="nosotros">
        <div className="lp-wrap">
          <div className="about-grid">
            <div className="about-text">
              <h2>Uniformes deportivos <span className="grad">100% personalizados</span></h2>
              <p>
                Parceros Multiservice es un taller nicaragüense con más de ocho años dedicado solo a
                uniformes deportivos: vestimos a clubes, ligas, academias y equipos de barrio. Trabajamos
                con telas deportivas como Dry-Fit, licra y mesh, con sublimación full color y bordado
                propio, de modo que cada uniforme sale con el diseño exacto que el equipo aprobó.
              </p>
              <ul className="about-list">
                {[
                  ['Diseño del uniforme', 'Elaboramos la propuesta con los colores y el escudo del equipo, sin costo adicional.'],
                  ['Nombre y número', 'Cada prenda se personaliza con el nombre y el número de cada jugador.'],
                  ['Todas las categorías', 'De XS a XXL, con cortes infantiles, juveniles, femeninos y masculinos.'],
                ].map(([t, d]) => (
                  <li key={t}>
                    <Icon name="checkC" size={18} />
                    <div><strong>{t}</strong><span>{d}</span></div>
                  </li>
                ))}
              </ul>
              <div className="row" style={{ gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
                <a className="btn btn-primary" href="#contacto"><Icon name="mail" size={16} /> Contáctenos</a>
                <Link className="btn" to={isAuth ? '/app' : '/login'}><Icon name="lock" size={16} /> Acceso empleados</Link>
              </div>
            </div>

            <div className="about-media">
              <figure className="about-img">
                <img src={imgTaller} alt="Corte de tela sobre la mesa de trabajo, junto a la máquina de coser" loading="lazy" />
                <figcaption>Taller Parceros Multiservice</figcaption>
              </figure>
              <div className="about-stats">
                {[['+120', 'Equipos'], ['+8', 'Años'], ['+15K', 'Uniformes']].map(([n, l]) => (
                  <div key={l}><strong>{n}</strong><span>{l}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Instagram */}
      <section className="section lp-ig" id="redes">
        <div className="lp-wrap">
          <div className="section-title">
            <h2 className="row" style={{ justifyContent: 'center', gap: 9 }}>
              <Icon name="instagram" size={22} /> Instagram
            </h2>
            <p>Estas son las publicaciones de nuestra cuenta oficial, tal como aparecen en Instagram.</p>
          </div>

          <a className="card card-hover ig-perfil" href={IG_PERFIL} target="_blank" rel="noreferrer">
            <Logo size={52} radius={99} />
            <div className="ig-perfil-txt">
              <strong>@{IG_USUARIO}</strong>
              <span>Uniformes deportivos personalizados · Managua, Nicaragua</span>
            </div>
            <span className="btn btn-primary btn-sm">
              <Icon name="instagram" size={15} /> Seguir
            </span>
          </a>

          <Carousel
            className="ig-carousel"
            ariaLabel="Publicaciones de Instagram"
            items={IG_POSTS}
            perView={3}
            perViewSm={1}
            auto={6500}
            render={(p) => <IgPost post={p} />}
          />
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section className="section lp-faq" id="faq">
        <div className="lp-wrap">
          <div className="section-title">
            <h2>Preguntas frecuentes</h2>
            <p>Lo que más nos consultan antes de encargar un pedido.</p>
          </div>
          <div className="faq-grid">
            {FAQ.map((f, n) => (
              <div className={`card faq-item ${abierta === n ? 'on' : ''}`} key={f.q}>
                <button
                  className="faq-q"
                  onClick={() => setAbierta(abierta === n ? -1 : n)}
                  aria-expanded={abierta === n}
                >
                  <span>{f.q}</span>
                  <Icon name={abierta === n ? 'chevU' : 'chevD'} size={16} />
                </button>
                {abierta === n && <p className="faq-a anim-in">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Información de contacto */}
      <section className="section" id="contacto">
        <div className="lp-wrap">
          <div className="section-title">
            <h2>Información de contacto</h2>
            <p>Escríbanos o visítenos; con gusto le preparamos una cotización sin compromiso.</p>
          </div>

          <div className="contact-grid">
            <div className="contact-list stagger">
              {CONTACTO.map((c) => (
                <a
                  className="card card-hover contact-item"
                  key={c.l}
                  href={c.href}
                  target={c.icon === 'pin' ? '_blank' : undefined}
                  rel="noreferrer"
                >
                  <span className="ci-ico"><Icon name={c.icon} size={18} /></span>
                  <div>
                    <div className="caption">{c.l}</div>
                    <strong>{c.v}</strong>
                    <div className="caption">{c.sub}</div>
                  </div>
                  <Icon name="chevR" size={16} className="muted" />
                </a>
              ))}
              <button
                className="btn btn-primary btn-block"
                onClick={() => toast.success('Recibimos su solicitud. Le contactaremos al número registrado.', 'Solicitud enviada')}
              >
                <Icon name="send" size={16} /> Solicitar cotización
              </button>
            </div>

            <div className="card contact-map">
              <iframe
                title="Ubicación de Parceros Multiservice"
                src="https://www.google.com/maps?q=Monse%C3%B1or%20Lezcano%2C%20Managua%2C%20Nicaragua&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
