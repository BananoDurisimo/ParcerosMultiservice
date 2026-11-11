import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const ruta = (p) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig(({ command }) => ({
  /* En GitHub Pages el sitio no cuelga del dominio raiz sino de
     /ParcerosMultiservice/, asi que en la compilacion todas las rutas de los
     assets se prefijan. En desarrollo se queda en "/". */
  base: command === 'build' ? '/ParcerosMultiservice/' : '/',
  plugins: [react()],
  server: { port: 5173, open: true },
  /* Alias por capa (encarpetado por capas: core / data / domain /
     presentation): evita los "../../.." al importar y deja explicito de que
     capa viene cada modulo. Las imagenes estan fuera de src, en assets/. */
  resolve: {
    alias: {
      '@': ruta('./src'),
      '@core': ruta('./src/core'),
      '@data': ruta('./src/data'),
      '@domain': ruta('./src/domain'),
      '@presentation': ruta('./src/presentation'),
      '@assets': ruta('./assets'),
    },
  },
}))
