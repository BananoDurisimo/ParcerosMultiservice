import { Link } from 'react-router-dom';
import Icon from '@core/widgets/Icon.jsx';
import Logo from '@core/widgets/Logo.jsx';
import ThemeToggle from '@core/widgets/ui/ThemeToggle.jsx';
import { PROYECTO, TEXTO_LICENCIA, TERCEROS, TRANSITIVAS, SERVICIOS } from '@core/constants/licencias.js';

const Licencia = ({ id }) => (
  <a className="badge badge-primary" href={TEXTO_LICENCIA[id]} target="_blank" rel="noreferrer">{id}</a>
);

function Contenido() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Licencias</h1>
          <p className="sub">Licencia de este sistema y de las herramientas de terceros que utiliza.</p>
        </div>
      </div>

      <section className="card card-pad lic-proyecto">
        <span className="badge badge-warning">{PROYECTO.tipo}</span>
        <h2 style={{ marginTop: 10 }}>© {PROYECTO.anio} {PROYECTO.titular}. Todos los derechos reservados.</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          Licencia de uso no exclusiva e intransferible otorgada a {PROYECTO.licenciatario}. Obra protegida por el
          derecho de autor en Colombia (Ley 23 de 1982, Decisión Andina 351 de 1993 y Decreto 1360 de 1989).
        </p>
        <div className="lic-terminos">
          {PROYECTO.terminos.map(([ico, t, d]) => (
            <div key={t} className="lic-termino">
              <Icon name={ico} size={16} />
              <div><strong>{t}</strong><p className="caption">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {TERCEROS.map((g) => (
        <section key={g.grupo} className="card lic-grupo">
          <div className="card-head"><h3>{g.grupo}</h3></div>
          <div className="lic-tabla">
            <table className="tbl">
              <thead><tr><th>Herramienta</th><th>Versión</th><th>Uso</th><th>Licencia</th></tr></thead>
              <tbody>
                {g.items.map(([nombre, version, uso, lic, sitio]) => (
                  <tr key={nombre}>
                    <td><a href={sitio} target="_blank" rel="noreferrer">{nombre}</a></td>
                    <td className="muted">{version}</td>
                    <td className="muted">{uso}</td>
                    <td><Licencia id={lic} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <div className="lic-transitivas">
        {TRANSITIVAS.map((t) => (
          <section key={t.app} className="card card-pad">
            <h3>Dependencias indirectas · {t.app}</h3>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {t.conteo.map(([lic, n]) => (
                <a key={lic} className="badge badge-neutral" href={TEXTO_LICENCIA[lic]} target="_blank" rel="noreferrer">{lic} · {n}</a>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="card lic-grupo">
        <div className="card-head"><h3>Servicios externos (términos de uso)</h3></div>
        <div className="lic-tabla">
          <table className="tbl">
            <thead><tr><th>Servicio</th><th>Uso</th></tr></thead>
            <tbody>
              {SERVICIOS.map(([nombre, uso, terminos]) => (
                <tr key={nombre}>
                  <td><a href={terminos} target="_blank" rel="noreferrer">{nombre}</a></td>
                  <td className="muted">{uso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/** /licencias (sitio publico) y /app/licencias (dentro del sistema). */
export default function Licencias({ publico = false }) {
  if (!publico) return <div className="anim-page"><Contenido /></div>;
  return (
    <>
      <header className="pub-nav">
        <Link className="brand" to="/">
          <Logo className="brand-mark" />
          <div className="brand-name">Parceros<small>Multiservice</small></div>
        </Link>
        <div className="grow" />
        <ThemeToggle />
        <Link className="btn btn-sm" to="/"><Icon name="chevL" size={15} /> Sitio público</Link>
      </header>
      <main className="lic-wrap anim-page"><Contenido /></main>
    </>
  );
}
