import Modal from './Modal.jsx';
import Icon from '@shared/components/Icon.jsx';

export default function ConfirmDialog({ open, onClose, onConfirm, titulo, mensaje, confirmLabel = 'Eliminar', tono = 'error' }) {
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
            <Icon name={tono === 'error' ? 'trash' : 'check'} size={16} /> {confirmLabel}
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
