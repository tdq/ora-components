import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'aura-components': resolve(__dirname, '../aura-components/src/index.ts'),
      '@': resolve(__dirname, '../aura-components/src'),
    },
  },
});
