import { useState } from 'react';
import Icon from '@shared/components/Icon.jsx';
import { useToast } from '@shared/context/ToastContext.jsx';
import { waLink } from '@features/home/data/contacto.js';

const TIPOS = ['Uniforme deportivo', 'Ropa de ciclismo', 'Jersey publicitario', 'Uniforme empresarial', 'Uniforme escolar', 'Otro'];
const VACIO = { nombre: '', tipo: '', cantidad: '', telefono: '', mensaje: '' };

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
    if (!f.tipo) n.tipo = 'Seleccione el tipo de uniforme.';
    if (f.cantidad && !(Number(f.cantidad) > 0)) n.cantidad = 'Ingrese una cantidad mayor que cero.';
    if (!/^[\d\s()+-]{7,}$/.test(f.telefono)) n.telefono = 'Ingrese un teléfono válido.';
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
          <input id="cz-nombre" className={`input ${errs.nombre ? 'has-error' : ''}`} value={f.nombre} onChange={cambiar('nombre')} autoComplete="name" />
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
          <input id="cz-tel" className={`input ${errs.telefono ? 'has-error' : ''}`} inputMode="tel" value={f.telefono} onChange={cambiar('telefono')} autoComplete="tel" placeholder="8888 8888" />
          {error('telefono')}
        </div>
        <div className="field">
          <label htmlFor="cz-cant">Cantidad aproximada</label>
          <input id="cz-cant" className={`input ${errs.cantidad ? 'has-error' : ''}`} type="number" min="1" value={f.cantidad} onChange={cambiar('cantidad')} placeholder="Ej. 20" />
          {error('cantidad')}
        </div>
        <div className="field full">
          <label htmlFor="cz-msg">¿Qué necesita?</label>
          <textarea id="cz-msg" className="textarea" value={f.mensaje} onChange={cambiar('mensaje')} placeholder="Colores, diseño, fecha en que lo necesita…" />
        </div>
      </div>

      <button className="btn lp-btn-wa btn-block" type="submit" style={{ marginTop: 16 }}>
        <Icon name="whatsapp" size={17} /> Enviar por WhatsApp
      </button>
    </form>
  );
}
