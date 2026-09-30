/**
 * Instagram oficial de la empresa.
 *
 * Las publicaciones se muestran con el reproductor oficial de Instagram
 * (`/embed/`), de modo que la imagen y el texto siempre corresponden a lo
 * que esta publicado en la cuenta: no hay que copiar fotos al proyecto.
 *
 * Para agregar una publicacion nueva: abrala en Instagram y copie el codigo
 * que aparece en la direccion (.../p/CODIGO/) en el campo `id`.
 */

export const IG_USUARIO = 'parceros_multiservice';
export const IG_PERFIL = 'https://www.instagram.com/parceros_multiservice/';
export const IG_FACEBOOK = 'https://www.facebook.com/par.ceros.multiservice';

/** Cada publicacion trae su propio texto y fecha desde Instagram; aqui solo
 *  se guarda el codigo. `grad` es el fondo de respaldo si Instagram no carga. */
export const IG_POSTS = [
  { id: 'DYNWT66q3_Z', tipo: 'reel' },
  { id: 'DVZBMTQisgP', tipo: 'p' },
  { id: 'DUbJPC8ipvG', tipo: 'p' },
  { id: 'DSI4yHZFI86', tipo: 'p' },
  { id: 'DQKD5_RDgRd', tipo: 'p' },
  { id: 'DOv94FLjjVc', tipo: 'p' },
  { id: 'DJUKiQNtS6l', tipo: 'p' },
  { id: 'DHWdGzIv9KO', tipo: 'p' },
  { id: 'DGV9YTnvHMB', tipo: 'p' },
  { id: 'DFqXVVOv4eO', tipo: 'p' },
  { id: 'DE5lJQSPoFt', tipo: 'p' },
  { id: 'DEf2AkZv-B6', tipo: 'p' },
].map((p, n) => ({
  ...p,
  url: `https://www.instagram.com/${p.tipo}/${p.id}/`,
  embed: `https://www.instagram.com/${p.tipo}/${p.id}/embed/`,
  grad: [
    'linear-gradient(135deg,#2563EB,#7C3AED)',
    'linear-gradient(135deg,#0EA5E9,#0F766E)',
    'linear-gradient(135deg,#DB2777,#7C2D12)',
    'linear-gradient(135deg,#F59E0B,#DB2777)',
    'linear-gradient(135deg,#22C55E,#0EA5E9)',
    'linear-gradient(135deg,#7C3AED,#2563EB)',
  ][n % 6],
}));
