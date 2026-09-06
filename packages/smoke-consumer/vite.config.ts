import { defineConfig } from 'vite';

// Deliberately no alias to '../ora-components/src' — this app resolves
// '@tdq/ora-components' from node_modules, i.e. from the packed tarball
// installed by `npm run smoke` (see scripts/prepare.mjs). That is the whole
// point of this package: packages/examples aliases the library's source and
// so cannot catch bugs that only exist in the published dist output (a CSS
// leak, a missing export, a broken `exports` map entry, ...).
export default defineConfig({
  build: {
    outDir: 'dist',
  },
});
