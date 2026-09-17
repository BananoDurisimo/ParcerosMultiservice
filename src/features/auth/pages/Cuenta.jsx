import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@shared/components/Icon.jsx';
import Badge from '@shared/components/ui/Badge.jsx';
import ConfirmDialog from '@shared/components/ui/ConfirmDialog.jsx';
import { useAuth, iniciales } from '@shared/context/AuthContext.jsx';
import { useTheme } from '@shared/context/ThemeContext.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';
import { useData } from '@shared/context/DataContext.jsx';
import { fecha } from '@shared/data/mock.js';

const TABS = [
  { id: 'perfil', label: 'Mi perfil', icon: 'user' },
  { id: 'seguridad', label: 'Seguridad', icon: 'lock' },
  { id: 'preferencias', label: 'Preferencias', icon: 'settings' },
  { id: 'actividad', label: 'Actividad', icon: 'refresh' },
];

export default function Cuenta() {
  const { user, update, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { db } = useData();
  const toast = useToast();
  const nav = useNavigate();

  const [tab, setTab] = useState('perfil');
  const [salir, setSalir] = useState(false);
  const [form, setForm] = useState({
    nombre: user?.nombre || '',
    correo: user?.correo || '',
    usuario: user?.usuario || '',
    telefono: '8992 0326',
    direccion: 'Managua, Nicaragua',
  });
  const [claves, setClaves] = useState({ actual: '', nueva: '', repetir: '' });
  const [errs, setErrs] = useState({});
  const [notifs, setNotifs] = useState({ stock: true, pedidos: true, abonos: true, correo: false });

  const perfilRegistro = db.usuarios.find((u) => u.correo_empresarial === user?.correo);

  const guardarPerfil = (e) => {
    e.preventDefault();
    const n = {};
    if (!form.nombre.trim()) n.nombre = 'Este campo no puede estar vacío.';
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(form.correo)) n.correo = 'Ingrese un correo electrónico válido.';
    if (!/^[\d\s()+-]{7,}$/.test(form.telefono)) n.telefono = 'Ingrese un teléfono válido.';
    setErrs(n);
    if (Object.keys(n).length) { toast.error('Revise los campos marcados.', 'Validación de campos'); return; }
    update({ nombre: form.nombre, correo: form.correo, usuario: form.usuario });
    toast.success('Su información de perfil se actualizó correctamente.');
  };

  const cambiarClave = (e) => {
    e.preventDefault();
    const n = {};
    if (!claves.actual) n.actual = 'Ingrese su contraseña actual.';
    if (claves.nueva.length < 6) n.nueva = 'La nueva contraseña debe tener al menos 6 caracteres.';
    if (claves.nueva !== claves.repetir) n.repetir = 'Las contraseñas no coinciden.';
    setErrs(n);
    if (Object.keys(n).length) { toast.error('No fue posible actualizar la contraseña.', 'Validación de campos'); return; }
    setClaves({ actual: '', nueva: '', repetir: '' });
    toast.success('Su contraseña se actualizó correctamente.');
  };

  return (
    <div className="anim-page">
      <div className="page-head">
        <div>
          <h1 className="row" style={{ gap: 10 }}><Icon name="user" size={22} /> Mi cuenta</h1>
          <p className="sub">Administre su información personal, seguridad y preferencias del sistema.</p>
          <div className="hero-rule" />
        </div>
        <button className="btn btn-danger" onClick={() => setSalir(true)}>
          <Icon name="logout" size={16} /> Cerrar sesión
        </button>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <div className="avatar avatar-lg">{iniciales(user?.nombre)}</div>
          <div className="grow" style={{ minWidth: 190 }}>
            <h2 style={{ fontSize: 19, fontWeight: 600 }}>{user?.nombre}</h2>
            <div className="caption row" style={{ gap: 6, marginTop: 3 }}><Icon name="mail" size={13} /> {user?.correo}</div>
            <div className="row" style={{ gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
              <span className="badge badge-primary"><Icon name="shield" size={12} /> {user?.rol}</span>
              <Badge>{perfilRegistro?.estado || 'Activo'}</Badge>
              <span className="badge badge-neutral">@{user?.usuario}</span>
            </div>
          </div>
          <div className="stack right">
            <span className="caption">Fecha de ingreso</span>
            <strong>{fecha(perfilRegistro?.fecha_ingreso)}</strong>
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="row" style={{ gap: 7 }}><Icon name={t.icon} size={15} /> {t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'perfil' && (
        <form className="card card-pad anim-in" onSubmit={guardarPerfil} noValidate>
          <h2 style={{ marginBottom: 14 }}>Información personal</h2>
          <div className="form-grid">
            {[
              ['nombre', 'Nombre completo', 'text'],
              ['usuario', 'Nombre de usuario', 'text'],
              ['correo', 'Correo electrónico', 'email'],
              ['telefono', 'Teléfono', 'tel'],
            ].map(([k, l, t]) => (
              <div className="field" key={k}>
                <label htmlFor={k}>{l} <span className="req">*</span></label>
                <input id={k} className={`input ${errs[k] ? 'has-error' : ''}`} type={t === 'email' ? 'email' : 'text'}
                  value={form[k]} onChange={(e) => { setForm({ ...form, [k]: e.target.value }); setErrs({ ...errs, [k]: undefined }); }} />
                {errs[k] && <span className="field-error"><Icon name="alert" size={12} /> {errs[k]}</span>}
              </div>
            ))}
            <div className="field full">
              <label htmlFor="dir">Dirección</label>
              <input id="dir" className="input" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="btn btn-primary" type="submit"><Icon name="check" size={16} /> Guardar cambios</button>
          </div>
        </form>
      )}

      {tab === 'seguridad' && (
        <div className="anim-in">
          <form className="card card-pad" onSubmit={cambiarClave} noValidate>
            <h2 style={{ marginBottom: 14 }}>Cambiar contraseña</h2>
            <div className="form-grid">
              {[
                ['actual', 'Contraseña actual', true],
                ['nueva', 'Nueva contraseña', false],
                ['repetir', 'Repetir nueva contraseña', false],
              ].map(([k, l, full]) => (
                <div className={`field ${full ? 'full' : ''}`} key={k}>
                  <label htmlFor={k}>{l} <span className="req">*</span></label>
                  <input id={k} className={`input ${errs[k] ? 'has-error' : ''}`} type="password" placeholder="••••••••"
                    value={claves[k]} onChange={(e) => { setClaves({ ...claves, [k]: e.target.value }); setErrs({ ...errs, [k]: undefined }); }} />
                  {errs[k] && <span className="field-error"><Icon name="alert" size={12} /> {errs[k]}</span>}
                </div>
              ))}
            </div>
            <div className="alert alert-info" style={{ marginTop: 16 }}>
              <Icon name="info" size={18} />
              <div>Use al menos 6 caracteres, combinando letras y números. Su sesión se cerrará automáticamente tras 5 minutos de inactividad.</div>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-primary" type="submit"><Icon name="lock" size={16} /> Actualizar contraseña</button>
            </div>
          </form>

          <div className="card card-pad" style={{ marginTop: 16 }}>
            <h2 style={{ marginBottom: 12 }}>Permisos de mi rol</h2>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {(db.roles.find((r) => r.nombre === user?.rol)?.calc_permisos || []).map((p) => (
                <span key={p} className="badge badge-primary"><Icon name="check" size={12} /> {p}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'preferencias' && (
        <div className="anim-in">
          <div className="card card-pad">
            <h2 style={{ marginBottom: 4 }}>Apariencia</h2>
            <p className="caption" style={{ marginBottom: 14 }}>Elija cómo desea visualizar el sistema. La preferencia se guarda en este dispositivo.</p>
            <div className="theme-picker">
              {[
                { id: 'light', label: 'Modo claro', desc: 'Fondo blanco, texto oscuro', a: '#FFFFFF', b: '#F8FAFC', c: '#2563EB' },
                { id: 'dark', label: 'Modo oscuro', desc: 'Fondo #111827, texto claro', a: '#111827', b: '#1F2937', c: '#3B82F6' },
              ].map((o) => (
                <button key={o.id} type="button" className={`theme-opt ${theme === o.id ? 'on' : ''}`}
                  onClick={() => { setTheme(o.id); toast.success(`Se activó el ${o.label.toLowerCase()}.`, 'Apariencia'); }}>
                  <div className="theme-prev">
                    <span style={{ flex: 1, background: o.a }} />
                    <span style={{ flex: 1, background: o.b }} />
                    <span style={{ width: 26, background: o.c }} />
                  </div>
                  <div className="row" style={{ gap: 7 }}>
                    <Icon name={o.id === 'dark' ? 'moon' : 'sun'} size={16} />
                    <strong style={{ fontSize: 13.5 }}>{o.label}</strong>
                    {theme === o.id && <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>Activo</span>}
                  </div>
                  <div className="caption" style={{ marginTop: 3 }}>{o.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="card card-pad" style={{ marginTop: 16 }}>
            <h2 style={{ marginBottom: 12 }}>Notificaciones</h2>
            <div className="stack" style={{ gap: 14 }}>
              {[
                ['stock', 'Alertas de stock mínimo', 'Avisar cuando un insumo esté por debajo del mínimo.'],
                ['pedidos', 'Cambios de estado en pedidos', 'Notificar cuando un pedido avance de etapa.'],
                ['abonos', 'Abonos y saldos pendientes', 'Recordar los pedidos con saldo por cobrar.'],
                ['correo', 'Enviar copia por correo', 'Recibir un resumen diario en el correo registrado.'],
              ].map(([k, t, d]) => (
                <div className="between" key={k}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t}</div>
                    <div className="caption">{d}</div>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={notifs[k]} onChange={(e) => {
                      setNotifs({ ...notifs, [k]: e.target.checked });
                      toast.info(`${t}: ${e.target.checked ? 'activadas' : 'desactivadas'}.`, 'Preferencias');
                    }} />
                    <span className="track"><span className="thumb" /></span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'actividad' && (
        <div className="card card-pad anim-in">
          <h2 style={{ marginBottom: 14 }}>Actividad reciente</h2>
          <div className="timeline">
            {[
              ['done', 'Inicio de sesión', 'Acceso desde navegador web · 02/09/2026 09:14'],
              ['done', 'Pedido PED-0128 registrado', 'Academia FC Juvenil · C$ 18,250.00'],
              ['done', 'Abono AB-0231 registrado', 'Transferencia · C$ 9,125.00'],
              ['done', 'Compra CMP-0042 recibida', 'Textiles Nicaragua S.A · C$ 24,600.00'],
              ['pend', 'Cierre de sesión automático', 'Tras 5 minutos de inactividad'],
            ].map(([est, t, d], i) => (
              <div className={`tl-item ${est}`} key={i}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t}</div>
                <div className="caption">{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={salir}
        onClose={() => setSalir(false)}
        onConfirm={() => { logout(); toast.info('Su sesión se cerró correctamente.', 'Sesión finalizada'); nav('/login'); }}
        titulo="Cerrar sesión"
        mensaje="¿Desea cerrar la sesión actual? Deberá ingresar nuevamente sus credenciales para acceder al sistema."
        confirmLabel="Cerrar sesión"
        tono="warning"
      />
    </div>
  );
}
