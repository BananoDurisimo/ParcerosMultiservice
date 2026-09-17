import { createContext, useContext, useState, useCallback, useRef } from 'react';
import Icon from '@shared/components/Icon.jsx';

const ToastContext = createContext(null);

const ICONS = { success: 'checkC', error: 'xC', warning: 'alert', info: 'info' };
const TITULOS = { success: 'Éxito', error: 'Error', warning: 'Alerta', info: 'Información' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const remove = useCallback((id) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 240);
  }, []);

  const push = useCallback((type, message, title, duration = 4000) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-3), { id, type, message, title: title || TITULOS[type], duration }]);
    setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  const api = {
    push,
    success: (m, t) => push('success', m, t),
    error:   (m, t) => push('error', m, t),
    warning: (m, t) => push('warning', m, t),
    info:    (m, t) => push('info', m, t),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type} ${t.leaving ? 'leaving' : ''}`}>
            <Icon name={ICONS[t.type]} size={19} />
            <div className="grow">
              <div className="t-title">{t.title}</div>
              <div className="t-msg">{t.message}</div>
            </div>
            <button className="icon-btn" style={{ width: 26, height: 26, color: 'inherit' }} onClick={() => remove(t.id)} aria-label="Cerrar">
              <Icon name="x" size={14} />
            </button>
            <i className="t-bar" style={{ '--dur': t.duration + 'ms' }} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
