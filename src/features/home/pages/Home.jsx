import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@shared/components/Icon.jsx';
import Logo from '@shared/components/Logo.jsx';
import Carousel from '@shared/components/ui/Carousel.jsx';
import IgPost from '@shared/components/ui/IgPost.jsx';
import ThemeToggle from '@shared/components/ui/ThemeToggle.jsx';
import Footer from '@shared/components/layout/Footer.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { IG_POSTS, IG_PERFIL, IG_USUARIO } from '@features/home/data/instagram.js';
import { CONTACTO, TELEFONO, waLink } from '@features/home/data/contacto.js';
import HeroVideo from '@features/home/components/HeroVideo.jsx';
import Contador from '@features/home/components/Contador.jsx';
import CotizaForm from '@features/home/components/CotizaForm.jsx';
import useReveal from '@features/home/hooks/useReveal.js';

/* Fotografias de referencia (Pexels, licencia libre). Ver assets/CREDITOS.md */
import heroDeportivo from '@features/home/assets/hero-deportivo.jpg';
import heroEmpresarial from '@features/home/assets/hero-empresarial.jpg';
import heroEscolar from '@features/home/assets/hero-escolar.jpg';
import imgTaller from '@features/home/assets/taller.jpg';
/* Fotografias propias del taller (publicaciones de la cuenta oficial) */
import prodFutbol from '@features/home/assets/prod-futbol.jpg';
import prodPublicitario from '@features/home/assets/prod-publicitario.jpg';
import prodCiclismo from '@features/home/assets/prod-ciclismo.jpg';

/** Secciones enlazadas desde la barra de navegacion publica. */
const SECCIONES = [
  { id: 'galeria', label: 'Galería' },
  { id: 'nosotros', label: 'Nosotros' },
  { id: 'redes', label: 'Redes Sociales' },
  { id: 'faq', label: 'Preguntas frecuentes' },
  { id: 'contacto', label: 'Contacto' },
];

const PRODUCTOS = [
  { t: 'Uniformes deportivos', d: 'Camisetas, shorts y medias sublimadas para equipos y academias.', desde: 'Desde C$ 620', img: prodFutbol, alt: 'Equipo FC Halcones con el uniforme de fútbol celeste confeccionado por Parceros Sports' },
  { t: 'Jerseys publicitarios', d: 'Con el logotipo de su marca o patrocinador, en línea PRO, intermedia y básica.', desde: 'Desde C$ 540', img: prodPublicitario, alt: 'Jerseys de ciclismo publicitarios con los logotipos de Cool Wave y Banpro' },
  { t: 'Ropa de ciclismo', d: 'Enterizos y jerseys de ciclismo a la medida, con el diseño que usted elija.', desde: 'Desde C$ 480', img: prodCiclismo, alt: 'Pareja de ciclistas con enterizo negro y jersey azul de Parceros Sports' },
];

const LINEAS = [
  {
    n: '01', tag: 'Línea deportiva', t: 'Uniformes deportivos', img: heroDeportivo,
    alt: 'Equipo de fútbol con camisetas numeradas confeccionadas a medida',
    puntos: ['Camisetas, shorts y medias sublimadas', 'El diseño, los colores y el número de cada jugador', 'Pedidos desde diez prendas por diseño'],
  },
  {
    n: '02', tag: 'Línea empresarial', t: 'Uniformes empresariales', img: heroEmpresarial,
    alt: 'Personal de una empresa con polos y gorras del uniforme institucional',
    puntos: ['Camisas, polos y camibusos', 'Logotipo institucional bordado', 'Pedidos desde cinco prendas'],
  },
  {
    n: '03', tag: 'Línea escolar', t: 'Uniformes escolares', img: heroEscolar,
    alt: 'Estudiantes con el uniforme escolar completo en el patio del colegio',
    puntos: ['Prendas completas para colegios e institutos', 'Tallas de XS a XXL, para dama, caballero y niño', 'Entrega puntual antes del ciclo escolar'],
  },
];

const PASOS = [
  { icon: 'send', t: 'Cotice', d: 'Cuéntenos qué necesita por WhatsApp y le agendamos una cita.' },
  { icon: 'sparkle', t: 'Apruebe el diseño', d: 'Elaboramos la propuesta gráfica sin costo y le mostramos una prueba digital.' },
  { icon: 'coin', t: 'Confirme con el 50%', d: 'Con el abono inicial reservamos los insumos y arranca la producción.' },
  { icon: 'truck', t: 'Reciba sus prendas', d: 'Entre 7 y 12 días hábiles.' },
];

