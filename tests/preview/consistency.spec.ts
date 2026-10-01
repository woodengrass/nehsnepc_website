/**
 * Preview consistency spec (ADR-0006 drift gate).
 *
 * Runs serverless like `tests/content/contract.spec.ts` (no dev server, no
 * network): every committed article is parsed both ways — production
 * `lib/content.ts` (gray-matter, node:fs) vs the client-safe
 * `lib/preview/frontmatter.ts` — and the structures must match. Version
 * pins, production plugin parity, manifest srcset math, and bundle
 * isolation are asserted statically so any drift fails loudly.
 *
 * Browser-compile structure (headings/components/images in real rendered
 * output) is covered by `tests/preview/page.spec.ts` against the live
 * `/preview` route.
 */
import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { getAllArticles, getArticle } from '../../lib/content';
import { articleImageSet } from '../../lib/article-images';
import { parsePreviewMdx, previewReadingMinutes } from '../../lib/preview/frontmatter';
import { previewImageSet, previewSourceRel } from '../../lib/preview/manifest';
import {
  PREVIEW_ORIGINAL_BUDGET_BYTES,
  PreviewFetchError,
  fetchCommittedImageOriginal,
  fetchCommittedMdx,
  isSafeOriginalRel
} from '../../lib/preview/github';
import { readingMinutes } from '../../lib/content';

const ROOT = process.cwd();

