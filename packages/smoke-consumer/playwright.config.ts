import { defineConfig, devices } from '@playwright/test';

// Port 4180, not Vite's 4173 default — several other packages in this
// monorepo (e.g. the landing page) also run `vite preview` locally, and a
// collision would make this config silently attach to (or fight with) their
// server instead of its own build.
const PORT = 4180;

export default defineConfig({
  testDir: './src',
  testMatch: '*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  outputDir: 'test-results',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // Serves the `dist/` produced by `npm run build:app`. `test:e2e` does not
    // rebuild it — run `npm run build:app` first (the `smoke` script always
    // does), or `dist/` is stale/missing and this fails to boot. The
    // `preview` script's own `--port` must match PORT above.
    command: 'npm run preview',
    url: `http://localhost:${PORT}`,
    // Never reuse an existing server, even locally: reusing one could mean
    // testing yesterday's `dist/`, which is exactly the kind of stale-build
    // false pass this smoke suite exists to prevent.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