const FAQ = [
  { q: '¿Cuál es el tiempo de entrega?', a: 'Entre 7 y 12 días hábiles después de aprobado el diseño y registrado el abono inicial. En temporada alta le confirmamos la fecha exacta en la cotización.' },
  { q: '¿Cuál es la cantidad mínima de pedido?', a: 'No hay cantidad minima de prendas que puedas pedir' },
  { q: '¿Cómo se realiza el pago?', a: 'Con un abono del 50% o también puedes pagar el 100% se confirma el pedido y se reservan los insumos; el saldo se cancela contra entrega. Aceptamos efectivo, transferencia y tarjeta.' },
  { q: '¿Puedo enviar mi propio diseño?', a: 'Sí. Recibimos su arte en formato vectorial o de alta resolución y le enviamos una prueba digital antes de producir.' },
  { q: '¿Puedo seguir el estado de mi pedido?', a: 'Sí. Cada pedido queda registrado en el sistema y puede pedir su estado,le informamos su avance: cotización aprobada, en proceso, completado y entregado.' },
];

/** Encabezado de seccion: antetitulo, titulo y descripcion. */
function Titulo({ kicker, children, texto }) {
  return (
    <div className="section-title reveal">
      {kicker && <span className="lp-kicker">{kicker}</span>}
      <h2>{children}</h2>
      {texto && <p>{texto}</p>}
    </div>
  );
}

