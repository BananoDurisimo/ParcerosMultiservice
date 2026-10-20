import { useState } from 'react';
import Icon from '@shared/components/Icon.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';
import { waLink } from '@features/home/data/contacto.js';

const TIPOS = ['Uniforme de fútbol', 'Ropa de ciclismo', 'Jersey con patrocinador', 'Otro deporte'];
const VACIO = { nombre: '', tipo: '', cantidad: '', telefono: '', mensaje: '' };

/* Limites del formulario: mensajes cortos y claros en WhatsApp. */
const MAX = { nombre: 80, telefono: 20, digitos: 15, prendas: 1000, mensaje: 500 };

/**
 * Formulario de cotizacion. No hay backend que lo reciba: arma el mensaje y lo
 * abre en WhatsApp para que el cliente lo envie. No se guarda ningun dato.
 */
export default function CotizaForm() {
  const toast = useToast();
  const [f, setF] = useState(VACIO);
  const [errs, setErrs] = useState({});

  const cambiar = (k) => (e) => {
    setF({ ...f, [k]: e.target.value });
    if (errs[k]) setErrs({ ...errs, [k]: undefined });
  };

  const enviar = (e) => {
    e.preventDefault();
    const n = {};
    if (!f.nombre.trim()) n.nombre = 'Ingrese su nombre.';
    else if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ .'-]+$/.test(f.nombre.trim())) n.nombre = 'El nombre solo admite letras y espacios.';
    else if (f.nombre.trim().length > MAX.nombre) n.nombre = `Máximo ${MAX.nombre} caracteres.`;
    if (!f.tipo) n.tipo = 'Seleccione el tipo de uniforme.';
    if (f.cantidad && !(Number(f.cantidad) > 0 && Number.isInteger(Number(f.cantidad)))) n.cantidad = 'Ingrese una cantidad entera mayor que cero.';
    else if (Number(f.cantidad) > MAX.prendas) n.cantidad = `Máximo ${MAX.prendas.toLocaleString('es-NI')} prendas por solicitud.`;
    const digitos = f.telefono.replace(/\D/g, '').length;
    if (!/^[\d\s()+-]{7,}$/.test(f.telefono) || digitos < 7) n.telefono = 'Ingrese un teléfono válido.';
    else if (digitos > MAX.digitos) n.telefono = `El teléfono no puede tener más de ${MAX.digitos} dígitos.`;
    if (f.mensaje.length > MAX.mensaje) n.mensaje = `Máximo ${MAX.mensaje} caracteres.`;
    setErrs(n);
    if (Object.keys(n).length) return;

    const texto = [
      `Hola, soy ${f.nombre.trim()} y quiero cotizar: ${f.tipo}.`,
      f.cantidad && `Cantidad aproximada: ${f.cantidad} prendas.`,
      `Teléfono: ${f.telefono.trim()}.`,
      f.mensaje.trim() && `Detalles: ${f.mensaje.trim()}`,
    ].filter(Boolean).join('\n');
    window.open(waLink(texto), '_blank', 'noopener');
    toast.success('Abrimos WhatsApp con su solicitud lista para enviar.', 'Cotización');
    setF(VACIO);
  };

  const error = (k) => errs[k] && <span className="field-error"><Icon name="alert" size={12} /> {errs[k]}</span>;

  return (
    <form className="card lp-form" onSubmit={enviar} noValidate>
      <h3>¡Cotice ya!</h3>
      <p className="caption">Su uniforme ideal está a un mensaje de distancia. Cuéntenos qué necesita.</p>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="cz-nombre">Nombre completo <span className="req">*</span></label>
          <input id="cz-nombre" className={`input ${errs.nombre ? 'has-error' : ''}`} value={f.nombre} onChange={cambiar('nombre')} autoComplete="name" maxLength={MAX.nombre} />
          {error('nombre')}
        </div>
        <div className="field">
          <label htmlFor="cz-tipo">Tipo de uniforme <span className="req">*</span></label>
          <select id="cz-tipo" className={`select ${errs.tipo ? 'has-error' : ''}`} value={f.tipo} onChange={cambiar('tipo')}>
            <option value="">Seleccione…</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {error('tipo')}
        </div>
        <div className="field">
          <label htmlFor="cz-tel">WhatsApp / Teléfono <span className="req">*</span></label>
          <input id="cz-tel" className={`input ${errs.telefono ? 'has-error' : ''}`} inputMode="tel" value={f.telefono} onChange={cambiar('telefono')} autoComplete="tel" placeholder="8888 8888" maxLength={MAX.telefono} />
          {error('telefono')}
        </div>
        <div className="field">
          <label htmlFor="cz-cant">Cantidad aproximada</label>
          <input id="cz-cant" className={`input ${errs.cantidad ? 'has-error' : ''}`} type="number" min="1" max={MAX.prendas} step="1" value={f.cantidad} onChange={cambiar('cantidad')} placeholder="Ej. 20 (máx. 1.000)" />
          {error('cantidad')}
        </div>
        <div className="field full">
          <label htmlFor="cz-msg">¿Qué necesita?</label>
          <textarea id="cz-msg" className={`textarea ${errs.mensaje ? 'has-error' : ''}`} value={f.mensaje} onChange={cambiar('mensaje')} placeholder="Colores, diseño, fecha en que lo necesita…" maxLength={MAX.mensaje} />
          <span className="caption right">{f.mensaje.length}/{MAX.mensaje}</span>
          {error('mensaje')}
        </div>
      </div>

      <button className="btn lp-btn-wa btn-block" type="submit" style={{ marginTop: 16 }}>
        <Icon name="whatsapp" size={17} /> Enviar por WhatsApp
      </button>
    </form>
  );
}
