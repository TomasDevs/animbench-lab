import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/animbench-lab/',
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('index.html', import.meta.url)),
        bench: fileURLToPath(new URL('bench.html', import.meta.url)),
        validate: fileURLToPath(new URL('validate.html', import.meta.url)),
      },
    },
  },
})
