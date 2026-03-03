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
      'ta-01kjrshcaaaawd98qw17rnz9d8-5173-ruhene2vuqq11bkrsbdcludrh.w.modal.host',
      'all',
      '.modal.host',
      '.w.modal.host',
    ],
  },
});