function readSource(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function installedVersion(pkg: string): string {
  const raw = fs.readFileSync(path.join(ROOT, 'node_modules', pkg, 'package.json'), 'utf8');
  return (JSON.parse(raw) as { version: string }).version;
}

type Structure = {
  headings: string[];
  components: string[];
  imageSrcs: string[];
  links: string[];
};

function extractStructure(body: string): Structure {
  const headings = [...body.matchAll(/^#{2,4}\s+(.+?)\s*$/gm)].map((m) => m[1].trim());
  const components = [...body.matchAll(/<(Figure|Callout|Model3D)\b[^>]*\/?>/g)].map((m) => {
    const tag = m[0];
    if (m[1] === 'Figure') return `Figure:${/src\s*=\s*["'{]*([^"'}\s]+)/.exec(tag)?.[1] ?? ''}`;
    if (m[1] === 'Model3D') return `Model3D:${/src\s*=\s*["'{]*([^"'}\s]+)/.exec(tag)?.[1] ?? ''}`;
    return `Callout:${/type\s*=\s*["']([^"']+)["']/.exec(tag)?.[1] ?? 'note'}`;
  });
  const mdxImages = [...body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
  const figureSrcs = [...body.matchAll(/<Figure\b[^>]*src\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const mdLinks = [...body.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
  const jsxLinks = [...body.matchAll(/href\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
  return {
    headings,
    components,
    imageSrcs: [...mdxImages, ...figureSrcs],
    links: [...new Set([...mdLinks, ...jsxLinks])].sort()
  };
}

test.describe('preview version lock (ADR-0006)', () => {
  test('pipeline constants match package.json pins and installed versions', () => {
    const pipelineSource = readSource('lib/preview/pipeline.ts');
    const pkg = JSON.parse(readSource('package.json')) as { dependencies: Record<string, string> };
    const expected: Record<string, string> = {
      mdx: '@mdx-js/mdx',
      remarkGfm: 'remark-gfm',
      rehypeSlug: 'rehype-slug',
      rehypeAutolinkHeadings: 'rehype-autolink-headings'
    };
    for (const [key, dep] of Object.entries(expected)) {
      const inSource = new RegExp(`${key}:\\s*'([^']+)'`).exec(pipelineSource)?.[1];
      expect(inSource, `${key} pinned in pipeline.ts`).toBeTruthy();
      const installed = installedVersion(dep);
      // Exact pin (e.g. "@mdx-js/mdx": "3.1.1") or caret range satisfied.
      expect(inSource, `${dep} pipeline constant`).toBe(installed);
      const range = pkg.dependencies[dep];
      expect(range, `${dep} declared in package.json`).toBeTruthy();
      if (range.startsWith('^')) {
        expect(installed.startsWith(`${range.slice(1).split('.')[0]}.`)).toBe(true);
      } else {
        expect(installed).toBe(range);
      }
    }
  });

  test('browser plugin configuration mirrors production render source', () => {
    const production = readSource('app/tutorial/[slug]/page.tsx');
    expect(production).toContain('remarkPlugins: [remarkGfm]');
    expect(production).toContain("[rehypeAutolinkHeadings, { behavior: 'wrap' }]");
    expect(production).toContain('rehypeSlug');
    const pipeline = readSource('lib/preview/pipeline.ts');
    expect(pipeline).toContain('remarkPlugins: [remarkGfm]');
    expect(pipeline).toContain("[rehypeAutolinkHeadings, { behavior: 'wrap' }]");
    expect(pipeline).toContain('rehypeSlug');
    // Same component map keys on both sides.
    const index = readSource('components/mdx/index.ts');
    for (const name of ['Figure', 'Callout', 'Model3D']) {
      expect(index).toContain(name);
    }
    expect(pipeline).toContain("'Figure', 'Callout', 'Model3D', 'a'");
  });
});

test.describe('preview parse parity: server vs client', () => {
  const articles = getAllArticles(true);
  test('committed articles exist for the parity battery', () => {
    expect(articles.length).toBeGreaterThan(0);
  });

  for (const meta of getAllArticles(true)) {
    test(`slug ${meta.slug}: frontmatter + body + structure match`, () => {
      const server = getArticle(meta.slug);
      expect(server).not.toBeNull();
      if (!server) return;
      const raw = fs.readFileSync(path.join(ROOT, 'content', 'articles', `${meta.slug}.mdx`), 'utf8');
      const client = parsePreviewMdx(raw, meta.slug);
      expect(client.warnings, `${meta.slug} preview warnings`).toEqual([]);
      expect(client.data.title).toBe(server.title);
      expect(client.data.description).toBe(server.description);
      expect(client.data.date).toBe(server.date);
      expect(client.data.updated).toBe(server.updated);
      expect(client.data.category).toBe(server.category);
      expect(client.data.tags).toEqual(server.tags);
      expect(client.data.cover).toBe(server.cover);
      expect(client.data.coverAlt).toBe(server.coverAlt);
      expect(client.data.draft).toBe(server.draft);
      expect(client.data.author).toBe(server.author);
      expect(client.body).toBe(server.content);
      expect(previewReadingMinutes(client.body)).toBe(readingMinutes(server.content));
      expect(extractStructure(client.body)).toEqual(extractStructure(server.content));
    });
  }
});

test.describe('preview manifest math parity', () => {
  const manifestPath = path.join(ROOT, 'public', 'images', 'generated', 'articles.manifest.json');

  test('managed srcset math matches the server reader (or both fall back)', () => {
    const probe = '/images/generated/articles/example/cover.jpg';
    const manifestExists = fs.existsSync(manifestPath);
    const server = articleImageSet(probe);
    if (!manifestExists || !server) {
      // No generated manifest here: server falls back to plain <img> and the
      // preview twin must do the same (null manifest → null set).
      expect(server).toBeNull();
      expect(previewImageSet(probe, null)).toBeNull();
      return;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      items: Record<string, { widths: number[] }>;
    };
    const client = previewImageSet(probe, manifest);
    expect(client && 'set' in client && client.set.avifSrcSet).toBe(server.avifSrcSet);
    expect(client && 'set' in client && client.set.webpSrcSet).toBe(server.webpSrcSet);
    expect(client && 'set' in client && client.set.fallbackSrc).toBe(server.fallbackSrc);
  });

  test('non-managed and traversal paths fall back on both sides', () => {
    expect(articleImageSet('/images/generated/hero-1280.webp')).toBeNull();
    expect(previewImageSet('/images/generated/hero-1280.webp', { items: {} })).toBeNull();
    expect(articleImageSet('/images/generated/articles/../x.jpg')).toBeNull();
    expect(previewImageSet('/images/generated/articles/../x.jpg', { items: {} })).toBeNull();
  });
});

test.describe('preview original fallback (ADR-0006 three states)', () => {
  test('previewSourceRel mirrors generated prefix to the versioned source rel', () => {
    expect(previewSourceRel('/images/generated/articles/example/cover.jpg')).toBe('example/cover.jpg');
    expect(previewSourceRel('/images/generated/articles/a/b/c.png')).toBe('a/b/c.png');
    expect(previewSourceRel('/images/generated/hero-1280.webp')).toBeNull();
    expect(previewSourceRel('/images/generated/articles/../x.jpg')).toBeNull();
    expect(previewSourceRel('/images/generated/articles/')).toBeNull();
  });

  test('isSafeOriginalRel accepts nested rels, rejects escapes', () => {
    expect(isSafeOriginalRel('example/cover.jpg')).toBe(true);
    expect(isSafeOriginalRel('a/b/c.png')).toBe(true);
    expect(isSafeOriginalRel('')).toBe(false);
    expect(isSafeOriginalRel('/example/cover.jpg')).toBe(false);
    expect(isSafeOriginalRel('../x.jpg')).toBe(false);
    expect(isSafeOriginalRel('a/../b.jpg')).toBe(false);
    expect(isSafeOriginalRel('a\\b.jpg')).toBe(false);
    expect(isSafeOriginalRel('a b.jpg')).toBe(false);
  });

  test('three-state matrix: generated set vs missing-original vs plain img', () => {
    const manifest = { items: { 'example/cover.jpg': { widths: [640, 1280] } } };
    const src = '/images/generated/articles/example/cover.jpg';
    // State 1: row present → responsive set (srcset, no badge/placeholder).
    const generated = previewImageSet(src, manifest);
    expect(generated && 'set' in generated).toBe(true);
    // State 2: managed path, row removed (in-memory only — real file untouched)
    // → caller tries the versioned original; the mirror rel is exact.
    const pruned = { items: {} };
    const missing = previewImageSet(src, pruned);
    expect(missing).toEqual({ missing: true });
    expect(previewSourceRel(src)).toBe('example/cover.jpg');
    // State 3: no manifest at all → plain <img>, same as the server reader.
    expect(previewImageSet(src, null)).toBeNull();
    // Non-managed paths never enter the chain on either side.
    expect(previewImageSet('/images/generated/hero-1280.webp', pruned)).toBeNull();
  });

  // In-memory stubbed fetch battery: no network, no fixture files, and the
  // committed manifest is never mutated — rows are pruned in stub objects.
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );

  async function withStubbedFetch(
    handler: (url: string) => Response,
    run: (calls: string[]) => Promise<void>
  ): Promise<void> {
    const realFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      return handler(url);
    }) as typeof fetch;
    try {
      await run(calls);
    } finally {
      globalThis.fetch = realFetch;
    }
  }

  test('contents API primary returns an object URL (no srcset by definition)', async () => {
    await withStubbedFetch(
      () => new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } }),
      async (calls) => {
        const result = await fetchCommittedImageOriginal('example/new.jpg', 'preview/alice');
        expect(result.byteSize).toBe(PNG.length);
        expect(result.objectUrl.startsWith('blob:')).toBe(true);
        expect(calls).toHaveLength(1);
        expect(calls[0]).toContain('api.github.com');
        expect(calls[0]).toContain('assets/articles/example/new.jpg');
        expect(calls[0]).toContain('ref=preview%2Falice');
        URL.revokeObjectURL(result.objectUrl);
      }
    );
  });

  test('contents 404 falls back to raw.githubusercontent on the same branch', async () => {
    await withStubbedFetch(
      (url) =>
        url.includes('api.github.com')
          ? new Response('Not Found', { status: 404 })
          : new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } }),
      async (calls) => {
        const result = await fetchCommittedImageOriginal('example/new.jpg', 'main');
        expect(result.byteSize).toBe(PNG.length);
        expect(calls).toHaveLength(2);
        expect(calls[1]).toContain('raw.githubusercontent.com');
        expect(calls[1]).toContain('/main/assets/articles/example/new.jpg');
        URL.revokeObjectURL(result.objectUrl);
      }
    );
  });

  test('original also missing → not-found (caller keeps the honest placeholder)', async () => {
    await withStubbedFetch(
      () => new Response('Not Found', { status: 404 }),
      async (calls) => {
        await expect(fetchCommittedImageOriginal('example/new.jpg', 'main')).rejects.toMatchObject({
          name: 'PreviewFetchError',
          kind: 'not-found'
        });
        expect(calls).toHaveLength(2);
      }
    );
  });

  test('oversize original is refused without rendering', async () => {
    await withStubbedFetch(
      () =>
        new Response(PNG, {
          status: 200,
          headers: { 'content-length': String(PREVIEW_ORIGINAL_BUDGET_BYTES + 1) }
        }),
      async () => {
        await expect(fetchCommittedImageOriginal('example/new.jpg', 'main')).rejects.toMatchObject({
          name: 'PreviewFetchError'
        });
      }
    );
  });

  test('rate-limit body surfaces as rate-limited, not silent', async () => {
    await withStubbedFetch(
      () => new Response(JSON.stringify({ message: 'API rate limit exceeded' }), { status: 403 }),
      async () => {
        await expect(fetchCommittedImageOriginal('example/new.jpg', 'main')).rejects.toMatchObject({
          kind: 'rate-limited'
        });
      }
    );
  });

  test('unsafe rel/branch never reach the network', async () => {
    await withStubbedFetch(
      () => new Response(PNG, { status: 200 }),
      async (calls) => {
        await expect(fetchCommittedImageOriginal('../x.jpg', 'main')).rejects.toBeInstanceOf(
          PreviewFetchError
        );
        await expect(fetchCommittedImageOriginal('example/new.jpg', 'a..b')).rejects.toMatchObject({
          kind: 'invalid-branch'
        });
        expect(calls).toHaveLength(0);
      }
    );
  });

  // Stall guard (ADR-0006): a never-resolving fetch must abort via the
  // `timeoutMs` seam with the honest zh-TW timeout error — not hang. The
  // 50 ms budget keeps this deterministic and fast; the 30 s production
  // default (`PREVIEW_GITHUB_TIMEOUT_MS`) is proved by the stubbed-stall
  // browser test in `page.spec.ts`.
  test('stalled MDX fetch aborts with the timeout error, not a hang', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = ((_input: unknown, init?: { signal?: AbortSignal }) =>
      new Promise<never>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        );
      })) as unknown as typeof fetch;
    try {
      const error = await fetchCommittedMdx('example', 'main', 50).catch((e: unknown) => e);
      expect(error).toMatchObject({ name: 'PreviewFetchError', kind: 'timeout' });
      expect((error as PreviewFetchError).message).toContain('逾時');
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test('stalled image legs fall through to the honest placeholder path', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = ((_input: unknown, init?: { signal?: AbortSignal }) =>
      new Promise<never>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        );
      })) as unknown as typeof fetch;
    try {
      await expect(fetchCommittedImageOriginal('example/new.jpg', 'main', 50)).rejects.toMatchObject(
        {
          name: 'PreviewFetchError',
          kind: 'not-found'
        }
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

test.describe('preview isolation + discoverability guards', () => {
  test('no node:* imports in the preview chunk', () => {
    for (const rel of [
      'lib/preview/github.ts',
      'lib/preview/frontmatter.ts',
      'lib/preview/pipeline.ts',
      'lib/preview/manifest.ts',
      'app/preview/page.tsx',
      'app/preview/PreviewLoader.tsx',
      'app/preview/PreviewClient.tsx',
      'app/preview/PreviewRenderer.tsx'
    ]) {
      const source = readSource(rel);
      expect(source, `${rel} must stay client-safe`).not.toMatch(/from\s+['"]node:|require\(['"]node:|require\(['"]fs['"]/);
    }
  });

  test('public routes never import preview code', () => {
    const hits: string[] = [];
    const skipDirs = new Set(['node_modules', '.next', '.git', 'tests', '.omo']);
    const skipPrefixes = ['app/preview', 'lib/preview'];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const rel = path.relative(ROOT, full);
        const relPosix = rel.split(path.sep).join('/');
        if (skipPrefixes.some((prefix) => relPosix === prefix || relPosix.startsWith(`${prefix}/`))) continue;
        if (entry.isDirectory()) {
          if (skipDirs.has(entry.name) || entry.name.startsWith('.')) continue;
          walk(full);
          continue;
        }
        if (/\.(ts|tsx|js|mjs)$/.test(entry.name) !== true) continue;
        const source = fs.readFileSync(full, 'utf8');
        if (/lib\/preview|app\/preview|PreviewClient|PreviewRenderer|PreviewLoader/.test(source)) {
          hits.push(rel);
        }
      }
    };
    walk(ROOT);
    expect(hits).toEqual([]);
  });

  test('preview route is noindex, off robots-allow, off sitemap/nav', () => {
    const page = readSource('app/preview/page.tsx');
    expect(page).toContain('index: false');
    expect(page).toContain('follow: false');
    const loader = readSource('app/preview/PreviewLoader.tsx');
    expect(loader).toContain('ssr: false');
    const robots = readSource('app/robots.ts');
    expect(robots).toContain('/preview');
    expect(robots).not.toMatch(/allow:\s*['"]\/preview['"]/);
    const sitemap = readSource('app/sitemap.ts');
    expect(sitemap).not.toContain('preview');
  });
});
