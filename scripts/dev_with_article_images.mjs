#!/usr/bin/env node
/**
 * Unified dev launcher (cross-platform, no shell-specific syntax).
 *
 * Supersedes `scripts/dev_admin.mjs` (deleted): normal `dev` and `admin:dev`
 * are modes of this one launcher.
 *
 * - Before Next: generate article outputs + manifest
 *   (`scripts/optimize_article_images.js`, skip-unchanged so warm restarts
 *   stay instant and committed non-article binaries are never touched).
 * - While Next runs: recursively watch `assets/articles/` (node:fs only, no
 *   chokidar), debounce, serialize regenerations with no overlap, write
 *   atomically (the generator does tmp+rename), forward signals, kill the
 *   watcher/child tree (incl. win32 taskkill).
 * - Admin mode (`--admin` argv or `ADMIN_MODE=1` env): sets
 *   `NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE=1` and binds Next to 127.0.0.1 only.
 *   Normal dev mode performs the same generation + watch WITHOUT the local
 *   flag. Only admin mode sets local storage.
 */

import { existsSync } from 'node:fs';
import { watch } from 'node:fs';
import { spawn, execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const TAG = '[dev]';

const argv = process.argv.slice(2);
const ADMIN = argv.includes('--admin') || process.env.ADMIN_MODE === '1';

function parsePort(args) {
  const idx = args.findIndex((a) => a === '--port' || a === '-p');
  if (idx >= 0 && args[idx + 1]) {
    const n = Number(args[idx + 1]);
    if (Number.isInteger(n) && n > 0 && n < 65536) return n;
  }
  const envPort = Number(process.env.PORT);
  if (Number.isInteger(envPort) && envPort > 0 && envPort < 65536) return envPort;
  return 3000;
}

const port = parsePort(argv);

if (ADMIN) {
  process.env.NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE = '1';
}
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

const GENERATOR = path.join(root, 'scripts', 'optimize_article_images.js');
const WATCH_ROOT = path.join(root, 'assets', 'articles');
const DEBOUNCE_MS = 400;

function runGenerator(reason) {
  return new Promise((resolve) => {
    if (!existsSync(GENERATOR)) {
      console.log(`${TAG} no article-image generator present, skipping (${reason})`);
      resolve();
      return;
    }
    console.log(`${TAG} generating article images (${reason})`);
    const child = spawn(process.execPath, [GENERATOR], { cwd: root, stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code !== 0) console.warn(`${TAG} generator exited with code ${code}`);
      resolve();
    });
    child.on('error', (err) => {
      console.warn(`${TAG} generator failed: ${err.message}`);
      resolve();
    });
  });
}

function killTree(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const pid = child.pid;
  if (typeof pid !== 'number') return;
  if (process.platform === 'win32') {
    execFile('taskkill', ['/pid', String(pid), '/T', '/F'], () => {});
  } else {
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      try {
        child.kill('SIGTERM');
      } catch {}
    }
  }
}

// --- pregeneration (manifest-first, before Next) ------------------------------
await runGenerator('startup');

// --- watcher: debounced, serialized, no overlap --------------------------------
let watcher = null;
let regenRunning = false;
let regenQueued = false;

async function regenLoop() {
  if (regenRunning) {
    regenQueued = true;
    return;
  }
  regenRunning = true;
  try {
    await runGenerator('watch');
    while (regenQueued) {
      regenQueued = false;
      await runGenerator('watch (coalesced)');
    }
  } finally {
    regenRunning = false;
  }
}

function startWatcher() {
  if (!existsSync(WATCH_ROOT)) {
    console.log(`${TAG} watch root missing, skipping watch: ${path.relative(root, WATCH_ROOT)}`);
    return;
  }
  let fsWatcher;
  try {
    // `recursive` is honored on win32 + macOS; on Linux it throws — degrade
    // to a startup-only generation with a clear log instead of crashing.
    fsWatcher = watch(WATCH_ROOT, { recursive: true }, () => scheduleRegen());
  } catch (error) {
    console.warn(`${TAG} recursive watch unsupported on this platform (${error.message}); startup generation only`);
    return;
  }
  fsWatcher.on('error', (error) => {
    console.warn(`${TAG} watcher error: ${error.message}`);
  });
  watcher = fsWatcher;
  console.log(`${TAG} watching ${path.relative(root, WATCH_ROOT)} (debounced, serialized)`);
}

let debounceTimer = null;
function scheduleRegen() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void regenLoop();
  }, DEBOUNCE_MS);
}

startWatcher();

// --- Next child ----------------------------------------------------------------
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const args = [nextBin, 'dev', '--port', String(port)];
if (ADMIN) args.push('--hostname', '127.0.0.1');
console.log(`${TAG} starting Next dev on http://127.0.0.1:${port}${ADMIN ? ' (local Keystatic mode)' : ''}`);

const child = spawn(process.execPath, args, {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  ...(process.platform === 'win32' ? {} : { detached: true })
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${TAG} received ${signal}, stopping child ${child.pid}`);
  if (debounceTimer) clearTimeout(debounceTimer);
  try {
    watcher?.close();
  } catch {}
  killTree(child);
  const force = setTimeout(() => {
    try {
      if (process.platform === 'win32') execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], () => {});
      else child.kill('SIGKILL');
    } catch {}
  }, 8000);
  force.unref?.();
}

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  try {
    process.on(sig, () => shutdown(sig));
  } catch {}
}

child.on('exit', (code, signal) => {
  if (!shuttingDown) {
    console.log(`${TAG} child exited code=${code} signal=${signal}`);
  }
  process.exit(code ?? (signal ? 1 : 0));
});
child.on('error', (err) => {
  console.error(`${TAG} failed to start Next: ${err.message}`);
  process.exit(1);
});
