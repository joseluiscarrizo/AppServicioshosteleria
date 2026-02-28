import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const config = defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@base44/sdk': path.resolve(__dirname, './tests/__mocks__/@base44/sdk.js'),
    }
  }
});

export default config;