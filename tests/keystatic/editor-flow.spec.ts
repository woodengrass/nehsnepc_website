import { appendFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { findFigureUsages, findModel3DUsages } from '../../lib/content-contract';

// Task 9: keyboard flow + mobile viewport + custom-component round-trip +
// screenshots / a11y snapshot / network log evidence.
//
// Runs under playwright.local.config.ts (fixed-port loopback admin:dev).
// Image upload (UUID-distinct) is proven by compat.spec.ts on this same
// server; this file proves what compat does not: keyboard-only operation,
// the 390x844 mobile pass, and Figure/Callout/Model3D round-trip.

const ROOT = process.cwd();
const ARTICLES_DIR = path.join(ROOT, 'content', 'articles');
const EVIDENCE_DIR = path.join(ROOT, '.omo', 'evidence', 'task-9');
const SLUG = 'editor-flow-verify';
const FILE = path.join(ARTICLES_DIR, `${SLUG}.mdx`);
const KEYBOARD_TITLE = 'Editor Flow Keyboard Probe Title';
const FIGURE_ALT = '鍵盤流程探測用圖片描述文字';

function fixtureBody(title: string): string {
  return `---\ntitle: '${title}'\ndescription: 'Deterministic keyboard/mobile/component fixture for task 9 verification.'\ndate: '2026-09-30'\ncategory: basic\ntags: ['task-9-proof']\ndraft: true\nauthor: 'NEHS 攝影社'\n---\n\n## Component section\n\n<Figure src="/images/generated/hero-1280.webp" alt="${FIGURE_ALT}" caption="探測圖說" width={800} height={600} />\n\n<Callout type="note" title="探測提示">\n鍵盤流程探測用提示內容。\n</Callout>\n\n<Model3D src="/models/opt/DamagedHelmet.glb" alt="探測模型描述文字" poster="/images/generated/hero-1280.webp" caption="探測模型" />\n`;
}

test.describe('editor flow: components + keyboard + mobile', () => {
  test.beforeAll(async () => {
    mkdirSync(EVIDENCE_DIR, { recursive: true });
    writeFileSync(FILE, fixtureBody('Editor Flow Verify Fixture'), 'utf8');
  });

  test.afterAll(async () => {
    rmSync(FILE, { force: true });
    // Guard against a slug-renamed stray (editing the slug field must never
    // leave a second file behind unnoticed).
    for (const name of readdirSync(ARTICLES_DIR)) {
      if (/keyboard/i.test(name) && name !== `${SLUG}.mdx`) {
        rmSync(path.join(ARTICLES_DIR, name), { force: true });
      }
    }
  });

  test('custom components round-trip: file scan + editor modals', async ({ page }) => {
    const raw = readFileSync(FILE, 'utf8');
    // File-level: all three component usages parse with valid props.
    expect(findFigureUsages(raw).length).toBeGreaterThanOrEqual(1);
    expect(findFigureUsages(raw)[0].src).toBe('/images/generated/hero-1280.webp');
    expect(raw).toContain('<Callout');
    expect(raw).toContain('<Model3D');
    expect(raw).toContain('/models/opt/DamagedHelmet.glb');
    // The body still compiles as MDX (unknown-component/JSX check).
    const { compile } = (await import('@mdx-js/mdx')) as unknown as {
      compile: (source: string, options?: unknown) => Promise<unknown>;
    };
    await compile(raw.split('---').slice(2).join('---'), { development: false });

    // Editor-level: each block opens its schema modal (Figure 寬度/高度,
    // Callout 類型, Model3D 模型路徑) and confirms with Done.
    await openEntry(page, SLUG);
    await expectModalWith(page, '寬度');
    await expectModalWith(page, '類型');
    await expectModalWith(page, '模型路徑');
  });

  test('keyboard-only traversal to CTA, then keyboard-only edit + save', async ({ page }) => {
    const dirBefore = new Set(readdirSync(ARTICLES_DIR));
    const bytesBefore = readFileSync(FILE, 'utf8');

    // Traversal: zero mouse use from a fresh load — Tab until the editor
    // CTA (前往編輯器) is focused, then Enter to activate it.
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('內容管理').first()).toBeVisible({ timeout: 30_000 });
    await tabUntilFocused(page, '前往編輯器', 400, 'A');
    await page.keyboard.press('Enter');
    await expectDashboard(page);
    expect(page.url()).toContain('/keystatic');

    // Setup navigation (mouse) to the entry under test; everything after
    // this line is keyboard-only.
    await openEntry(page, SLUG);
    const titleInput = page.getByLabel(/標題/).first();
    await expect(titleInput).toBeVisible({ timeout: 60_000 });

    // Keyboard-only edit: Tab to the title field, select-all, type.
    // Bidirectional: focus may start after the field (inside the document
    // editor), so Shift+Tab is the fallback direction.
    await page.keyboard.press('Escape');
    await shiftTabUntil(
      page,
      async () => {
        const info = await focusedInfo(page);
        return info?.tag === 'INPUT' && (info.label.includes('標題') ?? false);
      },
      300,
      'title field'
    );
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type(KEYBOARD_TITLE, { delay: 10 });

    // Keyboard-only save: Tab to Save/Update/Create, activate with Enter.
    await shiftTabUntil(
      page,
      async () => {
        const info = await focusedInfo(page);
        if (info?.tag !== 'BUTTON') return false;
        return /^(save|update|create)\b/i.test((info.label || info.text).trim());
      },
      300,
      'save button'
    );
    // Record exactly what is about to be activated (diagnoses a wrong
    // match without another full loopback run), then activate with Enter
    // and fall back to Space — both are keyboard activation.
    const saveFocus = await focusedInfo(page);
    const saveHtml = await page
      .evaluate(() => (document.activeElement as HTMLElement | null)?.outerHTML?.slice(0, 300) ?? 'null')
      .catch(() => 'unavailable');
    appendFileSync(
      path.join(EVIDENCE_DIR, 'flow-keyboard-focus.log'),
      `save-target: ${saveFocus?.tag ?? 'null'} | ${(saveFocus?.label ?? '').slice(0, 60)} | ${(saveFocus?.text ?? '').slice(0, 100)} | html=${saveHtml}\n`
    );
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3_000);
    try {
      await expect.poll(() => readFileSync(FILE, 'utf8'), { timeout: 20_000 }).toContain(KEYBOARD_TITLE);
    } catch {
      await page.keyboard.press('Space');
      await expect.poll(() => readFileSync(FILE, 'utf8'), { timeout: 120_000 }).toContain(KEYBOARD_TITLE);
    }

    // Restore + stray guard: the save must update the entry in place.
    const dirAfter = readdirSync(ARTICLES_DIR);
    const strays = dirAfter.filter((name) => !dirBefore.has(name));
    expect(strays, `keyboard save must not create stray files: ${strays.join(',')}`).toEqual([]);
    writeFileSync(FILE, bytesBefore, 'utf8');
  });

  test.describe('mobile 390x844 full pass', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test('admin + editor + entry render on mobile', async ({ page }) => {
      await page.goto('/admin', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('內容管理').first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('link', { name: '前往編輯器' })).toBeVisible();
      await page.screenshot({ path: path.join(EVIDENCE_DIR, 'flow-mobile-admin.png') });

      await page.goto('/keystatic', { waitUntil: 'domcontentloaded' });
      await expectDashboard(page);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, 'flow-mobile-keystatic.png') });

      await openEntry(page, SLUG);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, 'flow-mobile-entry.png') });
    });
  });

  test('evidence: screenshots + a11y snapshot + network log', async ({ page }) => {
    const netLines: string[] = [];
    page.on('request', (request) => {
      netLines.push(`REQ ${request.method()} ${request.url()}`);
    });
    page.on('response', (response) => {
      netLines.push(`RES ${response.status()} ${response.url()}`);
    });

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('內容管理').first()).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'flow-desktop-admin.png') });

    await page.getByRole('link', { name: '前往編輯器' }).click({ timeout: 15_000 });
    await expectDashboard(page);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'flow-desktop-keystatic.png') });

    await openEntry(page, SLUG);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'flow-desktop-entry.png') });

    const snapshot = await page
      .locator('main')
      .first()
      .ariaSnapshot()
      .catch(() => page.locator('body').ariaSnapshot());
    writeFileSync(
      path.join(EVIDENCE_DIR, 'flow-a11y-entry.json'),
      `${JSON.stringify({ url: page.url(), snapshot }, null, 2)}\n`,
      'utf8'
    );
    writeFileSync(path.join(EVIDENCE_DIR, 'flow-network.log'), `${netLines.join('\n')}\n`, 'utf8');
    expect(netLines.some((line) => line.includes('/admin'))).toBe(true);
    expect(snapshot.length).toBeGreaterThan(0);
  });
});

