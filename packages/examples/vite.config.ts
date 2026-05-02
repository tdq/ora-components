import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@tdq/ora-components': resolve(__dirname, '../ora-components/src/index.ts'),
      '@': resolve(__dirname, '../ora-components/src'),
    },
  },
});
