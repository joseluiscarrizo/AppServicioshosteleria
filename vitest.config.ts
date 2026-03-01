import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react'; // Updated import

const cssStubPlugin = {
  name: 'css-stub',
  enforce: 'pre' as const,
  resolveId(id: string) {
    if (id.endsWith('.css')) return '\0css-stub-module';
  },
  load(id: string) {
    if (id === '\0css-stub-module') return 'export default {}';
  },
};

const config = defineConfig({
  plugins: [react(), cssStubPlugin], // Updated usage
  test: {
    globals: true,
    environment: 'jsdom', // Configured jsdom environment
    setupFiles: ['./tests/setup.js'],
    css: false,
    alias: {
      '@': '/src', // Set up path aliases
    }
  }
});

export default config;