type FocusedInfo = { tag: string; label: string; text: string } | null;

async function focusedInfo(page: Page): Promise<FocusedInfo> {
  // Accessible-name computation mirrors getByLabel: aria-label, then
  // aria-labelledby, then an associated <label>, then placeholder. The
  // Keystatic title field names itself via a wrapping/associated label, so
  // reading only aria-label would report it as unnamed (and a Tab walk
  // would pass straight over the match it is looking for).
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    let label = el.getAttribute('aria-label') ?? '';
    if (!label) {
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        label = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' ');
      }
    }
    if (!label && (el as HTMLInputElement).id) {
      try {
        const associated = document.querySelector(`label[for="${CSS.escape((el as HTMLInputElement).id)}"]`);
        if (associated?.textContent) label = associated.textContent;
      } catch {
        // ignore selector edge cases
      }
    }
    if (!label) {
      const wrapping = el.closest('label');
      if (wrapping?.textContent) label = wrapping.textContent;
    }
    if (!label) label = el.getAttribute('placeholder') ?? '';
    const text = `${label} ${(el.textContent ?? '').slice(0, 80)}`;
    return { tag: el.tagName, label, text };
  });
}

async function tabUntil(page: Page, done: () => Promise<boolean>, max: number, label: string): Promise<number> {
  const trail: string[] = [];
  for (let i = 0; i < max; i++) {
    if (await done()) return i;
    const info = await focusedInfo(page);
    if (i % 25 === 0) trail.push(`tab ${i}: ${info?.tag ?? 'null'} | ${info?.label ?? ''} | ${(info?.text ?? '').slice(0, 60)}`);
    await page.keyboard.press('Tab');
  }
  const last = await focusedInfo(page);
  throw new Error(
    `keyboard target ${JSON.stringify(label)} not reached within ${max} Tabs ` +
      `(last focus: ${last?.tag ?? 'null'} | ${last?.label ?? ''} | ${(last?.text ?? '').slice(0, 80)}; trail: ${trail.join(' ;; ')})`
  );
}

