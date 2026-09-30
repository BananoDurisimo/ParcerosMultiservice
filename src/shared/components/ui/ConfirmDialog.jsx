import Modal from './Modal.jsx';
import Icon from '@shared/components/Icon.jsx';

export default function ConfirmDialog({ open, onClose, onConfirm, titulo, mensaje, confirmLabel = 'Aceptar', tono = 'error', icono }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={titulo}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className={tono === 'error' ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm}>
            <Icon name={icono || (tono === 'error' ? 'alert' : 'check')} size={16} /> {confirmLabel}
          </button>
        </>
      }
    >
      <div className={`alert alert-${tono}`}>
        <Icon name="alert" size={20} />
        <div>{mensaje}</div>
      </div>
    </Modal>
  );
}
