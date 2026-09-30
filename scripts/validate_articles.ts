/**
 * Build-time article validator (fail-fast).
 *
 * Runtime `lib/content.ts` keeps warn-skip as defense-in-depth; this script
 * FAILS instead so invalid content never reaches `next build`.
 *
 * Groups:
 *  (1) enumerate content/articles/*.md|mdx — 0 files / dup slugs / bad slug
 *  (2) gray-matter + strict schema (slug:line: rule messages)
 *  (3) filesystem existence + managed-path enforcement (no legacy exception)
 *  (4) body scan (Figure / Model3D / <img> / unknown components / MDX compile)
 *  (5) cross-surface parity (getAllArticles / sitemap / RSS / formatDate)
 *  (6) summary + exit 1 on errors
 *
 * Post-migration media rule (ADR-0004): an article cover or Figure src is
 * accepted iff it lives under `/images/generated/articles/<slug>/…` with an
 * image extension, backed by a versioned source under the mirrored
 * `assets/articles/<slug>/…` path (source existence IS required — sources are
 * tracked; generated-derivative existence is never required before
 * generation, since `prebuild` validates before generating). Any other
 * `/images/*` or `/models/*` path fails. `Model3D` src stays
 * `/models/opt/*.glb` (must exist); `Model3D` poster stays a text path under
 * `/images/generated/` (committed families, must exist unless it points at a
 * managed `/images/generated/articles/` derivative).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import matter from 'gray-matter';

import {
  ARTICLE_GENERATED_PREFIX,
  ARTICLE_SOURCE_ROOT,
  COVER_PREFIXES,
  MIN_ALT_LENGTH,
  MODEL_PREFIX,
  findFigureUsages,
  findModel3DUsages,
  frontmatterStrictSchema,
  isAllowedCoverPath,
  isAllowedModelPath,
  isUrlSafeSlug,
  publicFileExists
} from '../lib/content-contract.js';
import { getAllArticles } from '../lib/content.js';
import { formatDate } from '../lib/format.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const ARTICLES_DIR = path.join(ROOT, 'content', 'articles');

const errors: string[] = [];

function fail(message: string): void {
  errors.push(message);
}

function frontmatterLine(raw: string, key: string): number {
  const lines = raw.split('\n');
  let inFrontmatter = false;
  let fenceCount = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      fenceCount += 1;
      if (fenceCount === 1) {
        inFrontmatter = true;
        continue;
      }
      break;
    }
    if (inFrontmatter) {
      const m = lines[i].match(/^([A-Za-z0-9_]+)\s*:/);
      if (m && m[1] === key) return i + 1;
    }
  }
  return 1;
}

function parseNumericAttr(raw: string | null): number | null {
  if (raw === null) return null;
  const inner = raw.startsWith('{') ? raw.slice(1, -1).trim().replace(/^["']|["']$/g, '') : raw.replace(/^["']|["']$/g, '');
  if (!/^\d+$/.test(inner)) return null;
  const n = Number(inner);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

async function main(): Promise<void> {
  // ---- (1) enumerate -------------------------------------------------------
  if (!fs.existsSync(ARTICLES_DIR)) {
    fail(`articles: missing directory ${path.relative(ROOT, ARTICLES_DIR)}`);
  }
  const files = fs.existsSync(ARTICLES_DIR)
    ? fs.readdirSync(ARTICLES_DIR).filter((name) => /\.mdx?$/.test(name)).sort()
    : [];
  if (files.length === 0) {
    fail('articles: 0 files under content/articles/*.{md,mdx}');
  }

  const slugToFiles = new Map<string, string[]>();
  for (const file of files) {
    const slug = file.replace(/\.mdx?$/, '');
    const list = slugToFiles.get(slug) ?? [];
    list.push(file);
    slugToFiles.set(slug, list);
    if (!isUrlSafeSlug(slug)) {
      fail(`${slug}:1: slug ${JSON.stringify(slug)} must be URL-safe (lowercase alphanumerics with - or _)`);
    }
  }
  for (const [slug, list] of slugToFiles) {
    if (list.length > 1) {
      fail(`${slug}:1: duplicate slug across extensions: ${list.join(', ')} (basenames must be unique across .md/.mdx)`);
    }
  }

  // ---- per-file checks -----------------------------------------------------
  let mdxCompile: ((source: string, options?: unknown) => Promise<unknown>) | null = null;
  try {
    const mdx = (await import('@mdx-js/mdx')) as unknown as {
      compile: (source: string, options?: unknown) => Promise<unknown>;
    };
    mdxCompile = mdx.compile;
  } catch {
    fail('mdx: unable to import @mdx-js/mdx for compilation check');
  }

  const nonDraftSlugs: string[] = [];
  const mediaRefs: { slug: string; kind: string; value: string }[] = [];

  for (const file of files) {
    const slug = file.replace(/\.mdx?$/, '');
    const abs = path.join(ARTICLES_DIR, file);
    const raw = fs.readFileSync(abs, 'utf8');
    const { data, content: body } = matter(raw);

    // ---- (2) strict schema -------------------------------------------------
    const parsed = frontmatterStrictSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'frontmatter');
        const line = frontmatterLine(raw, key);
        const rule = issue.path.length > 0 ? issue.path.join('.') : 'frontmatter';
        fail(`${slug}:${line}: ${rule}: ${issue.message}`);
      }
      continue;
    }
    const frontmatter = parsed.data;
    if (!frontmatter.draft) nonDraftSlugs.push(slug);

    // ---- (3) media existence ----------------------------------------------
    // Managed article image: the public path mirrors the versioned source 1:1
    // (/images/generated/articles/<rel> <-> assets/articles/<rel>). Sources
    // are tracked, so their existence IS required; generated-derivative
    // existence is never required before generation.
    const managedSourceExists = (publicPath: string): boolean => {
      const rel = publicPath.slice(ARTICLE_GENERATED_PREFIX.length).split('?')[0].split('#')[0];
      if (rel.length === 0 || rel.includes('..')) return false;
      try {
        return fs.statSync(path.join(ROOT, ARTICLE_SOURCE_ROOT, rel)).isFile();
      } catch {
        return false;
      }
    };

    const checkManagedImage = (value: string | undefined, label: string, lineKey: string) => {
      if (value === undefined) return;
      const p = value.trim();
      const line = frontmatterLine(raw, lineKey);
      mediaRefs.push({ slug, kind: label, value: p });
      if (!isAllowedCoverPath(p)) {
        fail(`${slug}:${line}: ${label} ${p} must use a managed ${ARTICLE_GENERATED_PREFIX} path with an image extension`);
        return;
      }
      if (!managedSourceExists(p)) {
        fail(`${slug}:${line}: ${label} versioned source missing: ${ARTICLE_SOURCE_ROOT}/${p.slice(ARTICLE_GENERATED_PREFIX.length)} (editor upload not saved?)`);
      }
    };

    if (frontmatter.cover !== undefined) {
      if (!isAllowedCoverPath(frontmatter.cover.trim())) {
        fail(`${slug}:${frontmatterLine(raw, 'cover')}: cover: path must start with ${COVER_PREFIXES.join(' or ')} with an image extension`);
      }
      checkManagedImage(frontmatter.cover, 'cover', 'cover');
    }

    // ---- (4) body scan ------------------------------------------------------
    const figures = findFigureUsages(body);
    figures.forEach((fig, index) => {
      const label = `Figure:${index}`;
      if (!fig.src || fig.src.trim().length === 0) {
        fail(`${slug}:1: ${label}: src is required`);
      } else {
        const src = fig.src.trim();
        if (!isAllowedCoverPath(src)) {
          fail(`${slug}:1: ${label}: src ${JSON.stringify(fig.src)} must be a managed ${ARTICLE_GENERATED_PREFIX} image path`);
        } else {
          mediaRefs.push({ slug, kind: label, value: src });
          if (!managedSourceExists(src)) {
            fail(`${slug}:1: ${label}: versioned source missing: ${ARTICLE_SOURCE_ROOT}/${src.slice(ARTICLE_GENERATED_PREFIX.length)}`);
          }
        }
      }
      if (fig.alt === null || fig.alt.trim().length < MIN_ALT_LENGTH) {
        fail(`${slug}:1: ${label}: alt must be meaningful text (at least ${MIN_ALT_LENGTH} chars)`);
      }
      const width = parseNumericAttr(fig.width);
      const height = parseNumericAttr(fig.height);
      if (width === null || height === null) {
        fail(`${slug}:1: ${label}: width/height must both be present positive integers (e.g. width={800} height={600})`);
      }
    });

    const models = findModel3DUsages(body);
    models.forEach((model, index) => {
      const label = `Model3D:${index}`;
      if (!model.src || model.src.trim().length === 0) {
        fail(`${slug}:1: ${label}: src is required`);
      } else {
        const src = model.src.trim();
        if (!isAllowedModelPath(src)) {
          fail(`${slug}:1: ${label}: src ${JSON.stringify(model.src)} must be a .glb under ${MODEL_PREFIX}`);
        } else {
          mediaRefs.push({ slug, kind: label, value: src });
          if (!publicFileExists(src, ROOT)) {
            fail(`${slug}:1: ${label}: file missing: ${src}`);
          }
        }
      }
      if (model.alt === null || model.alt.trim().length < MIN_ALT_LENGTH) {
        fail(`${slug}:1: ${label}: alt must be meaningful text (at least ${MIN_ALT_LENGTH} chars)`);
      }
      if (model.poster !== null && model.poster !== undefined) {
        const poster = model.poster.trim();
        mediaRefs.push({ slug, kind: `${label}:poster`, value: poster });
        if (poster.length === 0) {
          fail(`${slug}:1: ${label}: poster must be non-empty when present`);
        } else if (!poster.startsWith('/images/generated/')) {
          fail(`${slug}:1: ${label}: poster ${poster} must stay a text path under /images/generated/`);
        } else if (!poster.startsWith(ARTICLE_GENERATED_PREFIX) && !publicFileExists(poster, ROOT)) {
          // Committed families must exist; managed derivatives may not exist
          // yet (prebuild validates before generating).
          fail(`${slug}:1: ${label}: poster file missing: ${poster}`);
        }
      }
    });

    // External <img> without allowlist.
    const imgRe = /<img\b[^>]*>/g;
    let imgMatch: RegExpExecArray | null;
    while ((imgMatch = imgRe.exec(body)) !== null) {
      const tag = imgMatch[0];
      const srcMatch = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|\{[^}]*\})/);
      const src = srcMatch ? (srcMatch[1] ?? srcMatch[2] ?? '{expr}') : '';
      if (/^https?:\/\//i.test(src) || src.startsWith('//')) {
        fail(`${slug}:1: img: external <img> src ${JSON.stringify(src)} has no allowlist entry`);
      }
    }

    // Unknown components beyond Figure / Callout / Model3D (+ lowercase/a).
    const componentRe = /<([A-Za-z][A-Za-z0-9]*)\b[^>]*\/?>/g;
    let compMatch: RegExpExecArray | null;
    const allowedComponents = new Set(['Figure', 'Callout', 'Model3D', 'a', 'img']);
    while ((compMatch = componentRe.exec(body)) !== null) {
      const name = compMatch[1];
      if (/^[a-z]/.test(name)) continue; // markdown/html lowercase elements
      if (!allowedComponents.has(name)) {
        fail(`${slug}:1: component: unknown MDX component <${name}> (allowed: Figure, Callout, Model3D, a)`);
      }
    }

    // MDX compilation.
    if (mdxCompile) {
      try {
        await mdxCompile(body, { development: false });
      } catch (error) {
        fail(`${slug}:1: mdx: compilation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  // ---- (5) cross-surface parity ---------------------------------------------
  try {
    const runtime = getAllArticles(false);
    if (runtime.length !== nonDraftSlugs.length) {
      fail(`parity: non-draft count mismatch (validator=${nonDraftSlugs.length} runtime getAllArticles(false)=${runtime.length})`);
    }
    const runtimeSlugs = new Set(runtime.map((article) => article.slug));
    for (const slug of nonDraftSlugs) {
      if (!runtimeSlugs.has(slug)) {
        fail(`parity: slug ${slug} passes validation but is missing from getAllArticles(false)`);
      }
    }
  } catch (error) {
    fail(`parity: getAllArticles(false) threw: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Sitemap / RSS source parity + per-slug pubDate + formatDate.
  try {
    const sitemapSrc = fs.readFileSync(path.join(ROOT, 'app', 'sitemap.ts'), 'utf8');
    if (!sitemapSrc.includes('getAllArticles(false)')) {
      fail('parity: app/sitemap.ts must call getAllArticles(false) so drafts never emit');
    }
    if (!sitemapSrc.includes('/tutorial/')) {
      fail('parity: app/sitemap.ts must emit /tutorial/<slug> routes');
    }
  } catch {
    fail('parity: unable to read app/sitemap.ts');
  }
  try {
    const rssSrc = fs.readFileSync(path.join(ROOT, 'app', 'rss.xml', 'route.ts'), 'utf8');
    if (!rssSrc.includes('getAllArticles(false)')) {
      fail('parity: app/rss.xml/route.ts must call getAllArticles(false)');
    }
    if (!rssSrc.includes('pubDate')) {
      fail('parity: app/rss.xml/route.ts must emit pubDate per item');
    }
  } catch {
    fail('parity: unable to read app/rss.xml/route.ts');
  }
  for (const file of files) {
    const slug = file.replace(/\.mdx?$/, '');
    const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8');
    const { data } = matter(raw);
    if (data.draft === true) continue;
    const dateValue = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? '');
    const pubDate = new Date(`${dateValue}T00:00:00Z`);
    if (Number.isNaN(pubDate.getTime())) {
      fail(`${slug}:1: rss: invalid pubDate from date ${JSON.stringify(dateValue)}`);
    }
    try {
      formatDate(dateValue);
      if (data.updated !== undefined) {
        const updatedValue = data.updated instanceof Date ? data.updated.toISOString().slice(0, 10) : String(data.updated);
        formatDate(updatedValue);
      }
    } catch (error) {
      fail(`${slug}:1: formatDate threw: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ---- (6) summary ------------------------------------------------------------
  console.log(`[content:validate] files=${files.length} nonDraft=${nonDraftSlugs.length} errors=${errors.length} warnings=0`);
  if (errors.length > 0) {
    for (const message of errors) console.log(`[content:validate] ERROR ${message}`);
    console.log(`[content:validate] FAILED with ${errors.length} error(s)`);
    process.exit(1);
  }
  console.log('[content:validate] OK');
}

await main();
