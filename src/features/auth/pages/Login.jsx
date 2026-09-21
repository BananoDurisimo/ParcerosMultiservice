import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Icon from '@shared/components/Icon.jsx';
import Logo from '@shared/components/Logo.jsx';
import ThemeToggle from '@shared/components/ui/ThemeToggle.jsx';
import { useAuth, DEMO } from '@shared/context/AuthContext.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();

  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [ver, setVer] = useState(false);
  const [errs, setErrs] = useState({});
  const [cargando, setCargando] = useState(false);

  const enviar = (e) => {
    e.preventDefault();
    const n = {};
    if (!correo.trim()) n.correo = 'Este campo no puede estar vacío.';
    else if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(correo)) n.correo = 'Ingrese un correo electrónico válido.';
    if (!clave) n.clave = 'Este campo no puede estar vacío.';
    else if (clave.length < 6) n.clave = 'La contraseña debe tener al menos 6 caracteres.';
    setErrs(n);
    if (Object.keys(n).length) { toast.error('Revise los campos marcados.', 'Validación de campos'); return; }

    setCargando(true);
    setTimeout(() => {
      const r = login(correo, clave);
      setCargando(false);
      if (!r.ok) { toast.error(r.error, 'Error de acceso'); return; }
      toast.success(`Bienvenido(a), ${r.user.nombre}.`, 'Acceso concedido');
      nav(loc.state?.from || '/app', { replace: true });
    }, 650);
  };

  const rapido = (u) => { setCorreo(u.correo); setClave(u.clave); setErrs({}); };

  return (
    <div className="auth">
      <div className="auth-art">
        <div style={{ position: 'relative' }}>
          <div className="brand auth-brand">
            <Logo className="brand-mark" size={124} radius={26} />
            <div className="brand-name" style={{ color: '#fff' }}>Parceros<small style={{ color: 'rgba(255,255,255,.7)' }}>Multiservice</small></div>
          </div>
        </div>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <h1 style={{ fontSize: 34, lineHeight: 1.15, fontWeight: 700 }}>Gestione compras, pedidos y ventas en un solo lugar.</h1>
          <p style={{ opacity: .82, marginTop: 14, fontSize: 15 }}>
            Sistema de gestión para la elaboración de uniformes deportivos personalizados: inventario, cotizaciones,
            pedidos, abonos y reportes con trazabilidad completa.
          </p>
          <div className="stack" style={{ gap: 10, marginTop: 26 }}>
            {['Control digital del inventario de insumos', 'Trazabilidad de cada pedido y abono', 'Reportes de ventas y compras'].map((t) => (
              <span key={t} className="row" style={{ gap: 9, fontSize: 13.5, opacity: .92 }}>
                <Icon name="checkC" size={17} /> {t}
              </span>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', fontSize: 12, opacity: .65 }}>© 2026 Parceros Multiservice · Equipo de Desarrollo VP</div>
      </div>

      <div className="auth-form-side">
        <div className="auth-card">
          <div className="between" style={{ marginBottom: 22 }}>
            <Link to="/" className="btn btn-sm btn-ghost"><Icon name="chevL" size={15} /> Volver al sitio</Link>
            <ThemeToggle />
          </div>

          <h1 style={{ fontSize: 24 }}>Iniciar sesión</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 13.5 }}>Ingrese sus credenciales para acceder al sistema.</p>

          <form onSubmit={enviar} className="stack" style={{ gap: 15, marginTop: 24 }} noValidate>
            <div className="field">
              <label htmlFor="correo">Correo electrónico <span className="req">*</span></label>
              <input
                id="correo" className={`input ${errs.correo ? 'has-error' : ''}`} type="email" autoComplete="username"
                placeholder="usuario@parceros.ni" value={correo}
                onChange={(e) => { setCorreo(e.target.value); setErrs({ ...errs, correo: undefined }); }}
              />
              {errs.correo && <span className="field-error"><Icon name="alert" size={12} /> {errs.correo}</span>}
            </div>

            <div className="field">
              <label htmlFor="clave">Contraseña <span className="req">*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  id="clave" className={`input ${errs.clave ? 'has-error' : ''}`} type={ver ? 'text' : 'password'}
                  autoComplete="current-password" placeholder="••••••••" style={{ paddingRight: 42 }} value={clave}
                  onChange={(e) => { setClave(e.target.value); setErrs({ ...errs, clave: undefined }); }}
                />
                <button type="button" className="icon-btn" style={{ position: 'absolute', right: 3, top: 3 }} onClick={() => setVer((v) => !v)} aria-label="Mostrar contraseña">
                  <Icon name="eye" size={16} />
                </button>
              </div>
              {errs.clave && <span className="field-error"><Icon name="alert" size={12} /> {errs.clave}</span>}
            </div>

            <div className="between">
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="track"><span className="thumb" /></span>
                <span style={{ fontSize: 13 }}>Recordarme</span>
              </label>
              <Link to="/recuperar" style={{ fontSize: 13 }}>¿Olvidó su contraseña?</Link>
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={cargando}>
              {cargando ? (
                <>
                  <span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: 99, animation: 'spin .7s linear infinite' }} />
                  Validando…
                </>
              ) : (<><Icon name="logout" size={16} /> Ingresar</>)}
            </button>
          </form>

          <div className="card card-pad" style={{ marginTop: 22, background: 'var(--surface-2)' }}>
            <div className="caption row" style={{ gap: 6, marginBottom: 9 }}>
              <Icon name="info" size={14} /> Usuarios de prueba (contraseña: <strong>123456</strong>)
            </div>
            <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
              {DEMO.map((u) => (
                <button key={u.correo} type="button" className="chip" onClick={() => rapido(u)}>{u.rol}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
