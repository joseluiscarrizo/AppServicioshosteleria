import { defineConfig } from 'vitest/config';

const config = defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    alias: {
      '@': '/src',
    }
  }
});

export default config;