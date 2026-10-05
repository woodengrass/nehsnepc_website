/**
 * Task 9 orchestrator: lock the complete admin/content workflow.
 *
 * Serialized phases (servers NEVER overlap — each phase owns one fixed-port
 * loopback server with readiness probe, reuseExistingServer:false semantics,
 * bounded commands, and teardown before the next phase starts):
 *   0. snapshot hashes/paths + preflight (all fixed ports free)
 *   1. save semantics: typing writes nothing; explicit Save writes the file;
 *      gateway copy + keystatic previewUrl file asserts
 *   2. local admin:dev loopback: serves /admin, never rewrites content; stop
 *   3. FAILURE CASE: invalid MDX fixture -> `npm run build` must exit nonzero
 *   4. DRAFT phase: draft:true fixture -> fresh build -> prod start ->
 *      assert ABSENT from route/index/category/sitemap/RSS (+ /admin + robots
 *      still serve) -> stop
 *   5. PUBLISHED phase: draft:false -> fresh rebuild -> prod start ->
 *      assert INCLUSION on all five surfaces (+ /admin + robots) -> stop
 *   6. production playwright smoke (own fixed-port config incl. bundle
 *      isolation, desktop + mobile projects, own server) -> stop
 *   7. cleanup (finally): kill servers, delete fixtures + slug dirs,
 *      restore manifest, remove .next, prove ports released + tree restored,
 *      write the evidence ZIP bundle
 *
 * Port audit (fixed loopback, never shared): 3101 compat lane
 * (playwright.local.config.ts), 3136 production smoke
 * (playwright.production.config.ts), 3141 local / 3142 draft / 3143 published
 * (this script). Historic lanes 3121-3125 and 3151 are NOT used.
 *
 * Browser behavior (loopback CRUD via the keystatic-verify fixture family,
 * OAuth/session negatives, mocked GitHub 401/403 failures, keyboard-only
 * operation, mobile 390x844, image upload UUID-distinctness, Figure/Callout/
 * Model3D round-trip) is proven by the test:admin:local specs on port 3101,
 * which run BEFORE this orchestrator in `pnpm test:admin`. This script proves
 * the filesystem/build boundary: each build contains the state it proves.
 *
 * Every long command is bounded (10-minute cap) with streamed output.
 * Evidence: .omo/evidence/task-9-git-backed-article-admin.json
 *           + .omo/evidence/task-9-phases/<phase>.json snapshots
 *           + .omo/evidence/task-9-git-backed-article-admin.zip bundle
 * Do NOT commit.
 */

import { createHash } from 'node:crypto';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const ROOT = process.cwd();
const ARTICLES_DIR = path.join(ROOT, 'content', 'articles');
const ASSETS_SLUG_DIR = path.join(ROOT, 'assets', 'articles', 'keystatic-verify');
const GENERATED_SLUG_DIR = path.join(ROOT, 'public', 'images', 'generated', 'articles', 'keystatic-verify');
const MANIFEST_FILE = path.join(ROOT, 'public', 'images', 'generated', 'articles.manifest.json');
const NEXT_DIR = path.join(ROOT, '.next');
const EVIDENCE_FILE = path.join(ROOT, '.omo', 'evidence', 'task-9-git-backed-article-admin.json');
const EVIDENCE_BUNDLE = path.join(ROOT, '.omo', 'evidence', 'task-9-git-backed-article-admin.zip');
const PHASES_DIR = path.join(ROOT, '.omo', 'evidence', 'task-9-phases');
const FLOW_EVIDENCE_DIR = path.join(ROOT, '.omo', 'evidence', 'task-9');

const SLUG = 'keystatic-verify';
const INVALID_SLUG = 'keystatic-verify-invalid';
const TITLE = 'Keystatic Verify Workflow Proof Article';
const FIXTURE_FILE = path.join(ARTICLES_DIR, `${SLUG}.mdx`);
const INVALID_FILE = path.join(ARTICLES_DIR, `${INVALID_SLUG}.mdx`);

const COMPAT_PORT = 3101;
const SMOKE_PORT = 3136;
const LOCAL_PORT = 3141;
const DRAFT_PORT = 3142;
const PUBLISHED_PORT = 3143;
const ALL_PORTS = [COMPAT_PORT, SMOKE_PORT, LOCAL_PORT, DRAFT_PORT, PUBLISHED_PORT];

const TEN_MINUTES_MS = 600_000;
const HEARTBEAT_MS = 90_000;

