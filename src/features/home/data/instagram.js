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

/** `grad` solo se usa como respaldo cuando Instagram no puede cargarse. */
export const IG_POSTS = [
  { id: 'DYNWT66q3_Z', tipo: 'reel', fecha: '11 may 2026', t: 'Taller en movimiento',      d: 'Un vistazo a como confeccionamos cada pedido.' },
  { id: 'DVZBMTQisgP', tipo: 'p',    fecha: '02 mar 2026', t: 'Oferta del mes',            d: 'Combo de calcetas y gafas deportivas.' },
  { id: 'DUbJPC8ipvG', tipo: 'p',    fecha: '06 feb 2026', t: 'Uniformes de ciclismo',     d: 'Linea basica, intermedia y pro, personalizadas.' },
  { id: 'DSI4yHZFI86', tipo: 'p',    fecha: '11 dic 2025', t: 'Pijamas de saten',          d: 'Coleccion Engel´s en cuatro colores.' },
  { id: 'DQKD5_RDgRd', tipo: 'p',    fecha: '23 oct 2025', t: 'Pedidos a todo el pais',    d: 'Envios a los departamentos por encomienda.' },
  { id: 'DOv94FLjjVc', tipo: 'p',    fecha: '18 sep 2025', t: 'Prendas personalizadas',    d: 'Diseno, colores y numeracion a su medida.' },
  { id: 'DJUKiQNtS6l', tipo: 'p',    fecha: '06 may 2025', t: 'Equipos completos',         d: 'Kits deportivos listos para entregar.' },
  { id: 'DHWdGzIv9KO', tipo: 'p',    fecha: '18 mar 2025', t: 'Trabajos entregados',       d: 'Uniformes terminados en el taller.' },
  { id: 'DGV9YTnvHMB', tipo: 'p',    fecha: '21 feb 2025', t: 'Linea deportiva',           d: 'Sublimacion con acabado profesional.' },
  { id: 'DFqXVVOv4eO', tipo: 'p',    fecha: '04 feb 2025', t: 'Hecho en Nicaragua',        d: 'Produccion propia en Managua.' },
  { id: 'DE5lJQSPoFt', tipo: 'p',    fecha: '16 ene 2025', t: 'Nuevos disenos',            d: 'Propuestas graficas para su equipo.' },
  { id: 'DEf2AkZv-B6', tipo: 'p',    fecha: '06 ene 2025', t: 'Arrancamos el ano',         d: 'Pedidos abiertos para la temporada.' },
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
