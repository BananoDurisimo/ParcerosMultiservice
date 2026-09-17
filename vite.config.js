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
  /* Alias por capa (encarpetado Feature Based): evita los "../../.." al
     importar entre funcionalidades y deja explicito de que capa viene cada
     modulo (app / features / shared). */
  resolve: {
    alias: {
      '@': ruta('./src'),
      '@app': ruta('./src/app'),
      '@features': ruta('./src/features'),
      '@shared': ruta('./src/shared'),
      '@assets': ruta('./src/assets'),
      '@styles': ruta('./src/styles'),
    },
  },
}))
