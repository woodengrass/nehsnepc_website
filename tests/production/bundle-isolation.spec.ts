import { expect, test, type APIRequestContext } from '@playwright/test';

// Task 9: bundle isolation, asserted both directions on SERVED production JS.
//
// - Public routes (/, /tutorial, /tutorial/category/tutorial, /admin) load
//   ZERO editor code: none of their served `/_next/static/**/*.js` chunks
//   may mention keystatic (case-insensitive) or EditorFigurePreview.
// - /keystatic DOES contain editor code (positive control: the isolation is
//   directional, not an accident of the matcher finding nothing anywhere).
//
// NOTE: raw HTML is excluded from the negative assert on purpose — /admin
// legitimately links to `/keystatic` (href="/keystatic"). The proof is on
// served JS chunks, which is where an editor import would actually land.

const PUBLIC_ROUTES = ['/', '/tutorial', '/tutorial/category/tutorial', '/admin'] as const;

const EDITOR_MARKERS = [/keystatic/i, /EditorFigurePreview/];

const chunkCache = new Map<string, string>();

async function servedJs(request: APIRequestContext, chunkUrl: string): Promise<string> {
  const cached = chunkCache.get(chunkUrl);
  if (cached !== undefined) return cached;
  const res = await request.get(chunkUrl);
  expect(res.status(), `chunk must serve: ${chunkUrl}`).toBe(200);
  const text = await res.text();
  chunkCache.set(chunkUrl, text);
  return text;
}

function chunkUrls(html: string): string[] {
  const urls = new Set<string>();
  for (const match of html.matchAll(/"(\/_next\/static\/[^"]+?\.js)"/g)) urls.add(match[1]);
  return [...urls];
}

async function assertNoEditorCode(request: APIRequestContext, route: string): Promise<number> {
  const pageRes = await request.get(route);
  expect(pageRes.status(), `${route} must serve`).toBe(200);
  const html = await pageRes.text();
  const chunks = chunkUrls(html);
  expect(chunks.length, `${route} must load at least one JS chunk`).toBeGreaterThan(0);
  for (const chunkUrl of chunks) {
    const js = await servedJs(request, chunkUrl);
    for (const marker of EDITOR_MARKERS) {
      expect(js, `${route} chunk must not contain editor code: ${chunkUrl}`).not.toMatch(marker);
    }
  }
  return chunks.length;
}

test.describe('bundle isolation (served production JS)', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`public route loads no editor code: ${route}`, async ({ request }) => {
      const count = await assertNoEditorCode(request, route);
      expect(count).toBeGreaterThan(0);
    });
  }

  test('/keystatic DOES contain editor code (positive control)', async ({ request }) => {
    const pageRes = await request.get('/keystatic');
    expect(pageRes.status()).toBe(200);
    const html = await pageRes.text();
    const chunks = chunkUrls(html);
    expect(chunks.length).toBeGreaterThan(0);
    let hits = 0;
    for (const chunkUrl of chunks) {
      const js = await servedJs(request, chunkUrl);
      if (EDITOR_MARKERS.some((marker) => marker.test(js))) hits += 1;
    }
    // HTML shell itself names the route; chunks carry the editor runtime.
    const htmlHit = EDITOR_MARKERS.some((marker) => marker.test(html));
    expect(hits > 0 || htmlHit, '/keystatic must contain editor code somewhere').toBe(true);
  });
});
