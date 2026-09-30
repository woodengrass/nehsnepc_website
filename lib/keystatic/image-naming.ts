/**
 * Collision-safe Figure filenames without a `node:crypto` import (which would
 * pull `crypto-browserify` into the Keystatic admin browser bundle).
 * `crypto.randomUUID` exists in Node 19+ and in secure browser contexts
 * (including `http://127.0.0.1` loopback dev).
 */
function newUuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // Fallback: 122 bits of entropy formatted as a UUID v4 string.
  const bytes = c.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Source-image size budget honored by the compat gate (8 MiB). */
export const ARTICLE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

/** Split `hero-1.jpg` into `{ base: 'hero-1', ext: '.jpg' }` (ext keeps original case). */
export function splitImageFilename(originalFilename: string): { base: string; ext: string } {
  const leaf = originalFilename.split(/[\\/]/).pop() ?? originalFilename;
  const dot = leaf.lastIndexOf('.');
  if (dot <= 0 || dot === leaf.length - 1) return { base: leaf, ext: '' };
  return { base: leaf.slice(0, dot), ext: leaf.slice(dot) };
}

/**
 * Sanitize a basename for URL/filesystem use: collapse unsafe runs to `-`,
 * trim leading/trailing dashes/dots, lowercase, fallback to `image`.
 */
export function sanitizeImageBasename(base: string): string {
  const cleaned = base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .toLowerCase();
  return cleaned.length > 0 ? cleaned.slice(0, 80) : 'image';
}

/**
 * Collision-safe Figure filename: `<uuid>-<sanitized-original-basename><original-extension>`.
 * Used as Keystatic `transformFilename` for Figure images inside the MDX editor
 * (top-level `fields.image` ignores `transformFilename` by design).
 */
export function figureTransformFilename(originalFilename: string): string {
  const { base, ext } = splitImageFilename(originalFilename);
  return `${newUuid()}-${sanitizeImageBasename(base)}${ext.toLowerCase()}`;
}

/** Assert a source file honors the 8 MiB budget; throws with byte counts on violation. */
export function assertSourceImageBudget(label: string, bytes: number): void {
  if (bytes > ARTICLE_IMAGE_MAX_BYTES) {
    throw new Error(
      `[keystatic] ${label} exceeds 8 MiB budget: ${bytes} > ${ARTICLE_IMAGE_MAX_BYTES}`
    );
  }
}
