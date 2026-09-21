/**
 * Fotografias del carrusel principal del inicio.
 *
 * COMO CAMBIARLAS
 * Copie las imagenes en  src/features/home/assets/carrusel/  y listo: entran
 * solas, ordenadas por el nombre del archivo. El titulo que se ve sobre la
 * foto sale de ese mismo nombre (01-uniformes-deportivos.jpg -> "Uniformes
 * deportivos"). Ver el README de esa carpeta.
 *
 * Mientras la carpeta este vacia se muestran las tres fotos de ejemplo.
 */
import { IG_PERFIL } from './instagram.js';

import heroDeportivo from '@features/home/assets/hero-deportivo.jpg';
import prodDeportivo from '@features/home/assets/prod-deportivo.jpg';
import imgTaller from '@features/home/assets/taller.jpg';

/* Vite resuelve el glob al compilar: cada archivo presente queda incluido en
   el paquete con su ruta final, sin imports uno por uno. */
const archivos = import.meta.glob('../assets/carrusel/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/* Nombres que pone la camara o el telefono: la foto sirve, el nombre no. */
const SIN_TITULO = /^(img|image|photo|foto|whatsapp|screenshot|captura|dsc|pxl|received)\b/i;

/** "01-uniformes-deportivos.jpg" -> "Uniformes deportivos" ('' si no aplica). */
function tituloDesdeArchivo(ruta) {
  const base = ruta
    .split('/').pop()
    .replace(/\.[^.]+$/, '')        // extension
    .replace(/^\d+[\s._-]*/, '')    // numero de orden
    .replace(/[._-]+/g, ' ')
    .trim();

  if (!base || SIN_TITULO.test(base) || !/[a-záéíóúñ]{3}/i.test(base)) return '';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

const propias = Object.keys(archivos)
  .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
  .map((ruta) => {
    const titulo = tituloDesdeArchivo(ruta);
    return {
      id: ruta,
      img: archivos[ruta],
      titulo,
      alt: titulo ? `${titulo} — Parceros Multiservice` : 'Trabajo de Parceros Multiservice',
      enlace: IG_PERFIL,
    };
  });

/* Fotografias de referencia (Pexels, licencia libre). Ver src/assets/home/CREDITOS.md */
const ejemplo = [
  {
    id: 'ej-equipo',
    img: heroDeportivo,
    titulo: 'Uniformes para todo su equipo',
    alt: 'Equipo de fútbol con camisetas numeradas confeccionadas a medida',
    enlace: IG_PERFIL,
  },
  {
    id: 'ej-sublimado',
    img: prodDeportivo,
    titulo: 'Sublimación full color con nombre y número',
    alt: 'Jugador con uniforme deportivo sublimado en verde y naranja',
    enlace: IG_PERFIL,
  },
  {
    id: 'ej-taller',
    img: imgTaller,
    titulo: 'Confección propia en Managua',
    alt: 'Corte de tela deportiva sobre la mesa de trabajo, junto a la máquina de coser',
    enlace: IG_PERFIL,
  },
];

export const SLIDES_INICIO = propias.length ? propias : ejemplo;