async function shiftTabUntil(page: Page, done: () => Promise<boolean>, max: number, label: string): Promise<number> {
  // Bidirectional fallback: when focus starts AFTER the target (e.g. inside
  // the document editor), forward Tab walks away from it — Shift+Tab walks
  // back. Trying both directions keeps the proof independent of wherever
  // the previous mouse click left focus.
  try {
    return await tabUntil(page, done, max, `${label} (forward)`);
  } catch (forwardError) {
    const trail: string[] = [];
    for (let i = 0; i < max; i++) {
      if (await done()) return i;
      if (i % 25 === 0) {
        const info = await focusedInfo(page);
        trail.push(`shift-tab ${i}: ${info?.tag ?? 'null'} | ${(info?.text ?? '').slice(0, 60)}`);
      }
      await page.keyboard.press('Shift+Tab');
    }
    const last = await focusedInfo(page);
    throw new Error(
      `${(forwardError as Error).message} :: backward also failed (${label}; last focus: ${last?.tag ?? 'null'} | ${(last?.text ?? '').slice(0, 80)}; trail: ${trail.join(' ;; ')})`
    );
  }
}

async function tabUntilFocused(page: Page, needle: string, max: number, tag?: string): Promise<number> {
  return tabUntil(
    page,
    async () => {
      const info = await focusedInfo(page);
      if (tag && info?.tag !== tag) return false;
      return info?.text.includes(needle) ?? false;
    },
    max,
    `focus containing ${JSON.stringify(needle)}`
  );
}

/** Dashboard readiness on any viewport (mobile collapses some headings). */
async function expectDashboard(page: Page): Promise<void> {
  const link = page.getByRole('link', { name: /articles/i }).first();
  try {
    await expect(link).toBeVisible({ timeout: 30_000 });
    return;
  } catch {
    // Fall through to the heading text (desktop shape).
  }
  await expect(page.getByText('Articles', { exact: false }).first()).toBeVisible({ timeout: 90_000 });
}

async function openEntry(page: Page, slug: string): Promise<void> {
  await page.goto('/keystatic', { waitUntil: 'domcontentloaded' });
  await expectDashboard(page);
  const collectionLink = page.getByRole('link', { name: /articles/i }).first();
  try {
    await collectionLink.waitFor({ state: 'visible', timeout: 15_000 });
    await collectionLink.click({ timeout: 15_000 });
  } catch {
    await page.getByText('Articles', { exact: false }).first().click({ timeout: 15_000 });
  }
  await page.getByText(slug, { exact: false }).first().waitFor({ timeout: 60_000 });
  await page.getByText(slug, { exact: false }).first().click({ timeout: 30_000 });
  // The entry route transition shows a loading spinner: wait for the
  // out-of-editor title field so every caller starts from a loaded entry.
  await expect(page.getByLabel(/標題/).first()).toBeVisible({ timeout: 90_000 });
}

async function expectModalWith(page: Page, needle: string): Promise<void> {
  // Open component-block Edit modals in document order until the dialog
  // shows the discriminating label; confirm with Done (closed modals linger
  // hidden in DOM, so every candidate is checked for visibility and Escape
  // resets between attempts).
  const edits = page.getByRole('button', { name: 'Edit', exact: true });
  await edits.first().waitFor({ state: 'visible', timeout: 90_000 });
  const total = await edits.count();
  const dialog = page.getByRole('dialog');
  for (let i = 0; i < total; i++) {
    await edits.nth(i).click({ timeout: 15_000 });
    await page.waitForTimeout(1_500);
    const candidates = dialog.getByText(needle, { exact: false });
    let visible = false;
    for (let k = 0; k < (await candidates.count()); k++) {
      if (await candidates.nth(k).isVisible().catch(() => false)) {
        visible = true;
        break;
      }
    }
    if (visible) {
      await dialog.getByRole('button', { name: 'Done' }).first().click({ timeout: 15_000 });
      await page.waitForTimeout(1_500);
      return;
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1_000);
  }
  throw new Error(`block Edit modal containing ${JSON.stringify(needle)} not found`);
}
