import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    sourcemap: 'hidden',
  },
  server: {
    host: true,
    allowedHosts: [
      '.modal.host',
      '.w.modal.host',
    ],
  },
  preview: {
    host: true,
    allowedHosts: [
      '.modal.host',
      '.w.modal.host',
    ],
  },
});
