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

/* Fotografias de referencia (Pexels, licencia libre). Ver src/assets/home/CREDITOS.md */
import heroDeportivo from '@features/home/assets/hero-deportivo.jpg';
import heroEmpresarial from '@features/home/assets/hero-empresarial.jpg';
import heroEscolar from '@features/home/assets/hero-escolar.jpg';
import prodDeportivo from '@features/home/assets/prod-deportivo.jpg';
import prodEmpresarial from '@features/home/assets/prod-empresarial.jpg';
import prodEscolar from '@features/home/assets/prod-escolar.jpg';
import imgTaller from '@features/home/assets/taller.jpg';

const SLIDES = [
  {
    id: 1,
    eyebrow: 'Línea deportiva',
    titulo: 'Uniformes sublimados para su equipo',
    texto: 'Camisetas, shorts y medias con el diseño, los colores y el número de cada jugador.',
    grad: 'linear-gradient(120deg, #1E3A8A, #2563EB 55%, #7C3AED)',
    img: heroDeportivo,
    alt: 'Equipo de fútbol con camisetas numeradas confeccionadas a medida',
  },
  {
    id: 2,
    eyebrow: 'Línea empresarial',
    titulo: 'La imagen de su empresa, bien vestida',
    texto: 'Camisas, polos y camibusos bordados con el logotipo institucional.',
    grad: 'linear-gradient(120deg, #0F766E, #0EA5E9 60%, #2563EB)',
    img: heroEmpresarial,
    alt: 'Personal de una empresa con polos y gorras del uniforme institucional',
  },
  {
    id: 3,
    eyebrow: 'Línea escolar',
    titulo: 'Uniformes escolares en todas las tallas',
    texto: 'Prendas completas para colegios e institutos, con entrega puntual antes del ciclo.',
    grad: 'linear-gradient(120deg, #7C2D12, #DB2777 55%, #7C3AED)',
    img: heroEscolar,
    alt: 'Estudiantes con el uniforme escolar completo en el patio del colegio',
  },
];

const PRODUCTOS = [
  { icon: 'shirt', t: 'Uniformes deportivos', d: 'Camisetas, shorts y medias sublimadas para equipos y academias.', desde: 'Desde C$ 620', img: prodDeportivo, alt: 'Jugador con uniforme deportivo sublimado en verde y naranja' },
  { icon: 'badge', t: 'Uniformes empresariales', d: 'Camisas, polos y camibusos bordados con su identidad corporativa.', desde: 'Desde C$ 540', img: prodEmpresarial, alt: 'Dos colaboradores con camisas corporativas a juego' },
  { icon: 'users', t: 'Uniformes escolares', d: 'Prendas completas para colegios e institutos, en todas las tallas.', desde: 'Desde C$ 480', img: prodEscolar, alt: 'Niña con el polo del uniforme de su colegio' },
];


const FAQ = [
  { q: '¿Cuál es el tiempo de entrega?', a: 'Entre 7 y 12 días hábiles después de aprobado el diseño y registrado el abono inicial. En temporada alta le confirmamos la fecha exacta en la cotización.' },
  { q: '¿Cuál es la cantidad mínima de pedido?', a: 'Diez prendas por diseño en la línea deportiva y escolar. En la línea empresarial trabajamos desde cinco prendas.' },
  { q: '¿Cómo se realiza el pago?', a: 'Con un abono del 50% se confirma el pedido y se reservan los insumos; el saldo se cancela contra entrega. Aceptamos efectivo, transferencia y tarjeta.' },
  { q: '¿Puedo enviar mi propio diseño?', a: 'Sí. Recibimos su arte en formato vectorial o de alta resolución y le enviamos una prueba digital antes de producir.' },
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
        Uniformes 100% personalizados, hechos en Nicaragua para su equipo o empresa
      </div>

      {/* Barra de navegación */}
      <header className="pub-nav">
        <Link className="brand" to="/">
          <Logo className="brand-mark" />
          <div className="brand-name">Parceros<small>Multiservice</small></div>
        </Link>
        <div className="grow" />
        <nav className="pub-links hide-xs">
          <a href="#galeria">Galería</a>
          <a href="#nosotros">Nosotros</a>
          <a href="#redes">Redes Sociales</a>
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
            items={SLIDES}
            render={(s) => (
              <article className="slide has-img" style={{ background: s.grad }}>
                <img className="slide-img" src={s.img} alt={s.alt} loading="lazy" />
                <div className="slide-body">
                  <span className="slide-eyebrow">{s.eyebrow}</span>
                  <h2>{s.titulo}</h2>
                  <p>{s.texto}</p>
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

      {/* Nuestros productos */}
      <section className="section" id="galeria">
        <div className="lp-wrap">
          <div className="section-title">
            <h2>Nuestros productos</h2>
            <p>Fabricamos la prenda que su equipo o empresa necesita, con la calidad que nos caracteriza.</p>
          </div>
          <div className="prod-grid stagger">
            {PRODUCTOS.map((p) => (
              <article className="card card-hover prod" key={p.t}>
                <div className="prod-media">
                  <img src={p.img} alt={p.alt} loading="lazy" />
                  <span className="prod-ico"><Icon name={p.icon} size={18} /></span>
                </div>
                <div className="prod-body">
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                  <div className="between" style={{ marginTop: 14 }}>
                    <span className="badge badge-primary">{p.desde}</span>
                    <Link className="btn btn-sm" to={isAuth ? '/app/productos' : '/login'}>
                      Ver catálogo <Icon name="chevR" size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Sobre la empresa */}
      <section className="section lp-about" id="nosotros">
        <div className="lp-wrap">
          <div className="about-grid">
            <div className="about-text">
              <h2>Fabricamos uniformes <span className="grad">100% personalizados</span></h2>
              <p>
                Parceros Multiservice es un taller nicaragüense con más de ocho años confeccionando
                uniformes deportivos, empresariales y escolares. Trabajamos con tela nacional e importada,
                sublimación y bordado propio, de modo que cada prenda sale con el diseño exacto que el
                cliente aprobó.
              </p>
              <ul className="about-list">
                {[
                  ['Diseño propio', 'Nuestro equipo elabora la propuesta gráfica sin costo adicional.'],
                  ['Entrega puntual', 'Cada pedido se registra y se le informa el avance por etapa.'],
                  ['Todas las tallas', 'De XS a XXL, con moldes para dama, caballero y niño.'],
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
                {[['+120', 'Clientes'], ['+8', 'Años'], ['+15K', 'Prendas']].map(([n, l]) => (
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
              <span>Uniformes deportivos, empresariales y escolares · Managua, Nicaragua</span>
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
