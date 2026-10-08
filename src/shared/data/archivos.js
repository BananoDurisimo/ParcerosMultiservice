/**
 * Archivos adjuntos: imagen del diseño de una cotización / pedido y
 * comprobante de pago de un abono.
 *
 * No hay servidor de archivos: lo que el usuario sube se guarda como data URL
 * dentro del registro (columnas ruta_imagen_diseno y ruta_comprobante).
 */

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
