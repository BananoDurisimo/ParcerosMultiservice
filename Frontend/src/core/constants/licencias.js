/** Licencia del sistema y de cada herramienta de terceros que usa (pagina
 *  /licencias). Al agregar o actualizar una dependencia, actualizar esta lista. */

export const PROYECTO = {
  tipo: 'Software privativo',
  titular: 'Equipo de Desarrollo VP',
  licenciatario: 'Parceros Multiservice',
  anio: 2026,
  terminos: [
    ['check', 'Uso autorizado', 'Solo Parceros Multiservice, para la operación interna de su negocio.'],
    ['x', 'Sin copia ni distribución', 'No se permite copiar, modificar, publicar, vender ni sublicenciar el software.'],
    ['lock', 'Sin ingeniería inversa', 'No se permite descompilar ni analizar el código para reproducirlo.'],
  ],
};

/** Texto de cada licencia en SPDX. */
export const TEXTO_LICENCIA = {
  'MIT': 'https://spdx.org/licenses/MIT.html',
  'ISC': 'https://spdx.org/licenses/ISC.html',
  'BSD-2-Clause': 'https://spdx.org/licenses/BSD-2-Clause.html',
  'BSD-3-Clause': 'https://spdx.org/licenses/BSD-3-Clause.html',
  'Apache-2.0': 'https://spdx.org/licenses/Apache-2.0.html',
  'PostgreSQL': 'https://spdx.org/licenses/PostgreSQL.html',
  'OFL-1.1': 'https://spdx.org/licenses/OFL-1.1.html',
  'CC-BY-4.0': 'https://spdx.org/licenses/CC-BY-4.0.html',
  'Licencia Pexels': 'https://www.pexels.com/license/',
};

/** [nombre, version, uso, licencia, sitio] */
export const TERCEROS = [
  {
    grupo: 'Frontend web (se ejecuta en el navegador)',
    items: [
      ['React', '18.3.1', 'Biblioteca de interfaz', 'MIT', 'https://react.dev'],
      ['React DOM', '18.3.1', 'Render de React en el navegador', 'MIT', 'https://react.dev'],
      ['React Router DOM', '6.30.6', 'Navegación entre páginas', 'MIT', 'https://reactrouter.com'],
      ['Tabler Icons', '—', 'Trazados de los íconos', 'MIT', 'https://tabler.io/icons'],
    ],
  },
  {
    grupo: 'Backend (API)',
    items: [
      ['Node.js', '—', 'Entorno de ejecución', 'MIT', 'https://nodejs.org'],
      ['Express', '4.22.3', 'Servidor HTTP y rutas', 'MIT', 'https://expressjs.com'],
      ['pg (node-postgres)', '8.23.1', 'Conexión con PostgreSQL', 'MIT', 'https://node-postgres.com'],
      ['jsonwebtoken', '9.0.3', 'Tokens de sesión (JWT)', 'MIT', 'https://github.com/auth0/node-jsonwebtoken'],
      ['bcryptjs', '2.4.3', 'Cifrado de contraseñas', 'MIT', 'https://github.com/dcodeIO/bcrypt.js'],
      ['cors', '2.8.6', 'Acceso desde el frontend', 'MIT', 'https://github.com/expressjs/cors'],
      ['dotenv', '16.6.1', 'Variables de entorno', 'BSD-2-Clause', 'https://github.com/motdotla/dotenv'],
      ['PostgreSQL', '—', 'Base de datos', 'PostgreSQL', 'https://www.postgresql.org'],
    ],
  },
  {
    grupo: 'Aplicación móvil',
    items: [
      ['Flutter SDK', '3', 'Framework de la app', 'BSD-3-Clause', 'https://flutter.dev'],
      ['Dart', '3', 'Lenguaje de la app', 'BSD-3-Clause', 'https://dart.dev'],
      ['Material Icons', '—', 'Íconos de la app', 'Apache-2.0', 'https://fonts.google.com/icons'],
    ],
  },
  {
    grupo: 'Fuentes e imágenes',
    items: [
      ['Inter', '—', 'Fuente del texto', 'OFL-1.1', 'https://fonts.google.com/specimen/Inter'],
      ['Barlow Condensed', '—', 'Fuente de los títulos', 'OFL-1.1', 'https://fonts.google.com/specimen/Barlow+Condensed'],
      ['Foto del taller (Pavel Danilyuk)', '—', 'Sitio público · Sobre la empresa', 'Licencia Pexels', 'https://www.pexels.com/photo/6461121/'],
    ],
  },
  {
    grupo: 'Herramientas de desarrollo (no se distribuyen)',
    items: [
      ['Vite', '5.4.21', 'Compilación del frontend', 'MIT', 'https://vitejs.dev'],
      ['@vitejs/plugin-react', '4.7.0', 'Soporte de React en Vite', 'MIT', 'https://github.com/vitejs/vite-plugin-react'],
      ['Vitest', '2.1.9', 'Pruebas del frontend', 'MIT', 'https://vitest.dev'],
    ],
  },
];

/** Dependencias indirectas, contadas desde los package-lock.json. */
export const TRANSITIVAS = [
  { app: 'Frontend', conteo: [['MIT', 133], ['ISC', 6], ['Apache-2.0', 2], ['BSD-3-Clause', 1], ['CC-BY-4.0', 1]] },
  { app: 'Backend', conteo: [['MIT', 91], ['ISC', 5], ['BSD-3-Clause', 2], ['BSD-2-Clause', 1], ['Apache-2.0', 1]] },
];

/** Servicios en la nube: no son licencias, se rigen por sus términos de uso. */
export const SERVICIOS = [
  ['GitHub Pages', 'Publicación del frontend', 'https://docs.github.com/es/site-policy/github-terms/github-terms-of-service'],
  ['Render', 'Publicación de la API y la base de datos', 'https://render.com/terms'],
  ['Brevo', 'Envío de correos', 'https://www.brevo.com/legal/termsofuse/'],
  ['Google Fonts', 'Entrega de las fuentes', 'https://developers.google.com/fonts/terms'],
  ['Instagram', 'Publicaciones incrustadas en el sitio', 'https://help.instagram.com/581066165581870'],
];
