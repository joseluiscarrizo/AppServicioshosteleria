import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const config = defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: true,
    alias: {
      '@': '/src',
    }
  }
});

export default config;