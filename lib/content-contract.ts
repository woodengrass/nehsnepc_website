import fs from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

/**
 * Centralized article contract.
 *
 * `lib/content.ts` stays the loose runtime reader (warn-skip as
 * defense-in-depth). This module is the strict build-time contract consumed by
 * `scripts/validate_articles.ts` (fail-fast) and re-exported by
 * `lib/content.ts` so valid public behavior never diverges.
 *
 * Cross-entry / conditional / media / full-MDX checks live in repository and
 * build validation only — they are not guaranteed pre-save validation for CMS
 * entries.
 *
 * Media rule (post-migration, ADR-0004): article covers and Figure sources are
 * editor-managed paths under `/images/generated/articles/<slug>/…`, backed by
 * versioned sources under `assets/articles/<slug>/…`. Anything else fails.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const SLUG_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

export const ALLOWED_CATEGORIES = ['basic', 'topic', 'news'] as const;

export type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number];

export const CATEGORIES = [
  { id: 'basic', label: '基礎攝影', description: '曝光、構圖、對焦等入門基本功。' },
  { id: 'topic', label: '主題攝影', description: '人像、風景、街拍等主題拍攝技法。' },
  { id: 'news', label: '社團動態', description: '活動記錄、招新資訊與作品回顧。' }
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

export function isCategoryId(value: string): value is CategoryId {
  return (ALLOWED_CATEGORIES as readonly string[]).includes(value);
}

export function getCategory(id: string) {
  return CATEGORIES.find((category) => category.id === id);
}

/** Public-path prefix accepted for managed article covers / inline images. */
export const COVER_PREFIXES = ['/images/generated/articles/'] as const;

/** Public-path prefix accepted for optimized GLB models. */
export const MODEL_PREFIX = '/models/opt/';

export const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'] as const;

export const MODEL_EXT = '.glb' as const;

/** Minimum meaningful alt-text length (trimmed). */
export const MIN_ALT_LENGTH = 4;

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Strict calendar check: regex shape + real round-trip through UTC.
 * Rejects rollovers such as 2026-02-30 (which Date would normalize).
 */
export function isIsoCalendarDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const dt = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return false;
  return dt.getUTCFullYear() === year && dt.getUTCMonth() + 1 === month && dt.getUTCDate() === day;
}

export function isUrlSafeSlug(value: string): boolean {
  return SLUG_RE.test(value);
}

function hasImageExt(value: string): boolean {
  const lower = value.toLowerCase().split('?')[0].split('#')[0];
  return (IMAGE_EXTS as readonly string[]).some((ext) => lower.endsWith(ext));
}

export function isAllowedCoverPath(value: string): boolean {
  if (!value.startsWith('/')) return false;
  const prefixed = (COVER_PREFIXES as readonly string[]).some((prefix) => value.startsWith(prefix));
  if (!prefixed) return false;
  return hasImageExt(value);
}

export function isAllowedModelPath(value: string): boolean {
  if (!value.startsWith(MODEL_PREFIX)) return false;
  return value.toLowerCase().endsWith(MODEL_EXT);
}

// ---------------------------------------------------------------------------
// Strict frontmatter schema (build validation; runtime stays loose)
// ---------------------------------------------------------------------------

/**
 * Accepts string | Date (YAML timestamps) then normalizes to YYYY-MM-DD and
 * enforces a real calendar date. Loose runtime schema in lib/content.ts only
 * normalizes; this strict schema additionally rejects non-ISO and rollovers.
 */
export const isoDateSchema = z
  .union([z.string(), z.date()])
  .transform((value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value))
  .pipe(
    z
      .string()
      .regex(ISO_DATE_RE, 'date must be ISO YYYY-MM-DD')
      .refine(isIsoCalendarDate, 'date must be a real calendar date')
  );

