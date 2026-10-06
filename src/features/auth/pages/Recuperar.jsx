import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '@shared/components/Icon.jsx';
import Logo from '@shared/components/Logo.jsx';
import ThemeToggle from '@shared/components/ui/ThemeToggle.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';
import { useData } from '@shared/context/DataContext.jsx';

/**
 * Recuperacion de contraseña en dos pasos:
 *  1. /recuperar: el usuario escribe su correo y el sistema genera un enlace
 *     de un solo uso, valido 30 minutos, si el correo es de un usuario activo.
 *  2. /recuperar?token=…: el enlace pide la contraseña nueva y su confirmacion.
 */
export default function Recuperar() {
  const [params] = useSearchParams();
  return params.get('token') ? <Restablecer token={params.get('token')} /> : <Solicitar />;
}

/** Panel izquierdo de las dos pantallas. */
function Arte({ titulo, texto }) {
  return (
    <div className="auth-art">
      <div style={{ position: 'relative' }}>
        <div className="brand">
          <Logo className="brand-mark" size={34} radius={10} />
          <div className="brand-name" style={{ color: '#fff' }}>Parceros<small style={{ color: 'rgba(255,255,255,.7)' }}>Multiservice</small></div>
        </div>
      </div>
      <div style={{ position: 'relative', maxWidth: 400 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.18 }}>{titulo}</h1>
        <p style={{ opacity: .82, marginTop: 12 }}>{texto}</p>
      </div>
      <div style={{ position: 'relative', fontSize: 12, opacity: .65 }}>© 2026 Parceros Multiservice</div>
    </div>
  );
}

