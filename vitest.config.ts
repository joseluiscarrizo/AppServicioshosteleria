import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react'; // Updated import

const config = defineConfig({
  plugins: [react()], // Updated usage
  test: {
    environment: 'jsdom', // Configured jsdom environment
    globals: true, // Make expect, vi, etc. available without imports
    setupFiles: ['./tests/setup.js'],
    alias: {
      '@': '/src', // Set up path aliases
    }
  }
});

export default config;