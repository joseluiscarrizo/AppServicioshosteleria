import { defineConfig } from 'vitest/config';
import { react } from '@vitest/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './setupTests.ts',
    alias: [{ find: '@', replacement: '/src' }],
    // additional configurations can be added here
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules'],
  },
});