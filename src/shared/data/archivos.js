/**
 * Archivos adjuntos: imagen del diseño de una cotización / pedido y
 * comprobante de pago de un abono.
 *
 * No hay servidor de archivos: lo que el usuario sube se guarda como data URL
 * dentro del registro. Los datos semilla traen sus propios archivos, generados
 * aquí como SVG para que se puedan ver y descargar igual que uno subido.
 */

const svgData = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

const escapar = (t) =>
  String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Boceto de un uniforme: camiseta con los colores, el texto y el número del diseño. */
export function disenoUniforme({ base, acento, texto, numero, titulo }) {
  return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="440" viewBox="0 0 600 440">
  <rect width="600" height="440" fill="#f4f5f7"/>
  <text x="24" y="38" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#1f2937">${escapar(titulo)}</text>
  <text x="24" y="62" font-family="Arial, sans-serif" font-size="13" fill="#6b7280">Diseño aprobado por el cliente</text>
  <g transform="translate(60 90)">
    <path d="M70 0 L120 0 Q135 30 150 0 L200 0 L270 50 L235 100 L205 80 L205 300 L65 300 L65 80 L35 100 L0 50 Z" fill="${base}" stroke="#111827" stroke-width="3"/>
    <path d="M0 50 L35 100 L65 80 L65 60 Z" fill="${acento}"/>
    <path d="M270 50 L235 100 L205 80 L205 60 Z" fill="${acento}"/>
    <circle cx="105" cy="80" r="16" fill="${acento}" stroke="#111827" stroke-width="2"/>
    <text x="135" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="${acento}">${escapar(numero)}</text>
  </g>
  <g transform="translate(360 90)">
    <path d="M70 0 L120 0 Q135 20 150 0 L200 0 L270 50 L235 100 L205 80 L205 300 L65 300 L65 80 L35 100 L0 50 Z" transform="scale(.75)" fill="${base}" stroke="#111827" stroke-width="3"/>
    <text x="101" y="95" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="${acento}">${escapar(texto)}</text>
    <text x="101" y="160" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="${acento}">${escapar(numero)}</text>
    <text x="101" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">Espalda</text>
  </g>
</svg>`);
}

/** Recibo de pago de un abono. */
export function comprobantePago({ codigo, cliente, monto, fecha, metodo }) {
  return svgData(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="300" viewBox="0 0 420 300">
  <rect width="420" height="300" rx="14" fill="#ffffff" stroke="#d1d5db" stroke-width="2"/>
  <text x="24" y="42" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#1f2937">Comprobante de pago</text>
  <text x="24" y="66" font-family="Arial, sans-serif" font-size="13" fill="#6b7280">Parceros Multiservice · ${escapar(codigo)}</text>
  <line x1="24" y1="84" x2="396" y2="84" stroke="#e5e7eb" stroke-width="2"/>
  <text x="24" y="118" font-family="Arial, sans-serif" font-size="14" fill="#374151">Cliente: ${escapar(cliente)}</text>
  <text x="24" y="146" font-family="Arial, sans-serif" font-size="14" fill="#374151">Fecha: ${escapar(fecha)}</text>
  <text x="24" y="174" font-family="Arial, sans-serif" font-size="14" fill="#374151">Método de pago: ${escapar(metodo)}</text>
  <text x="24" y="236" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#047857">${escapar(monto)}</text>
</svg>`);
}

/* --------------------------------------------------------------
   Ver y descargar
   -------------------------------------------------------------- */
const EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

export const esImagen = (v) => typeof v === 'string' && v.startsWith('data:image/');
export const esPdf = (v) => typeof v === 'string' && v.startsWith('data:application/pdf');

/** Abre el archivo en una pestaña nueva. Los navegadores no abren data URLs
    directamente, por eso se convierte primero en blob. */
export async function abrirArchivo(v) {
  if (!v) return;
  if (!v.startsWith('data:')) { window.open(v, '_blank', 'noopener'); return; }
  const blob = await (await fetch(v)).blob();
  window.open(URL.createObjectURL(blob), '_blank', 'noopener');
}

/**
 * Descarga el archivo al equipo en su formato original, con `nombre` como
 * nombre de archivo (la extension sale del tipo del archivo). Devuelve false si
 * no se pudo descargar, para que la pantalla muestre el aviso.
 */
export async function descargarArchivo(v, nombre) {
  try {
    if (!v) return false;
    const blob = await (await fetch(v)).blob();
    const ext = EXTENSION[blob.type] || 'bin';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

/* --------------------------------------------------------------
   Lectura de archivos subidos desde el equipo
   -------------------------------------------------------------- */
const TIPOS_LEGIBLES = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'application/pdf': 'PDF',
};

/** Lee un archivo del equipo como data URL validando tipo y tamaño. */
export function leerArchivo(file, tipos, maxMb = 5) {
  return new Promise((resolve, reject) => {
    if (!tipos.includes(file.type)) {
      reject(new Error(`El archivo debe ser ${tipos.map((t) => TIPOS_LEGIBLES[t] || t).join(', ')}.`));
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      reject(new Error(`El archivo no puede superar ${maxMb} MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.onload = () => {
      if (file.type === 'application/pdf') { resolve(reader.result); return; }
      /* Una imagen se valida tambien por contenido: que el navegador la pueda dibujar. */
      const img = new Image();
      img.onload = () => resolve(reader.result);
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
