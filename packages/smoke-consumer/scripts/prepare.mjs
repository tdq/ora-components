#!/usr/bin/env node
// Installs the packed @tdq/ora-components tarball at *run time*, via
// `npm install --no-save --no-package-lock`, instead of recording a versioned
// `file:` path in the tracked package.json. The tarball name is deterministic
// (`tdq-ora-components-<version>.tgz`, from `npm pack`; `@scope/` becomes
// `scope-`) and the version is read fresh from the library's own
// package.json every run, so a library version bump never needs an edit
// here and never dirties this package's package.json.
//
// `--no-save` also matters for the root monorepo: this package is
// deliberately not a member of the root npm workspaces list (see root
// package.json), specifically so a plain `dependencies` entry pointing at a
// git-ignored tarball never ends up recorded in the *root* package-lock.json.
// `--no-package-lock` matters here too: packages/smoke-consumer/package-lock.json
// IS committed (pins the four real devDependencies), and without this flag
// `npm install` would rewrite it to include the tarball's resolved path,
// dirtying a tracked file on every run.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..');
const libraryPkgPath = join(pkgDir, '..', 'ora-components', 'package.json');

const libraryPkg = JSON.parse(readFileSync(libraryPkgPath, 'utf8'));
const tarballName = `tdq-ora-components-${libraryPkg.version}.tgz`;
const tarballPath = join('..', 'ora-components', tarballName);

// No `shell: true` — the npm binary is resolved explicitly instead, which also
// sidesteps Windows needing the `.cmd` shim to be found via shell lookup.
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// `--legacy-peer-deps`: npm 10.7.0's arborist peer-resolution crashes on this tarball's
// `peerDependencies: { rxjs: ^7.8.0 }` with `Cannot read properties of null (reading
// 'edgesOut')`; rxjs is already a devDependency here so peers are satisfied regardless.
console.log(`[prepare] ${npmBin} install --no-save --no-package-lock --legacy-peer-deps ${tarballPath}`);
const result = spawnSync(npmBin, ['install', '--no-save', '--no-package-lock', '--legacy-peer-deps', tarballPath], {
    cwd: pkgDir,
    stdio: 'inherit',
});

if (result.error) {
    console.error('[prepare] failed to spawn npm:', result.error);
    process.exit(1);
}

if (result.status !== 0) {
    process.exit(result.status ?? 1);
}