export default function Home() {
  const { isAuth } = useAuth();
  const [abierta, setAbierta] = useState(0);
  const [activa, setActiva] = useState('');
  useReveal();

  /* Marca en la barra la seccion que ocupa el centro de la pantalla, tanto al
     hacer clic como al desplazarse a mano. */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => entradas.forEach((e) => e.isIntersecting && setActiva(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' }
    );
    document.querySelectorAll('.landing section').forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

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
          {SECCIONES.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={activa === s.id ? 'is-active' : undefined}
              aria-current={activa === s.id ? 'location' : undefined}
            >
              {s.label}
            </a>
          ))}
        </nav>
        <ThemeToggle />
        <Link className="btn btn-primary btn-sm" to={isAuth ? '/app' : '/login'}>
          <Icon name="lock" size={15} /> {isAuth ? 'Ir al sistema' : 'Iniciar sesión'}
        </Link>
      </header>

      {/* 1. Portada con video */}
      <section className="lp-hero">
        <div className="lp-wrap lp-hero-grid">
          <div className="lp-hero-text">
            <span className="lp-pill lp-rise"><Icon name="star" size={13} /> +8 años de experiencia</span>
            <h1 className="lp-rise" style={{ '--d': '80ms' }}>
              Uniformes personalizados <span>para campeones</span>
            </h1>
            <p className="lp-rise" style={{ '--d': '160ms' }}>
              Deportivos, empresariales y escolares, con sublimación y bordado propio.
              Hechos en Managua y enviados a toda Nicaragua.
            </p>
            <div className="lp-cta lp-rise" style={{ '--d': '240ms' }}>
              <a className="btn lp-btn-wa" href={waLink()} target="_blank" rel="noreferrer">
                <Icon name="whatsapp" size={17} /> Cotice por WhatsApp
              </a>
              <a className="btn lp-btn-ghost" href="#galeria">Ver productos <Icon name="chevR" size={15} /></a>
            </div>
            <p className="lp-hero-note lp-rise" style={{ '--d': '300ms' }}>Sin compromiso · Respuesta en menos de 24 horas</p>
            <div className="lp-hero-stats lp-rise" style={{ '--d': '360ms' }}>
              {[['+8', 'Años'], ['100%', 'Personalizado'], ['Envíos', 'A todo el país']].map(([n, l]) => (
                <div key={l}><strong>{n}</strong><span>{l}</span></div>
              ))}
            </div>
          </div>
          <div className="lp-rise" style={{ '--d': '200ms' }}>
            <HeroVideo />
          </div>
        </div>
      </section>

      {/* 2. Nuestros productos */}
      <section className="section lp-cats" id="galeria">
        <div className="lp-wrap">
          <Titulo kicker="Nuestros productos" texto="Fabricamos la prenda que su equipo o empresa necesita, con la calidad que nos caracteriza.">
            Trabajos que hablan por nosotros
          </Titulo>
          <div className="lp-cat-grid">
            {PRODUCTOS.map((p, i) => (
              <article className="lp-cat reveal" key={p.t} style={{ '--d': `${i * 90}ms` }}>
                <img src={p.img} alt={p.alt} loading="lazy" />
                <div className="lp-cat-body">
                  <span className="lp-cat-price">{p.desde}</span>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                  <a href={waLink(`Hola, quiero cotizar ${p.t.toLowerCase()}.`)} target="_blank" rel="noreferrer">
                    Cotizar <Icon name="chevR" size={14} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Detalle de cada línea */}
      <section className="section lp-lines">
        <div className="lp-wrap">
          <Titulo kicker="Nuestras líneas">Diseñado para los mejores</Titulo>
          <div className="lp-line-list">
            {LINEAS.map((l) => (
              <article className="lp-line" key={l.n}>
                <figure className="lp-line-img reveal">
                  <img src={l.img} alt={l.alt} loading="lazy" />
                  <span className="lp-line-n">{l.n}</span>
                </figure>
                <div className="lp-line-text reveal" style={{ '--d': '120ms' }}>
                  <span className="lp-kicker">{l.tag}</span>
                  <h3>{l.t}</h3>
                  <ul>
                    {l.puntos.map((p) => <li key={p}><Icon name="checkC" size={18} /> {p}</li>)}
                  </ul>
                  <a className="btn btn-primary" href={waLink(`Hola, quiero cotizar ${l.t.toLowerCase()}.`)} target="_blank" rel="noreferrer">
                    Cotice ya <Icon name="chevR" size={15} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Franja de llamado a la acción */}
      <section className="lp-banner">
        <span className="lp-banner-word" aria-hidden="true">Parceros</span>
        <div className="lp-wrap lp-banner-inner reveal">
          <span className="lp-kicker">Solamente los campeones nos prefieren</span>
          <h2>Más de 8 años vistiendo <span>a los mejores</span></h2>
          <a className="btn lp-btn-wa" href={waLink()} target="_blank" rel="noreferrer">
            <Icon name="whatsapp" size={17} /> Cotice ya
          </a>
        </div>
      </section>

      {/* 5. Sobre la empresa */}
      <section className="section lp-about" id="nosotros">
        <div className="lp-wrap">
          <div className="about-grid">
            <div className="about-text reveal">
              <span className="lp-kicker">Sobre nosotros</span>
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

            <figure className="about-img reveal" style={{ '--d': '120ms' }}>
              <img src={imgTaller} alt="Corte de tela sobre la mesa de trabajo, junto a la máquina de coser" loading="lazy" />
              <figcaption>Taller Parceros Multiservice</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* 6. Proceso */}
      <section className="section lp-process">
        <div className="lp-wrap">
          <Titulo kicker="Proceso fácil y rápido" texto="En cuatro pasos tendrá sus uniformes personalizados.">
            Así trabajamos
          </Titulo>
          <ol className="lp-steps">
            {PASOS.map((p, i) => (
              <li className="lp-step reveal" key={p.t} style={{ '--d': `${i * 90}ms` }}>
                <span className="lp-step-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="lp-step-ico"><Icon name={p.icon} size={20} /></span>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 7. Cifras */}
      <section className="lp-stats">
        <div className="lp-wrap lp-stats-grid">
          <Contador valor={120} prefijo="+" etiqueta="Clientes atendidos" />
          <Contador valor={8} prefijo="+" etiqueta="Años de experiencia" />
          <Contador valor={15} prefijo="+" sufijo="K" etiqueta="Prendas confeccionadas" />
          <Contador valor={100} sufijo="%" etiqueta="Personalizado" />
        </div>
      </section>

      {/* 8. Instagram */}
      <section className="section lp-ig" id="redes">
        <div className="lp-wrap">
          <Titulo kicker="Síganos" texto="Estas son las publicaciones de nuestra cuenta oficial, tal como aparecen en Instagram.">
            Nuestro Instagram
          </Titulo>

          <a className="card card-hover ig-perfil reveal" href={IG_PERFIL} target="_blank" rel="noreferrer">
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

      {/* 9. Preguntas frecuentes */}
      <section className="section lp-faq" id="faq">
        <div className="lp-wrap">
          <Titulo kicker="Resolvemos sus dudas" texto="Lo que más nos consultan antes de encargar un pedido.">
            Preguntas frecuentes
          </Titulo>
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

      {/* 10. Información de contacto */}
      <section className="section" id="contacto">
        <div className="lp-wrap">
          <Titulo kicker="Hablemos" texto="Escríbanos o visítenos; con gusto le preparamos una cotización sin compromiso.">
            Información de contacto
          </Titulo>

          <div className="contact-grid">
            <div className="contact-list reveal">
              {CONTACTO.map((c) => (
                <a
                  className="card card-hover contact-item"
                  key={c.l}
                  href={c.href}
                  target={c.href.startsWith('http') ? '_blank' : undefined}
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
              <div className="card contact-map">
                <iframe
                  title="Ubicación de Parceros Multiservice"
                  src="https://www.google.com/maps?q=Monse%C3%B1or%20Lezcano%2C%20Managua%2C%20Nicaragua&output=embed"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            <div className="reveal" style={{ '--d': '120ms' }}>
              <CotizaForm />
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Accesos fijos a WhatsApp: botón flotante (escritorio) y barra inferior (móvil) */}
      <a className="lp-wa-float" href={waLink()} target="_blank" rel="noreferrer" aria-label="Escríbanos por WhatsApp">
        <Icon name="whatsapp" size={26} />
      </a>
      <div className="lp-mobile-cta">
        <a className="btn lp-btn-wa" href={waLink()} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={17} /> WhatsApp</a>
        <a className="btn" href={TELEFONO.href}><Icon name="phone" size={16} /> Llamar</a>
      </div>
    </div>
  );
}
