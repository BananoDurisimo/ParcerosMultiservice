import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@shared/components/Icon.jsx';
import Logo from '@shared/components/Logo.jsx';
import ThemeToggle from '@shared/components/ui/ThemeToggle.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';

export default function Recuperar() {
  const toast = useToast();
  const [correo, setCorreo] = useState('');
  const [err, setErr] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  const enviar = (e) => {
    e.preventDefault();
    if (!correo.trim()) { setErr('Este campo no puede estar vacío.'); toast.error('Ingrese su correo electrónico.', 'Validación de campos'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(correo)) { setErr('Ingrese un correo electrónico válido.'); return; }
    setErr('');
    setCargando(true);
    setTimeout(() => {
      setCargando(false);
      setEnviado(true);
      toast.success('Le enviamos un enlace de restablecimiento a su correo.', 'Correo enviado');
    }, 700);
  };

  return (
    <div className="auth">
      <div className="auth-art">
        <span className="blob" style={{ width: 280, height: 280, background: '#3B82F6', top: -50, right: -40 }} />
        <span className="blob" style={{ width: 240, height: 240, background: '#A855F7', bottom: -50, left: -30 }} />
        <div style={{ position: 'relative' }}>
          <div className="brand">
            <Logo className="brand-mark" size={34} radius={10} />
            <div className="brand-name" style={{ color: '#fff' }}>Parceros<small style={{ color: 'rgba(255,255,255,.7)' }}>Multiservice</small></div>
          </div>
        </div>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.18 }}>Recupere el acceso a su cuenta</h1>
          <p style={{ opacity: .82, marginTop: 12 }}>
            Le enviaremos un enlace seguro para restablecer su contraseña. El enlace expira en 30 minutos.
          </p>
        </div>
        <div style={{ position: 'relative', fontSize: 12, opacity: .65 }}>© 2026 Parceros Multiservice</div>
      </div>

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
                Enviamos las instrucciones de restablecimiento a <strong className="strong">{correo}</strong>.
                Si no lo encuentra, revise la carpeta de correo no deseado.
              </p>
              <div className="alert alert-info" style={{ marginTop: 18 }}>
                <Icon name="info" size={18} />
                <div>El enlace es válido por 30 minutos por seguridad.</div>
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
