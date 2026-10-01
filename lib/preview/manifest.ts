/**
 * Client-safe twin of the server manifest reader (`lib/article-images.ts`).
 *
 * Same math (prefix strip, traversal guard, width-sorted srcsets, fallback
 * src = serialized path), but the manifest arrives via
 * `fetch('/images/generated/articles.manifest.json')` instead of `node:fs`.
 *
 * Missing-manifest behavior matches the server (plain `<img>` fallback).
 * Missing-entry behavior is the honest preview gap (ADR-0006): a managed
 * path absent from the manifest means its derivatives were never generated
 * (typical for brand-new branch uploads), so the caller renders an explicit
 * placeholder instead of a silent broken image.
 */

export const PREVIEW_GENERATED_PREFIX = '/images/generated/articles/';

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
 * Resolve a managed src to its responsive set.
 * `manifest === null` (missing manifest): return null → plain `<img>`.
 * Managed src absent from a loaded manifest: return `{ missing: true }` →
 * honest placeholder (derivatives not yet generated).
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