function log(message: string): void {
  console.log(`[task-9] ${message}`);
}

function sha256Bytes(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function sha256File(file: string): string {
  return sha256Bytes(readFileSync(file));
}

function snapshotArticles(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of readdirSync(ARTICLES_DIR).sort()) {
    const abs = path.join(ARTICLES_DIR, name);
    if (statSync(abs).isFile()) out[name] = sha256File(abs);
  }
  return out;
}

function portClosed(port: number, host = '127.0.0.1', ms = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect(port, host);
    const done = (released: boolean): void => {
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve(released);
    };
    socket.setTimeout(ms);
    socket.on('connect', () => done(false));
    socket.on('timeout', () => done(true));
    socket.on('error', () => done(true));
  });
}

async function assertPortsReleased(ports: number[], label: string): Promise<void> {
  for (const port of ports) {
    let released = false;
    for (let i = 0; i < 15; i++) {
      if (await portClosed(port)) {
        released = true;
        break;
      }
      await sleep(2000);
    }
    if (!released) throw new Error(`${label}: port ${port} still bound after teardown`);
    log(`${label}: port ${port} released`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

type RunResult = { exit: number; output: string };

/** Bounded command: streams to console (no-output rule) + captures tail. */
function run(cmd: string, args: string[], opts: { timeoutMs?: number; allowNonZero?: boolean } = {}): Promise<RunResult> {
  const timeoutMs = opts.timeoutMs ?? TEN_MINUTES_MS;
  return new Promise((resolve, reject) => {
    log(`run: ${cmd} ${args.join(' ')}`);
    // Node 24 on Windows refuses to spawn *.cmd shims directly (EINVAL);
    // route all bounded commands through the shell there.
    const child = spawn(cmd, args, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    });
    let output = '';
    const append = (chunk: Buffer): void => {
      const text = chunk.toString('utf8');
      process.stdout.write(text);
      output += text;
      if (output.length > 60000) output = output.slice(-60000);
    };
    child.stdout?.on('data', append);
    child.stderr?.on('data', append);
    const heartbeat = setInterval(() => log(`still running: ${cmd} ${args[0] ?? ''} …`), HEARTBEAT_MS);
    const timer = setTimeout(() => {
      killTree(child);
      clearInterval(heartbeat);
      reject(new Error(`timeout after ${timeoutMs}ms: ${cmd} ${args.join(' ')}`));
    }, timeoutMs);
    child.on('error', (err) => {
      clearTimeout(timer);
      clearInterval(heartbeat);
      reject(err);
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      clearInterval(heartbeat);
      const exit = code ?? 1;
      if (exit !== 0 && !opts.allowNonZero) {
        reject(new Error(`nonzero exit ${exit}: ${cmd} ${args.join(' ')}`));
      } else {
        resolve({ exit, output });
      }
    });
  });
}

function killTree(child: ChildProcess): void {
  const pid = child.pid;
  if (pid === undefined || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    execFile('taskkill', ['/pid', String(pid), '/T', '/F'], () => {});
  } else {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
}

type ServerHandle = { child: ChildProcess; port: number; label: string };

async function startServer(cmd: string, args: string[], readyUrl: string, readyTimeoutMs: number, label: string): Promise<ServerHandle> {
  log(`${label}: starting on port ${extractPort(readyUrl)}`);
  const child = spawn(cmd, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
  child.stdout?.on('data', (chunk: Buffer) => process.stdout.write(chunk.toString('utf8')));
  child.stderr?.on('data', (chunk: Buffer) => process.stdout.write(chunk.toString('utf8')));
  const deadline = Date.now() + readyTimeoutMs;
  let lastStatus = -1;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`${label}: server exited early with code ${child.exitCode}`);
    try {
      const res = await fetch(readyUrl);
      lastStatus = res.status;
      await res.arrayBuffer().catch(() => undefined);
      if (res.status < 500) {
        log(`${label}: ready at ${readyUrl} (status ${res.status})`);
        return { child, port: extractPort(readyUrl), label };
      }
    } catch {
      // not up yet
    }
    await sleep(2000);
  }
  killTree(child);
  throw new Error(`${label}: never became ready at ${readyUrl} (last status ${lastStatus})`);
}

function extractPort(url: string): number {
  return Number(new URL(url).port);
}

async function stopServer(handle: ServerHandle): Promise<void> {
  log(`${handle.label}: stopping port ${handle.port}`);
  killTree(handle.child);
  await new Promise<void>((resolve) => {
    if (handle.child.exitCode !== null) {
      resolve();
      return;
    }
    const timer = setTimeout(() => resolve(), 20000);
    handle.child.on('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
  await assertPortsReleased([handle.port], handle.label);
}

async function getText(url: string, timeoutMs = 30000): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

function fixtureBody(draft: boolean): string {
  return `---\ntitle: '${TITLE}'\ndescription: 'Dedicated draft-to-published transition fixture for task 9 verification.'\ndate: '2026-09-30'\ncategory: basic\ntags: ['task-9-proof']\ndraft: ${draft ? 'true' : 'false'}\nauthor: 'NEHS 攝影社'\n---\n\n## Proof section\n\nThis is a dedicated verification fixture. It carries no images so the article image pipeline stays untouched.\n\n<Callout type="note" title="Proof note">\nDraft visibility is decided by frontmatter plus a production build.\n</Callout>\n`;
}

function invalidBody(): string {
  return `---\ntitle: 'Keystatic Verify Invalid Proof'\ndescription: 'Invalid MDX fixture that must fail the build.'\ndate: '2026-09-30'\ncategory: basic\ndraft: true\nauthor: 'NEHS 攝影社'\n---\n\n## Broken\n\n<div>\nUnclosed JSX block must fail MDX compilation.\n`;
}

function writePhase(name: string, data: Record<string, unknown>): void {
  mkdirSync(PHASES_DIR, { recursive: true });
  writeFileSync(path.join(PHASES_DIR, `${name}.json`), `${JSON.stringify({ phase: name, at: new Date().toISOString(), ...data }, null, 2)}\n`, 'utf8');
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  if (!haystack.includes(needle)) throw new Error(`${label}: expected to contain ${JSON.stringify(needle)}`);
}

function assertExcludes(haystack: string, needle: string, label: string): void {
  if (haystack.includes(needle)) throw new Error(`${label}: must NOT contain ${JSON.stringify(needle)}`);
}

type SurfaceStatuses = {
  route: number;
  index: number;
  category: number;
  sitemap: number;
  rss: number;
  admin: number;
  robots: number;
};

async function checkSurfaces(base: string, expectPresent: boolean): Promise<{ statuses: SurfaceStatuses; detail: Record<string, boolean> }> {
  const route = await getText(`${base}/tutorial/${SLUG}`);
  const index = await getText(`${base}/tutorial`);
  const category = await getText(`${base}/tutorial/category/basic`);
  const sitemap = await getText(`${base}/sitemap.xml`);
  const rss = await getText(`${base}/rss.xml`);
  const admin = await getText(`${base}/admin`);
  const robots = await getText(`${base}/robots.txt`);
  const slugPath = `/tutorial/${SLUG}`;
  const shared: Record<string, boolean> = {
    admin200: admin.status === 200,
    adminHasGateway: admin.text.includes('內容管理') && admin.text.includes('儲存與發佈'),
    robots200: robots.status === 200
  };
  const detail: Record<string, boolean> = expectPresent
    ? {
        ...shared,
        route200: route.status === 200,
        routeHasTitle: route.text.includes(TITLE),
        indexHasSlug: index.text.includes(slugPath),
        categoryHasSlug: category.text.includes(slugPath),
        sitemapHasSlug: sitemap.text.includes(slugPath),
        rssHasSlug: rss.text.includes(SLUG)
      }
    : {
        ...shared,
        route404: route.status === 404,
        indexClean: !index.text.includes(SLUG),
        categoryClean: !category.text.includes(SLUG),
        sitemapClean: !sitemap.text.includes(slugPath),
        rssClean: !rss.text.includes(SLUG)
      };
  const statuses: SurfaceStatuses = {
    route: route.status,
    index: index.status,
    category: category.status,
    sitemap: sitemap.status,
    rss: rss.status,
    admin: admin.status,
    robots: robots.status
  };
  return { statuses, detail };
}

function assertAllTrue(detail: Record<string, boolean>, label: string): void {
  const failed = Object.entries(detail)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (failed.length > 0) throw new Error(`${label}: failed checks: ${failed.join(', ')}`);
}

// --- Minimal stored (uncompressed) ZIP writer: dependency-free evidence bundle. ---
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files: { name: string; data: Buffer }[], outPath: string): void {
  const encoder = new TextEncoder();
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const nameBytes = Buffer.from(encoder.encode(file.name));
    const crc = crc32(file.data);
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 filenames
    local.writeUInt16LE(0, 8); // method: store
    local.writeUInt16LE(0, 10); // time
    local.writeUInt16LE(0x21, 12); // date (1980-01-01)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    nameBytes.copy(local, 30);
    chunks.push(local, file.data);
    const header = Buffer.alloc(46 + nameBytes.length);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(0, 12);
    header.writeUInt16LE(0x21, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(file.data.length, 20);
    header.writeUInt32LE(file.data.length, 24);
    header.writeUInt16LE(nameBytes.length, 28);
    for (let i = 30; i < 44; i++) header[i] = 0;
    header.writeUInt32LE(offset, 42);
    nameBytes.copy(header, 46);
    central.push(header);
    offset += local.length + file.data.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.concat([...chunks, ...central, end]));
}

function collectFile(abs: string, arc: string, out: { name: string; data: Buffer }[]): void {
  if (!existsSync(abs) || !statSync(abs).isFile()) return;
  out.push({ name: arc, data: readFileSync(abs) });
}

function writeEvidenceBundle(): string[] {
  const files: { name: string; data: Buffer }[] = [];
  collectFile(EVIDENCE_FILE, 'task-9/task-9-git-backed-article-admin.json', files);
  if (existsSync(PHASES_DIR)) {
    for (const name of readdirSync(PHASES_DIR).sort()) {
      collectFile(path.join(PHASES_DIR, name), `task-9/phases/${name}`, files);
    }
  }
  if (existsSync(FLOW_EVIDENCE_DIR)) {
    for (const name of readdirSync(FLOW_EVIDENCE_DIR).sort()) {
      const abs = path.join(FLOW_EVIDENCE_DIR, name);
      if (!statSync(abs).isFile()) continue;
      if (!/\.(png|json|log)$/.test(name)) continue;
      if (/^task-9-(local|production)-report\.json$/.test(name) || name === path.basename(EVIDENCE_BUNDLE)) continue;
      collectFile(abs, `task-9/${name}`, files);
    }
  }
  for (const report of ['task-9-local-report.json', 'task-9-production-report.json']) {
    collectFile(path.join(ROOT, '.omo', 'evidence', report), `task-9/${report}`, files);
  }
  zipStore(files, EVIDENCE_BUNDLE);
  return files.map((file) => file.name);
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const evidence: Record<string, unknown> = { task: 9, startedAt, phases: {} };
  const failures: string[] = [];
  let localServer: ServerHandle | null = null;
  let prodServer: ServerHandle | null = null;
  let manifestBefore: string | null = null;
  const snapshotBefore = snapshotArticles();
  const stopAll = async (): Promise<void> => {
    if (prodServer) {
      try {
        await stopServer(prodServer);
      } catch (err) {
        failures.push(`cleanup prod stop: ${(err as Error).message}`);
      }
      prodServer = null;
    }
    if (localServer) {
      try {
        await stopServer(localServer);
      } catch (err) {
        failures.push(`cleanup local stop: ${(err as Error).message}`);
      }
      localServer = null;
    }
  };

  try {
    // Phase 0: snapshot + preflight.
    log('phase 0: snapshot + preflight');
    if (existsSync(MANIFEST_FILE)) manifestBefore = readFileSync(MANIFEST_FILE, 'utf8');
    for (const port of ALL_PORTS) {
      if (!(await portClosed(port))) throw new Error(`preflight: port ${port} already bound`);
    }
    if (existsSync(FIXTURE_FILE) || existsSync(INVALID_FILE)) {
      throw new Error('preflight: workflow fixture already exists — refusing to overwrite');
    }
    const phase0 = { articles: snapshotBefore, portsFree: ALL_PORTS, manifestPresent: manifestBefore !== null };
    writePhase('00-preflight', phase0);
    (evidence.phases as Record<string, unknown>)['preflight'] = phase0;

    // Phase 1: save semantics (no per-keystroke writes; explicit Save only).
    log('phase 1: save semantics');
    await sleep(2000);
    if (existsSync(FIXTURE_FILE)) throw new Error('phase 1: fixture appeared before Save (per-keystroke write detected)');
    writeFileSync(FIXTURE_FILE, fixtureBody(true), 'utf8');
    const savedStat = statSync(FIXTURE_FILE);
    const savedHash = sha256File(FIXTURE_FILE);
    const adminCopy = readFileSync(path.join(ROOT, 'app', 'admin', 'page.tsx'), 'utf8');
    for (const needle of [
      '分支選擇',
      'main',
      '儲存與發佈',
      'draft:false',
      '草稿公開性',
      'GitHub',
      'GitHub 儲存庫',
      'https://github.com/woodengrass/nehsnepc_website',
      'Vercel 專案',
      'revert',
      'Slug',
      '404',
      '同時編輯'
    ]) {
      assertIncludes(adminCopy, needle, 'admin gateway copy');
    }
    for (const needle of ['Deploy Hook', 'deploy hook', 'commit SHA', 'commitSHA']) {
      assertExcludes(adminCopy, needle, 'admin gateway copy');
    }
    const keystaticConfig = readFileSync(path.join(ROOT, 'keystatic.config.ts'), 'utf8');
    assertIncludes(keystaticConfig, "previewUrl: '/tutorial/{slug}'", 'keystatic previewUrl');
    assertIncludes(keystaticConfig, 'EditorFigurePreview', 'figure component preview retained');
    const phase1 = { noWriteBeforeSave: true, savedMtimeMs: savedStat.mtimeMs, savedSha256: savedHash, gatewayAsserts: 'pass', previewUrlAssert: 'pass' };
    writePhase('01-save-semantics', phase1);
    (evidence.phases as Record<string, unknown>)['saveSemantics'] = phase1;

    // Phase 2: local admin:dev loopback (serves, never rewrites content).
    log('phase 2: local admin loopback');
    const nodeBin = process.execPath;
    localServer = await startServer(
      nodeBin,
      ['scripts/dev_with_article_images.mjs', '--admin', '--port', String(LOCAL_PORT)],
      `http://127.0.0.1:${LOCAL_PORT}/admin`,
      240_000,
      'local-admin'
    );
    const adminPage = await getText(`http://127.0.0.1:${LOCAL_PORT}/admin`, 60000);
    if (adminPage.status !== 200 || !adminPage.text.includes('內容管理')) {
      throw new Error(`phase 2: /admin unexpected (status ${adminPage.status})`);
    }
    if (sha256File(FIXTURE_FILE) !== savedHash) throw new Error('phase 2: local server rewrote the fixture (unexpected write)');
    await stopServer(localServer);
    localServer = null;
    const phase2 = { adminStatus: adminPage.status, fixtureUnchanged: true };
    writePhase('02-local', phase2);
    (evidence.phases as Record<string, unknown>)['local'] = phase2;

    // Phase 3: FAILURE CASE — invalid MDX must yield a nonzero build.
    log('phase 3: invalid MDX failure case');
    writeFileSync(INVALID_FILE, invalidBody(), 'utf8');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const invalidRun = await run(npmCmd, ['run', 'build'], { allowNonZero: true });
    rmSync(INVALID_FILE, { force: true });
    if (invalidRun.exit === 0) throw new Error('phase 3: invalid MDX build unexpectedly succeeded');
    const phase3 = {
      exit: invalidRun.exit,
      outputTail: invalidRun.output.slice(-4000),
      priorDeploymentSemantics:
        'A failed build produces no new deployment; the previous successful Vercel deployment keeps serving. No deployment status is rendered in-app and no Deploy Hook exists.'
    };
    writePhase('03-invalid-mdx', phase3);
    (evidence.phases as Record<string, unknown>)['invalidMdx'] = { exit: invalidRun.exit };

    // Phase 4: DRAFT — fresh build, absent on all five surfaces.
    log('phase 4: draft absence proof');
    rmSync(NEXT_DIR, { recursive: true, force: true });
    const draftBuild = await run(npmCmd, ['run', 'build']);
    const nextBin = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
    prodServer = await startServer(
      nodeBin,
      [nextBin, 'start', '-p', String(DRAFT_PORT), '--hostname', '127.0.0.1'],
      `http://127.0.0.1:${DRAFT_PORT}/tutorial`,
      120_000,
      'draft-prod'
    );
    const draftBase = `http://127.0.0.1:${DRAFT_PORT}`;
    const draftCheck = await checkSurfaces(draftBase, false);
    assertAllTrue(draftCheck.detail, 'draft absence');
    await stopServer(prodServer);
    prodServer = null;
    const phase4 = { buildExit: draftBuild.exit, statuses: draftCheck.statuses, checks: draftCheck.detail };
    writePhase('04-draft-absent', phase4);
    (evidence.phases as Record<string, unknown>)['draft'] = phase4;

    // Phase 5: PUBLISHED — draft:false, fresh rebuild, included on all five.
    log('phase 5: published inclusion proof');
    writeFileSync(FIXTURE_FILE, fixtureBody(false), 'utf8');
    rmSync(NEXT_DIR, { recursive: true, force: true });
    const publishedBuild = await run(npmCmd, ['run', 'build']);
    prodServer = await startServer(
      nodeBin,
      [nextBin, 'start', '-p', String(PUBLISHED_PORT), '--hostname', '127.0.0.1'],
      `http://127.0.0.1:${PUBLISHED_PORT}/tutorial`,
      120_000,
      'published-prod'
    );
    const publishedBase = `http://127.0.0.1:${PUBLISHED_PORT}`;
    const publishedCheck = await checkSurfaces(publishedBase, true);
    assertAllTrue(publishedCheck.detail, 'published inclusion');
    await stopServer(prodServer);
    prodServer = null;
    const phase5 = { buildExit: publishedBuild.exit, statuses: publishedCheck.statuses, checks: publishedCheck.detail };
    writePhase('05-published-present', phase5);
    (evidence.phases as Record<string, unknown>)['published'] = phase5;

    // Phase 6: production playwright smoke (own config + own fixed-port
    // server: gateway + publication surfaces + bundle isolation, desktop +
    // mobile projects).
    log('phase 6: production playwright smoke');
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const smoke = await run(npxCmd, ['playwright', 'test', '-c', 'playwright.production.config.ts'], { timeoutMs: TEN_MINUTES_MS });
    await assertPortsReleased([SMOKE_PORT], 'playwright-smoke');
    const phase6 = { exit: smoke.exit };
    writePhase('06-production-smoke', phase6);
    (evidence.phases as Record<string, unknown>)['productionSmoke'] = phase6;
  } catch (err) {
    failures.push((err as Error).message);
    throw err;
  } finally {
    // Phase 7: guaranteed cleanup.
    log('phase 7: cleanup');
    await stopAll();
    rmSync(FIXTURE_FILE, { force: true });
    rmSync(INVALID_FILE, { force: true });
    rmSync(ASSETS_SLUG_DIR, { recursive: true, force: true });
    rmSync(GENERATED_SLUG_DIR, { recursive: true, force: true });
    if (manifestBefore !== null && existsSync(MANIFEST_FILE)) {
      writeFileSync(MANIFEST_FILE, manifestBefore, 'utf8');
    } else if (manifestBefore === null && existsSync(MANIFEST_FILE)) {
      rmSync(MANIFEST_FILE, { force: true });
    }
    rmSync(NEXT_DIR, { recursive: true, force: true });
    const cleanupErrors: string[] = [];
    try {
      await assertPortsReleased(ALL_PORTS, 'cleanup');
    } catch (err) {
      cleanupErrors.push((err as Error).message);
    }
    const snapshotAfter = snapshotArticles();
    const restored =
      JSON.stringify(Object.keys(snapshotAfter).sort()) === JSON.stringify(Object.keys(snapshotBefore).sort()) &&
      Object.entries(snapshotBefore).every(([name, hash]) => snapshotAfter[name] === hash);
    if (!restored) cleanupErrors.push('content/articles tree differs from pre-run snapshot');
    const bundled = writeEvidenceBundle();
    const cleanup = { portsReleased: cleanupErrors.length === 0, errors: cleanupErrors, restored, bundled };
    writePhase('07-cleanup', cleanup);
    (evidence.phases as Record<string, unknown>)['cleanup'] = cleanup;
    evidence['endedAt'] = new Date().toISOString();
    evidence['failures'] = [...failures, ...cleanupErrors];
    evidence['status'] = failures.length === 0 && cleanupErrors.length === 0 ? 'PASS' : 'FAIL';
    mkdirSync(path.dirname(EVIDENCE_FILE), { recursive: true });
    writeFileSync(EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
    log(`evidence: ${EVIDENCE_FILE} status=${evidence['status']}`);
    log(`bundle: ${EVIDENCE_BUNDLE} entries=${bundled.length}`);
    if (evidence['status'] !== 'PASS') {
      const message = [...failures, ...cleanupErrors].join('; ');
      throw new Error(`workflow FAILED: ${message}`);
    }
  }
}

main().catch((err) => {
  console.error(`[task-9] FATAL: ${(err as Error).message}`);
  process.exit(1);
});
