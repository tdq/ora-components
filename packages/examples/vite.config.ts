import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'ora-components': resolve(__dirname, '../ora-components/src/index.ts'),
      '@': resolve(__dirname, '../ora-components/src'),
    },
  },
});
