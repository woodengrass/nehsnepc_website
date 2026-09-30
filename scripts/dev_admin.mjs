#!/usr/bin/env node
/**
 * admin:dev launcher (cross-platform, no shell-specific syntax).
 * - Forces local Keystatic mode via NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE=1.
 * - Runs the article-image generator when present, else no-ops.
 * - Binds Next to 127.0.0.1 only, forwards signals, kills the child tree.
 */
import { existsSync } from 'node:fs';
import { spawn, execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

function parsePort(argv) {
  const idx = argv.findIndex((a) => a === '--port' || a === '-p');
  if (idx >= 0 && argv[idx + 1]) {
    const n = Number(argv[idx + 1]);
    if (Number.isInteger(n) && n > 0 && n < 65536) return n;
  }
  const envPort = Number(process.env.PORT);
  if (Number.isInteger(envPort) && envPort > 0 && envPort < 65536) return envPort;
  return 3000;
}

const port = parsePort(process.argv.slice(2));

process.env.NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE = '1';
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

const GENERATOR_CANDIDATES = [
  'scripts/generate_article_images.mjs',
  'scripts/generate-article-images.mjs',
  'scripts/article-images.mjs',
  'scripts/article_images.mjs'
];

async function runGeneratorIfPresent() {
  for (const rel of GENERATOR_CANDIDATES) {
    const abs = path.join(root, rel);
    if (existsSync(abs)) {
      console.log(`[admin:dev] running article-image generator: ${rel}`);
      await new Promise((resolve) => {
        const child = spawn(process.execPath, [abs], { cwd: root, stdio: 'inherit' });
        child.on('exit', (code) => {
          if (code !== 0) console.warn(`[admin:dev] generator exited with code ${code}`);
          resolve();
        });
        child.on('error', (err) => {
          console.warn(`[admin:dev] generator failed: ${err.message}`);
          resolve();
        });
      });
      return;
    }
  }
  console.log('[admin:dev] no article-image generator present, skipping');
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

await runGeneratorIfPresent();

const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const args = [nextBin, 'dev', '--hostname', '127.0.0.1', '--port', String(port)];
console.log(`[admin:dev] starting Next dev on http://127.0.0.1:${port} (local Keystatic mode)`);

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
  console.log(`[admin:dev] received ${signal}, stopping child ${child.pid}`);
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
    console.log(`[admin:dev] child exited code=${code} signal=${signal}`);
  }
  process.exit(code ?? (signal ? 1 : 0));
});
child.on('error', (err) => {
  console.error(`[admin:dev] failed to start Next: ${err.message}`);
  process.exit(1);
});