export function validateTags(tags: string[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  tags.forEach((tag, index) => {
    const trimmed = tag.trim();
    if (trimmed.length === 0) {
      errors.push(`tags[${index}] must be non-empty after trimming`);
      return;
    }
    if (trimmed !== tag) {
      errors.push(`tags[${index}] must be trimmed (got ${JSON.stringify(tag)})`);
    }
    if (seen.has(trimmed)) {
      errors.push(`tags[${index}] duplicate tag ${JSON.stringify(trimmed)}`);
    }
    seen.add(trimmed);
  });
  return errors;
}

export function validateCoverPairing(cover: string | undefined, coverAlt: string | undefined): string[] {
  const errors: string[] = [];
  const hasCover = cover !== undefined && cover.trim().length > 0;
  const hasAlt = coverAlt !== undefined && coverAlt.trim().length > 0;
  const coverPresent = cover !== undefined;
  const altPresent = coverAlt !== undefined;
  // Empty-string values are never valid pairings.
  if ((coverPresent && !hasCover) || (altPresent && !hasAlt)) {
    errors.push('cover/coverAlt must both be absent or both be non-empty strings');
    return errors;
  }
  if (hasCover !== hasAlt) {
    errors.push('cover/coverAlt must both be absent or both be present (pairing required)');
    return errors;
  }
  if (hasCover && hasAlt) {
    if (!isAllowedCoverPath(cover!.trim())) {
      errors.push(`cover path ${JSON.stringify(cover)} must start with ${COVER_PREFIXES.join(' or ')} and end with an image extension`);
    }
    if (coverAlt!.trim().length < MIN_ALT_LENGTH) {
      errors.push(`coverAlt must be at least ${MIN_ALT_LENGTH} characters of meaningful text`);
    }
  }
  return errors;
}

export const frontmatterStrictSchema = z
  .object({
    title: z.string().min(1, 'title is required and must be non-empty'),
    description: z.string().min(1, 'description is required and must be non-empty'),
    date: isoDateSchema,
    updated: isoDateSchema.optional(),
    category: z.enum(ALLOWED_CATEGORIES, { message: 'category must be basic | topic | news' }),
    tags: z
      .array(z.string())
      .default([])
      .superRefine((tags, ctx) => {
        for (const message of validateTags(tags)) {
          ctx.addIssue({ code: 'custom', message });
        }
      }),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    // Legacy Zod fallback stays false; new CMS entries default true (Keystatic
    // schema default in a later todo). The validator accepts both.
    draft: z.boolean().default(false),
    author: z.string().default('NEHS 攝影社')
  })
  .superRefine((data, ctx) => {
    for (const message of validateCoverPairing(data.cover, data.coverAlt)) {
      ctx.addIssue({ code: 'custom', message });
    }
  });

export type StrictFrontmatter = z.infer<typeof frontmatterStrictSchema>;

// ---------------------------------------------------------------------------
// MDX body scanners
// ---------------------------------------------------------------------------

export type FigureUsage = {
  src: string;
  alt: string | null;
  width: string | null;
  height: string | null;
  raw: string;
};

export type Model3DUsage = {
  src: string;
  alt: string | null;
  poster: string | null;
  raw: string;
};

function attrAsString(tag: string, name: string): string | null {
  // Matches src="..." | src='...' | src={"..."} | src={'...'}
  const re = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*"([^"]*)"\\s*\\}|\\{\\s*'([^']*)'\\s*\\})`);
  const m = tag.match(re);
  if (!m) return null;
  return (m[1] ?? m[2] ?? m[3] ?? m[4] ?? null) as string | null;
}

function attrRaw(tag: string, name: string): string | null {
  // Raw attribute value incl. braces, e.g. width={800} | width="800"
  const re = new RegExp(`${name}\\s*=\\s*(\\{[^}]*\\}|"[^"]*"|'[^']*')`);
  const m = tag.match(re);
  return m ? m[1] : null;
}

/** All `<Figure ...>` usages (self-closing or open tag). */
export function findFigureUsages(body: string): FigureUsage[] {
  const out: FigureUsage[] = [];
  const re = /<Figure\b[^>]*\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const raw = m[0];
    out.push({
      src: attrAsString(raw, 'src') ?? '',
      alt: attrAsString(raw, 'alt'),
      width: attrRaw(raw, 'width'),
      height: attrRaw(raw, 'height'),
      raw
    });
  }
  return out;
}

/** All `<Model3D ...>` usages (self-closing or open tag). */
export function findModel3DUsages(body: string): Model3DUsage[] {
  const out: Model3DUsage[] = [];
  const re = /<Model3D\b[^>]*\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const raw = m[0];
    out.push({
      src: attrAsString(raw, 'src') ?? '',
      alt: attrAsString(raw, 'alt'),
      poster: attrAsString(raw, 'poster'),
      raw
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

/** Source root for editor-managed article images (tracked versioned originals). */
export const ARTICLE_SOURCE_ROOT = 'assets/articles';

/** Generated-derivative root served to readers (gitignored build outputs). */
export const ARTICLE_GENERATED_PREFIX = '/images/generated/articles/';

export function publicFileExists(publicPath: string, root = process.cwd()): boolean {
  if (!publicPath.startsWith('/')) return false;
  const rel = publicPath.replace(/^\//, '').split('?')[0].split('#')[0];
  return fs.existsSync(path.join(root, 'public', rel));
}
