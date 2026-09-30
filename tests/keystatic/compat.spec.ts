import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import { ARTICLE_IMAGE_MAX_BYTES, figureTransformFilename } from '../../lib/keystatic/image-naming';
import {
  buildMissingSecretsResponse,
  getGithubSecretsStatus,
  getStorageKind,
  isLocalMode
} from '../../lib/keystatic/storage';

const ROOT = process.cwd();
const ARTICLES_DIR = path.join(ROOT, 'content', 'articles');
const ASSETS_DIR = path.join(ROOT, 'public', 'images', 'articles');
const HERO_SRC = path.join(ROOT, 'assets', 'sources', 'hero-1.jpg');
const CONTACT_SRC = path.join(ROOT, 'assets', 'sources', 'contact-bg.jpg');

const FIXTURES = [
  { slug: 'compat-gate-example', source: 'example.mdx' },
  { slug: 'compat-gate-exposure', source: 'exposure_and_brightness.mdx' }
] as const;

const TITLE_PROBE: Record<string, string> = {
  'compat-gate-example': 'Compat Gate Title Example',
  'compat-gate-exposure': 'Compat Gate Title Exposure'
};
const CALLOUT_PROBE = 'Compat Callout Probe';

const UUID_RE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function listAssetFiles(): string[] {
  if (!existsSync(ASSETS_DIR)) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const abs = path.join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else out.push(path.relative(ROOT, abs));
    }
  };
  walk(ASSETS_DIR);
  return out.sort();
}

function extractCover(mdx: string): string | null {
  const m = mdx.match(/^cover:\s*(.+?)\s*$/m);
  if (!m) return null;
  return m[1].replace(/^['"]|['"]$/g, '').trim() || null;
}

function extractFigureSrcs(mdx: string): string[] {
  const srcs: string[] = [];
  const re = /<Figure[^>]*\bsrc=(?:"([^"]+)"|'([^']+)'|\{["']([^"']+)["']\})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mdx)) !== null) srcs.push(m[1] ?? m[2] ?? m[3]);
  return srcs;
}

function extractPoster(mdx: string): string | null {
  const m = mdx.match(/<Model3D[^>]*\bposter=(?:"([^"]+)"|'([^']+)')/);
  return m ? (m[1] ?? m[2]) : null;
}

const snapshots = new Map<string, { bytes: Buffer; hash: string }>();
let assetsBefore: string[] = [];
const notes: string[] = [];
const imageSerializations: Record<string, { cover: string | null; figures: string[]; poster: string | null }> = {};

