import { ESTADO_TONO } from '@shared/data/mock.js';

export default function Badge({ children, tono, dot = true }) {
  const t = tono || ESTADO_TONO[children] || 'neutral';
  return (
    <span className={`badge badge-${t}`}>
      {dot && <i className="dot" />}
      {children}
    </span>
  );
}
