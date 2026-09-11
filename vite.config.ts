import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/animbench-lab/',
  // Only react.html uses JSX; every other entry stays framework free.
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('index.html', import.meta.url)),
        bench: fileURLToPath(new URL('bench.html', import.meta.url)),
        validate: fileURLToPath(new URL('validate.html', import.meta.url)),
        react: fileURLToPath(new URL('react.html', import.meta.url)),
      },
    },
  },
})