test.describe('keystatic compat gate (local loopback)', () => {
  test.beforeAll(async () => {
    assetsBefore = listAssetFiles();
    for (const fx of FIXTURES) {
      const src = path.join(ARTICLES_DIR, fx.source);
      const dst = path.join(ARTICLES_DIR, `${fx.slug}.mdx`);
      const bytes = readFileSync(src);
      snapshots.set(fx.source, { bytes, hash: createHash('sha256').update(bytes).digest('hex') });
      writeFileSync(dst, bytes);
      notes.push(`snapshot ${fx.source} sha256=${snapshots.get(fx.source)!.hash} bytes=${bytes.length}`);
    }
    // 8 MiB budget: 5,557,991-byte hero must be valid.
    const heroBytes = statSync(HERO_SRC).size;
    const contactBytes = statSync(CONTACT_SRC).size;
    notes.push(`hero-1.jpg bytes=${heroBytes} contact-bg.jpg bytes=${contactBytes} budget=${ARTICLE_IMAGE_MAX_BYTES}`);
    expect(ARTICLE_IMAGE_MAX_BYTES).toBe(8 * 1024 * 1024);
    expect(heroBytes).toBe(5_557_991);
    expect(heroBytes).toBeLessThanOrEqual(ARTICLE_IMAGE_MAX_BYTES);
    expect(contactBytes).toBeLessThanOrEqual(ARTICLE_IMAGE_MAX_BYTES);

    // Two-same-basename collision proof on the final transform (unit-level).
    const a = figureTransformFilename('contact-bg.jpg');
    const b = figureTransformFilename('contact-bg.jpg');
    notes.push(`transformFilename a=${a} b=${b}`);
    expect(a).not.toBe(b);
    expect(a).toMatch(new RegExp(`^${UUID_RE}-contact-bg\\.jpg$`));
    expect(b).toMatch(new RegExp(`^${UUID_RE}-contact-bg\\.jpg$`));
  });

  test.afterAll(async () => {
    const restored: Record<string, boolean> = {};
    for (const fx of FIXTURES) {
      const dst = path.join(ARTICLES_DIR, `${fx.slug}.mdx`);
      if (existsSync(dst)) rmSync(dst, { force: true });
      const orig = path.join(ARTICLES_DIR, fx.source);
      const snap = snapshots.get(fx.source);
      if (snap && existsSync(orig)) {
        const now = readFileSync(orig);
        if (!now.equals(snap.bytes)) {
          writeFileSync(orig, snap.bytes);
          notes.push(`RESTORED mutated original ${fx.source}`);
        }
        restored[fx.source] = sha256(orig) === snap.hash;
      } else if (snap) {
        mkdirSync(ARTICLES_DIR, { recursive: true });
        writeFileSync(orig, snap.bytes);
        restored[fx.source] = true;
        notes.push(`RESTORED missing original ${fx.source}`);
      }
    }
    // Remove only assets created during this run.
    const after = listAssetFiles();
    for (const rel of after) {
      if (!assetsBefore.includes(rel)) {
        rmSync(path.join(ROOT, rel), { force: true });
        notes.push(`removed disposable asset ${rel}`);
      }
    }
    // Remove now-empty disposable directories (never touch pre-existing files).
    if (existsSync(ASSETS_DIR) && assetsBefore.length === 0 && listAssetFiles().length === 0) {
      rmSync(ASSETS_DIR, { recursive: true, force: true });
      notes.push('removed empty public/images/articles');
    }
    writeFileSync(
      path.join(ROOT, '.omo', 'evidence', 'task-1-playwright-notes.log'),
      `${notes.join('\n')}\nrestore=${JSON.stringify(restored)}\n`
    );
  });

  test('storage switch + secrets-missing 503 (no local fallback)', async ({ request }) => {
    expect(isLocalMode({ NODE_ENV: 'development', NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE: '1' } as NodeJS.ProcessEnv)).toBe(true);
    expect(isLocalMode({ NODE_ENV: 'development', NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE: '0' } as NodeJS.ProcessEnv)).toBe(false);
    expect(isLocalMode({ NODE_ENV: 'production', NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE: '1' } as NodeJS.ProcessEnv)).toBe(false);
    expect(getStorageKind({ NODE_ENV: 'development', NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE: '1' } as NodeJS.ProcessEnv)).toBe('local');
    expect(getStorageKind({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe('github');

    const missing = getGithubSecretsStatus({} as NodeJS.ProcessEnv);
    expect(missing.ok).toBe(false);
    expect(missing.missing).toEqual(
      expect.arrayContaining(['KEYSTATIC_GITHUB_CLIENT_ID', 'KEYSTATIC_GITHUB_CLIENT_SECRET', 'KEYSTATIC_SECRET'])
    );
    const res = buildMissingSecretsResponse(missing);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.missing).toEqual(expect.arrayContaining(['KEYSTATIC_GITHUB_CLIENT_ID']));
    // Redaction: fake secret values must never appear in the 503 body.
    const leaked = JSON.stringify(body);
    expect(leaked).not.toContain('ghp-fake-secret-value-123');
    expect(leaked).not.toContain('super-secret-session-value-1234567890');

    // Live loopback server runs in local mode: API must NOT answer 503.
    const live = await request.get('/api/keystatic/__compat-probe');
    notes.push(`live GET /api/keystatic/__compat-probe status=${live.status()}`);
    expect(live.status()).not.toBe(503);
  });

  test('admin loads with article collection', async ({ page }) => {
    await page.goto('/keystatic', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Articles', { exact: false }).first()).toBeVisible({ timeout: 90_000 });
  });

  for (const fx of FIXTURES) {
    test(`migrate ${fx.slug} through real image controls`, async ({ page }) => {
      const file = path.join(ARTICLES_DIR, `${fx.slug}.mdx`);
      await openEntry(page, fx.slug);

      // Title field must be editable (slug-field name input).
      const titleInput = page.getByLabel(/title/i).first();
      await expect(titleInput).toBeVisible({ timeout: 60_000 });

      // Cover <- hero-1.jpg through the top-level image control (native file
      // chooser; Keystatic renders no persistent <input type=file>).
      await uploadThroughChooser(
        page,
        page.getByRole('button', { name: 'Choose file', exact: true }).first(),
        HERO_SRC
      );
      notes.push(`${fx.slug} cover uploaded`);

      // Figure src <- contact-bg.jpg through the Figure block modal: find the
      // block whose modal shows Width/Height, upload, confirm with Done.
      await uploadFigureThroughModal(page, CONTACT_SRC);
      notes.push(`${fx.slug} figure uploaded`);

      await saveEntry(page, fx.slug);
      await expect
        .poll(() => readFileSync(file, 'utf8'), { timeout: 120_000 })
        .toMatch(/hero-1/i);
      const after = readFileSync(file, 'utf8');
      const cover = extractCover(after);
      const figures = extractFigureSrcs(after);
      const poster = extractPoster(after);
      notes.push(`${fx.slug} cover=${cover} figures=${JSON.stringify(figures)} poster=${poster}`);
      // Keystatic 0.6.9 documents top-level fields.image naming as
      // `<fieldKey>.<ext>` under `<publicPath><slug>/` (transformFilename
      // applies only inside MDX editors): the hero-1.jpg bytes migrate via
      // the real top-level image control but serialize under the forced
      // field-key name. Byte identity (SHA-256 vs the hero-1.jpg source) is
      // the migration proof — strictly stronger than a basename substring.
      const forcedCover = `/images/articles/${fx.slug}/cover.jpg`;
      expect(cover, 'cover must migrate through the real image control to the documented field-key path').toBe(
        forcedCover
      );
      expect(sha256(path.join(ROOT, 'public', forcedCover.replace(/^\//, ''))), 'cover bytes must equal hero-1.jpg').toBe(
        sha256(HERO_SRC)
      );
      expect(figures.length, 'Figure src must exist').toBeGreaterThanOrEqual(1);
      expect(figures[0], 'Figure src must migrate to contact-bg upload').toMatch(/contact-bg\.jpg$/i);
      expect(figures[0], 'Figure path must be uuid-collision-safe').toMatch(new RegExp(`${UUID_RE}-contact-bg\\.jpg$`, 'i'));
      // Model3D.poster stays a text path (no upload, no uuid).
      expect(poster).toBe('/images/generated/hero-1280.webp');
      // Uploaded bytes must exist on disk under public/.
      for (const p of [cover, ...figures].filter(Boolean) as string[]) {
        if (p.startsWith('/')) {
          const abs = path.join(ROOT, 'public', p.replace(/^\//, ''));
          expect(existsSync(abs), `uploaded file must exist: ${p}`).toBe(true);
        }
      }
      imageSerializations[fx.slug] = { cover, figures, poster };

      // No-op equality: save again without changes -> byte-for-byte identical.
      const h1 = sha256(file);
      await saveEntry(page, fx.slug);
      const h2 = sha256(file);
      notes.push(`${fx.slug} noop h1=${h1} h2=${h2}`);
      expect(h2).toBe(h1);
    });

    test(`exact title + Callout delta on ${fx.slug}`, async ({ page }) => {
      const file = path.join(ARTICLES_DIR, `${fx.slug}.mdx`);
      const before = readFileSync(file, 'utf8');
      const beforeHash = sha256(file);
      await openEntry(page, fx.slug);

      const titles = page.getByLabel(/title/i);
      await expect(titles.first()).toBeVisible({ timeout: 60_000 });
      await titles.first().fill(TITLE_PROBE[fx.slug]);
      // First Callout block title lives inside its Edit modal (discriminated
      // by the Type field); the newly appeared Title input is the modal's.
      const titleCountBefore = await titles.count();
      await editFirstBlockWith(page, 'Callout', async () => {
        const modalTitle = page.getByLabel(/title/i).nth(titleCountBefore);
        await modalTitle.waitFor({ state: 'visible', timeout: 30_000 });
        await modalTitle.fill(CALLOUT_PROBE);
      });
      notes.push(`${fx.slug} callout title edited`);

      await saveEntry(page, fx.slug);
      await expect.poll(() => readFileSync(file, 'utf8'), { timeout: 120_000 }).toContain(TITLE_PROBE[fx.slug]);
      const after = readFileSync(file, 'utf8');
      expect(after).toContain(TITLE_PROBE[fx.slug]);
      expect(after).toContain(CALLOUT_PROBE);
      expect(sha256(file)).not.toBe(beforeHash);
      // Image serializations must be preserved across the delta save.
      const prev = imageSerializations[fx.slug];
      if (prev) {
        expect(extractCover(after)).toBe(prev.cover);
        expect(extractFigureSrcs(after)).toEqual(prev.figures);
      }
      expect(extractPoster(after)).toBe('/images/generated/hero-1280.webp');
      // Semantic diff for evidence (title + callout lines only, plus prior image migration).
      const diffPath = path.join(ROOT, '.omo', 'evidence', `task-1-diff-${fx.slug}.txt`);
      mkdirSync(path.dirname(diffPath), { recursive: true });
      writeFileSync(diffPath, semanticDiff(before, after));
      void diffPath;
    });
  }

  test('same-basename Figure uploads stay collision-safe across entries', async () => {
    const a = imageSerializations['compat-gate-example']?.figures[0];
    const b = imageSerializations['compat-gate-exposure']?.figures[0];
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    notes.push(`cross-entry figures a=${a} b=${b}`);
    expect(a).not.toBe(b);
    expect(a).toMatch(/contact-bg\.jpg$/i);
    expect(b).toMatch(/contact-bg\.jpg$/i);
  });
});

async function uploadThroughChooser(
  page: import('@playwright/test').Page,
  button: import('@playwright/test').Locator,
  filePath: string,
  settleScope?: import('@playwright/test').Locator
) {
  // Keystatic 0.6.9 image fields render NO persistent <input type="file">: the
  // file input is created transiently (document.createElement('input')) when
  // the visible "Choose file" button is clicked (see
  // node_modules/@keystatic/core/dist/index-*.js "Choose file"). Drive the
  // native file chooser instead of polling for a file input.
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 30_000 }),
    button.click({ timeout: 15_000 })
  ]);
  await chooser.setFiles(filePath);
  // Settle: the uploaded field flips Choose file -> Remove once the value commits.
  const scope = settleScope ?? page;
  await expect
    .poll(async () => scope.getByRole('button', { name: 'Remove', exact: true }).count(), { timeout: 60_000 })
    .toBeGreaterThanOrEqual(1);
}

async function uploadFigureThroughModal(page: import('@playwright/test').Page, filePath: string) {
  // The Figure block lives inside the MDX document editor: open each block
  // Edit modal in document order until the dialog shows the Figure schema
  // (Width/Height labels). Confirm with the dialog's Done button.
  const edits = page.getByRole('button', { name: 'Edit', exact: true });
  const total = await edits.count();
  const dialog = page.getByRole('dialog');
  let opened = false;
  for (let i = 0; i < total; i++) {
    await edits.nth(i).click({ timeout: 15_000 });
    await page.waitForTimeout(1_500);
    const widthVisible = await dialog.getByText('Width', { exact: true }).first().isVisible().catch(() => false);
    const heightVisible = await dialog.getByText('Height', { exact: true }).first().isVisible().catch(() => false);
    if (widthVisible || heightVisible) {
      opened = true;
      break;
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1_000);
  }
  if (!opened) throw new Error('Figure block Edit modal (Width/Height) not found');
  // Fixture Figure src points outside the image directory, so the modal shows
  // Choose file; defensively clear a stale value first (dialog-scoped only).
  const modalRemove = dialog.getByRole('button', { name: 'Remove', exact: true });
  if ((await modalRemove.count()) > 0) {
    await modalRemove.first().click({ timeout: 15_000 });
    await expect
      .poll(async () => dialog.getByRole('button', { name: 'Choose file', exact: true }).count(), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(1);
  }
  await uploadThroughChooser(
    page,
    dialog.getByRole('button', { name: 'Choose file', exact: true }).first(),
    filePath,
    dialog
  );
  await dialog.getByRole('button', { name: 'Done' }).first().click({ timeout: 15_000 });
  await page.waitForTimeout(1_500);
}

async function editFirstBlockWith(
  page: import('@playwright/test').Page,
  label: string,
  fn: () => Promise<void>
) {
  // Open component-block Edit modals in document order; the Callout schema is
  // discriminated by its Type select field (Figure/Model3D have no Type).
  // Confirm with the dialog's Done button so the modal Title edit commits.
  const edits = page.getByRole('button', { name: 'Edit', exact: true });
  const total = await edits.count();
  const dialog = page.getByRole('dialog');
  let opened = false;
  for (let i = 0; i < total; i++) {
    await edits.nth(i).click({ timeout: 15_000 });
    await page.waitForTimeout(1_500);
    if (label === 'Callout') {
      const typeVisible = await dialog.getByText('Type', { exact: true }).first().isVisible().catch(() => false);
      if (typeVisible) {
        opened = true;
        break;
      }
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1_000);
  }
  if (!opened) throw new Error(`${label} block Edit modal not found`);
  await fn();
  await dialog.getByRole('button', { name: 'Done' }).first().click({ timeout: 15_000 });
  await page.waitForTimeout(1_500);
}

async function openEntry(page: import('@playwright/test').Page, slug: string) {
  await page.goto('/keystatic', { waitUntil: 'domcontentloaded' });
  await page.getByText('Articles', { exact: false }).first().waitFor({ timeout: 90_000 });
  // Dashboard -> collection entry list.
  const collectionLink = page.getByRole('link', { name: /articles/i }).first();
  try {
    await collectionLink.waitFor({ state: 'visible', timeout: 15_000 });
    await collectionLink.click({ timeout: 15_000 });
  } catch {
    await page.getByText('Articles', { exact: false }).first().click({ timeout: 15_000 });
  }
  await page.getByText(slug, { exact: false }).first().waitFor({ timeout: 60_000 });
  await page.getByText(slug, { exact: false }).first().click({ timeout: 30_000 });
}

async function saveEntry(page: import('@playwright/test').Page, slug: string) {
  const candidates = [/^save$/i, /^update$/i, /^create$/i, /save changes/i];
  let clicked = '';
  for (const name of candidates) {
    const btn = page.getByRole('button', { name });
    try {
      await btn.first().waitFor({ state: 'visible', timeout: 5_000 });
      await btn.first().click({ timeout: 10_000 });
      clicked = String(name);
      break;
    } catch {
      continue;
    }
  }
  if (!clicked) {
    // Fallback: any enabled button mentioning save (Keystatic wording varies by version).
    const fallback = page.getByRole('button', { name: /sav/i });
    await fallback.first().click({ timeout: 15_000 });
    clicked = 'fallback:/sav/i';
  }
  notes.push(`${slug} save clicked via ${clicked}`);
  // Confirm via filesystem settle: wait until the entry file stops changing.
  const file = path.join(process.cwd(), 'content', 'articles', `${slug}.mdx`);
  let last = '';
  const deadline = Date.now() + 90_000;
  await page.waitForTimeout(2_000);
  while (Date.now() < deadline) {
    try {
      const cur = readFileSync(file, 'utf8');
      if (cur === last && cur.length > 0) {
        await page.waitForTimeout(2_000);
        const again = readFileSync(file, 'utf8');
        if (again === cur) return;
      }
      last = cur;
    } catch {
      // File may briefly disappear during atomic write; keep waiting.
    }
    await page.waitForTimeout(1_500);
  }
}

function semanticDiff(before: string, after: string): string {
  const b = before.split('\n');
  const a = after.split('\n');
  const out: string[] = [];
  const max = Math.max(b.length, a.length);
  for (let i = 0; i < max; i++) {
    if (b[i] !== a[i]) out.push(`line ${i + 1}:\n- ${b[i] ?? '<eof>'}\n+ ${a[i] ?? '<eof>'}`);
  }
  return out.join('\n');
}
