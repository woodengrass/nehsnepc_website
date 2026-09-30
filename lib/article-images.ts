/**
 * Server-only manifest reader for editor-managed article images (ADR-0004).
 *
 * `scripts/optimize_article_images.js` mirrors versioned sources
 * (`assets/articles/<rel>`) to generated outputs
 * (`public/images/generated/articles/<rel>`) plus width-suffixed AVIF/WebP
 * derivatives, recording measured (non-upscaled) widths in the atomic
 * manifest `public/images/generated/articles.manifest.json`.
 *
 * `TutorialCover` and `Figure` derive their srcsets from that manifest so a
 * new slug never needs a hardcoded width table.
 *
 * NODE-ONLY (`node:fs`): import from server components only. Never import
 * from client components — the editor preview uses the client-safe
 * `EditorFigurePreview` instead.
 */

import fs from 'node:fs';
import path from 'node:path';

export const ARTICLE_GENERATED_PREFIX = '/images/generated/articles/';

export type ArticleManifestItem = {
  mtimeMs: number;
  size: number;
  widths: number[];
  fallback: string;
  outputs: string[];
};

type ArticleManifest = {
  version: 1;
  generatedAt: string | null;
  tools: { sharp: string; node: string } | null;
  items: Record<string, ArticleManifestItem>;
};

export type ArticleImageSet = {
  /** Source-relative path, e.g. `example/cover.jpg`. */
  rel: string;
  /** Measured non-upscaled widths from the manifest. */
  widths: number[];
  avifSrcSet: string;
  webpSrcSet: string;
  /** Fallback `<img>` src: the serialized path itself (fallback is emitted there). */
  fallbackSrc: string;
};

function readManifest(): ArticleManifest | null {
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'images', 'generated', 'articles.manifest.json');
    const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as unknown;
    if (!raw || typeof raw !== 'object' || !('items' in raw)) return null;
    const items = (raw as { items: unknown }).items;
    if (!items || typeof items !== 'object') return null;
    return raw as ArticleManifest;
  } catch {
    return null;
  }
}

/**
 * Resolve a managed article image src to its manifest-derived responsive set.
 * Returns null for non-managed paths, traversal attempts, or manifest misses
 * (callers fall back to a plain `<img>`).
 */
export function articleImageSet(src: string): ArticleImageSet | null {
  if (!src.startsWith(ARTICLE_GENERATED_PREFIX)) return null;
  const rel = src.slice(ARTICLE_GENERATED_PREFIX.length).split('?')[0].split('#')[0];
  if (rel.length === 0 || rel.includes('..')) return null;
  const manifest = readManifest();
  const item = manifest?.items[rel];
  if (!item || !Array.isArray(item.widths) || item.widths.length === 0) return null;
  const slash = rel.lastIndexOf('/');
  const dir = slash >= 0 ? rel.slice(0, slash) : '';
  const file = slash >= 0 ? rel.slice(slash + 1) : rel;
  const dot = file.lastIndexOf('.');
  const base = dot > 0 ? file.slice(0, dot) : file;
  const prefix = dir ? `${ARTICLE_GENERATED_PREFIX}${dir}/${base}` : `${ARTICLE_GENERATED_PREFIX}${base}`;
  const widths = [...item.widths].sort((a, b) => a - b);
  return {
    rel,
    widths,
    avifSrcSet: widths.map((width) => `${prefix}-${width}.avif ${width}w`).join(', '),
    webpSrcSet: widths.map((width) => `${prefix}-${width}.webp ${width}w`).join(', '),
    fallbackSrc: src
  };
}
