import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.startsWith('trix-'),
          },
        },
      }),
      tailwindcss(),
    ],
    optimizeDeps: {
      exclude: ['@unhead/vue', 'unhead'],
    },
    envPrefix: ['VITE_', 'PHA_'],
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
