/**
 * Client-safe twin of the server manifest reader (`lib/article-images.ts`).
 *
 * Same math (prefix strip, traversal guard, width-sorted srcsets, fallback
 * src = serialized path), but the manifest arrives via
 * `fetch('/images/generated/articles.manifest.json')` instead of `node:fs`.
 *
 * Missing-manifest behavior matches the server (plain `<img>` fallback).
 *
 * Three-state fallback chain (ADR-0006):
 *   1. generated → responsive `<picture>` (srcset math below);
 *   2. managed path absent from a loaded manifest → versioned ORIGINAL
 *      (`assets/articles/<rel>` on the same branch, via
 *      `fetchCommittedImageOriginal`, plain lazy `<img>` + honest badge);
 *   3. original also unavailable → honest placeholder (`MissingImage`).
 * A managed path absent from the manifest means its derivatives were never
 * generated (typical for brand-new branch uploads).
 */

export const PREVIEW_GENERATED_PREFIX = '/images/generated/articles/';

/** Versioned source dir mirrored 1:1 to the generated prefix by the pipeline. */
export const PREVIEW_SOURCE_PREFIX = 'assets/articles/';

export type PreviewManifestItem = {
  widths: number[];
};

export type PreviewManifest = {
  items: Record<string, PreviewManifestItem>;
};

export type PreviewImageSet = {
  rel: string;
  widths: number[];
  avifSrcSet: string;
  webpSrcSet: string;
  fallbackSrc: string;
};

let cached: PreviewManifest | null | undefined;

export function resetPreviewManifestCache(): void {
  cached = undefined;
}

/** Same-origin fetch; returns null when the manifest is absent (plain-img fallback). */
export async function loadPreviewManifest(): Promise<PreviewManifest | null> {
  if (cached !== undefined) return cached;
  try {
    const response = await fetch('/images/generated/articles.manifest.json', { cache: 'no-store' });
    if (!response.ok) {
      cached = null;
      return null;
    }
    const raw = (await response.json()) as unknown;
    if (!raw || typeof raw !== 'object' || !('items' in raw)) {
      cached = null;
      return null;
    }
    const items = (raw as { items: unknown }).items;
    if (!items || typeof items !== 'object') {
      cached = null;
      return null;
    }
    cached = { items: items as Record<string, PreviewManifestItem> };
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

export function isManagedPreviewSrc(src: string): boolean {
  if (!src.startsWith(PREVIEW_GENERATED_PREFIX)) return false;
  const rel = src.slice(PREVIEW_GENERATED_PREFIX.length).split('?')[0].split('#')[0];
  return rel.length > 0 && !rel.includes('..');
}

/**
 * Mirror a serialized managed path to its versioned source rel:
 * `/images/generated/articles/<rel>` → `<rel>` for
 * `assets/articles/<rel>` on the same branch. Returns null for non-managed
 * or traversal paths (those never reach the original chain).
 */
export function previewSourceRel(src: string): string | null {
  if (!isManagedPreviewSrc(src)) return null;
  return src.slice(PREVIEW_GENERATED_PREFIX.length).split('?')[0].split('#')[0];
}

/**
 * Resolve a managed src to its responsive set.
 * `manifest === null` (missing manifest): return null → plain `<img>`.
 * Managed src absent from a loaded manifest: return `{ missing: true }` →
 * the caller tries the versioned original first (`previewSourceRel` +
 * `fetchCommittedImageOriginal`) and keeps the honest placeholder only when
 * the original is also unavailable.
 */
export function previewImageSet(
  src: string,
  manifest: PreviewManifest | null
): { set: PreviewImageSet } | { missing: true } | null {
  if (!isManagedPreviewSrc(src)) return null;
  const rel = src.slice(PREVIEW_GENERATED_PREFIX.length).split('?')[0].split('#')[0];
  const item = manifest?.items[rel];
  if (!item || !Array.isArray(item.widths) || item.widths.length === 0) {
    return manifest ? { missing: true } : null;
  }
  const slash = rel.lastIndexOf('/');
  const dir = slash >= 0 ? rel.slice(0, slash) : '';
  const file = slash >= 0 ? rel.slice(slash + 1) : rel;
  const dot = file.lastIndexOf('.');
  const base = dot > 0 ? file.slice(0, dot) : file;
  const prefix = dir ? `${PREVIEW_GENERATED_PREFIX}${dir}/${base}` : `${PREVIEW_GENERATED_PREFIX}${base}`;
  const widths = [...item.widths].sort((a, b) => a - b);
  return {
    set: {
      rel,
      widths,
      avifSrcSet: widths.map((width) => `${prefix}-${width}.avif ${width}w`).join(', '),
      webpSrcSet: widths.map((width) => `${prefix}-${width}.webp ${width}w`).join(', '),
      fallbackSrc: src
    }
  };
}
