import { useTheme } from '@shared/context/ThemeContext.jsx';
import Icon from '@shared/components/Icon.jsx';

export default function ThemeToggle({ withLabel = false }) {
  const { isDark, toggle } = useTheme();
  return (
    <button
      className={withLabel ? 'btn' : 'icon-btn'}
      onClick={toggle}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label="Cambiar tema"
    >
      <span style={{ display: 'inline-flex', transition: 'transform .5s cubic-bezier(.22,1,.36,1)', transform: isDark ? 'rotate(180deg)' : 'none' }}>
        <Icon name={isDark ? 'sun' : 'moon'} size={18} />
      </span>
      {withLabel && (isDark ? 'Modo claro' : 'Modo oscuro')}
    </button>
  );
}
