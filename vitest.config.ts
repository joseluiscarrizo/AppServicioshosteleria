import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react'; // Updated import

const config = defineConfig({
  plugins: [react()], // Updated usage
  test: {
    environment: 'jsdom', // Configured jsdom environment
    alias: {
      '@': '/src', // Set up path aliases
    }
  }
});

export default config;