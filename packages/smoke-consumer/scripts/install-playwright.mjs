#!/usr/bin/env node
// `--with-deps` installs the OS-level shared libraries Chromium needs (apt
// packages on Linux) in addition to the browser binary itself — required on
// a bare CI runner, unwanted noise (it shells out to sudo/apt) on a
// developer machine that already has a working Chromium from another
// Playwright-using package in this monorepo. Gated on `CI`, the same signal
// the workflow's other `playwright install --with-deps` step relies on.
import { spawnSync } from 'node:child_process';

const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = process.env.CI
    ? ['playwright', 'install', '--with-deps', 'chromium']
    : ['playwright', 'install', 'chromium'];

console.log(`[install-playwright] ${npxBin} ${args.join(' ')}`);
const result = spawnSync(npxBin, args, { stdio: 'inherit' });

if (result.error) {
    console.error('[install-playwright] failed to spawn npx:', result.error);
    process.exit(1);
}

process.exit(result.status ?? 1);
