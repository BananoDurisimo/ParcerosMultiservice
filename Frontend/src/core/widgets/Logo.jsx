import logo from '@assets/logo.jpg';

/**
 * Marca de la empresa. Unico punto donde se referencia el archivo del
 * logotipo: al cambiar la imagen se actualiza en todo el sistema.
 */
export default function Logo({ size = 30, radius = 9, className = '', style }) {
  return (
    <img
      src={logo}
      alt="Parceros Multiservice"
      className={`logo-img ${className}`}
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: radius, ...style }}
    />
  );
}