function Solicitar() {
  const toast = useToast();
  const { solicitarRecuperacion } = useData();
  const [correo, setCorreo] = useState('');
  const [err, setErr] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enlace, setEnlace] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = (e) => {
    e.preventDefault();
    if (!correo.trim()) { setErr('Este campo no puede estar vacío.'); toast.error('Ingrese su correo electrónico.', 'Validación de campos'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(correo)) { setErr('Ingrese un correo electrónico válido.'); return; }
    setErr('');
    setCargando(true);
    setTimeout(() => {
      /* Por seguridad la respuesta es la misma exista o no el correo: si no
         es de un usuario registrado y activo, el enlace no es valido. */
      const token = solicitarRecuperacion(correo) || Math.random().toString(36).slice(2);
      setEnlace(`/recuperar?token=${token}`);
      setCargando(false);
      setEnviado(true);
      toast.success('Si el correo está registrado, recibirá un enlace para restablecer su contraseña.', 'Solicitud enviada');
    }, 700);
  };

  return (
    <div className="auth">
      <Arte
        titulo="Recupere el acceso a su cuenta"
        texto="Le enviaremos un enlace seguro para restablecer su contraseña. El enlace expira en 30 minutos."
      />

      <div className="auth-form-side">
        <div className="auth-card">
          <div className="between" style={{ marginBottom: 22 }}>
            <Link to="/login" className="btn btn-sm btn-ghost"><Icon name="chevL" size={15} /> Volver</Link>
            <ThemeToggle />
          </div>

          {enviado ? (
            <div className="anim-page">
              <div style={{ width: 56, height: 56, borderRadius: 99, background: 'var(--success-bg)', color: 'var(--success-fg)', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
                <Icon name="mail" size={26} />
              </div>
              <h1 style={{ fontSize: 22 }}>Revise su correo</h1>
              <p className="muted" style={{ marginTop: 8, fontSize: 13.5 }}>
                Si <strong className="strong">{correo}</strong> está registrado, recibirá un enlace para
                restablecer su contraseña. Si no lo encuentra, revise la carpeta de correo no deseado.
              </p>
              <div className="alert alert-info" style={{ marginTop: 18 }}>
                <Icon name="info" size={18} />
                <div>El enlace es válido por 30 minutos y se puede usar una sola vez.</div>
              </div>
              <div className="card card-pad" style={{ marginTop: 14, background: 'var(--surface-2)' }}>
                <div className="caption" style={{ marginBottom: 8 }}>
                  Versión de demostración sin servidor de correo: este es el enlace que llegaría al correo.
                </div>
                <Link className="btn btn-sm" to={enlace}><Icon name="mail" size={15} /> Abrir enlace de restablecimiento</Link>
              </div>
              <button className="btn btn-block" style={{ marginTop: 18 }} onClick={() => setEnviado(false)}>
                <Icon name="refresh" size={16} /> Usar otro correo
              </button>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 24 }}>Recuperar contraseña</h1>
              <p className="muted" style={{ marginTop: 6, fontSize: 13.5 }}>
                Ingrese el correo registrado y le enviaremos un enlace de restablecimiento.
              </p>
              <form onSubmit={enviar} className="stack" style={{ gap: 15, marginTop: 24 }} noValidate>
                <div className="field">
                  <label htmlFor="c">Correo electrónico <span className="req">*</span></label>
                  <input id="c" className={`input ${err ? 'has-error' : ''}`} type="email" placeholder="usuario@parceros.ni"
                    value={correo} onChange={(e) => { setCorreo(e.target.value); setErr(''); }} />
                  {err && <span className="field-error"><Icon name="alert" size={12} /> {err}</span>}
                </div>
                <button className="btn btn-primary btn-block" type="submit" disabled={cargando}>
                  {cargando ? (
                    <>
                      <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: 99, animation: 'spin .7s linear infinite' }} />
                      Enviando…
                    </>
                  ) : (<><Icon name="send" size={16} /> Enviar enlace</>)}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Paso 2: contraseña nueva desde el enlace. */
function Restablecer({ token }) {
  const toast = useToast();
  const nav = useNavigate();
  const { enlaceValido, restablecerClave } = useData();
  const [valido] = useState(() => enlaceValido(token));
  const [form, setForm] = useState({ nueva: '', repetir: '' });
  const [errs, setErrs] = useState({});

  const guardar = (e) => {
    e.preventDefault();
    const n = {};
    if (!form.nueva) n.nueva = 'Este campo no puede estar vacío.';
    else if (form.nueva.length < 6) n.nueva = 'La contraseña debe tener al menos 6 caracteres.';
    if (!form.repetir) n.repetir = 'Este campo no puede estar vacío.';
    else if (form.nueva !== form.repetir) n.repetir = 'Las contraseñas no coinciden.';
    setErrs(n);
    if (Object.keys(n).length) { toast.error('Revise los campos marcados.', 'Validación de campos'); return; }
    if (!restablecerClave(token, form.nueva)) {
      toast.error('El enlace no es válido o ha vencido. Solicite uno nuevo.', 'Enlace no válido');
      return;
    }
    toast.success('Su contraseña se actualizó correctamente.');
    nav('/login', { replace: true });
  };

  const campo = (k, label) => (
    <div className="field">
      <label htmlFor={k}>{label} <span className="req">*</span></label>
      <input
        id={k} className={`input ${errs[k] ? 'has-error' : ''}`} type="password" placeholder="Mínimo 6 caracteres"
        value={form[k]} onChange={(e) => { setForm({ ...form, [k]: e.target.value }); setErrs({ ...errs, [k]: undefined }); }}
      />
      {errs[k] && <span className="field-error"><Icon name="alert" size={12} /> {errs[k]}</span>}
    </div>
  );

  return (
    <div className="auth">
      <Arte titulo="Restablezca su contraseña" texto="Defina una contraseña nueva para volver a ingresar al sistema." />

      <div className="auth-form-side">
        <div className="auth-card">
          <div className="between" style={{ marginBottom: 22 }}>
            <Link to="/login" className="btn btn-sm btn-ghost"><Icon name="chevL" size={15} /> Volver</Link>
            <ThemeToggle />
          </div>

          {!valido ? (
            <div className="anim-page">
              <div className="alert alert-error">
                <Icon name="alert" size={20} />
                <div>El enlace no es válido o ha vencido. Solicite uno nuevo.</div>
              </div>
              <Link className="btn btn-primary btn-block" style={{ marginTop: 18 }} to="/recuperar">
                <Icon name="refresh" size={16} /> Solicitar un enlace nuevo
              </Link>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 24 }}>Nueva contraseña</h1>
              <p className="muted" style={{ marginTop: 6, fontSize: 13.5 }}>Escriba la contraseña nueva y confírmela.</p>
              <form onSubmit={guardar} className="stack" style={{ gap: 15, marginTop: 24 }} noValidate>
                {campo('nueva', 'Contraseña nueva')}
                {campo('repetir', 'Confirmar contraseña')}
                <button className="btn btn-primary btn-block" type="submit">
                  <Icon name="check" size={16} /> Guardar contraseña
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
