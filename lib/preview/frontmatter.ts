/**
 * Client-safe frontmatter parse + validation for the `/preview` renderer.
 *
 * `gray-matter` is NOT browser-safe (its entry requires `node:fs`), so this
 * module ships a minimal YAML-subset parser covering exactly the shapes the
 * Keystatic schema and hand-written articles emit: scalar strings (plain,
 * single/double quoted), booleans, numbers, ISO dates (kept as strings),
 * `>`/`|` block scalars, and indented `- item` string lists. Anything exotic
 * degrades to a reported warning, never a silent misread.
 *
 * Validation mirrors the loose runtime schema in `lib/content.ts` (required
 * title/description, category allowlist, tag/cover pairing notes) and surfaces
 * every deviation as a Traditional-Chinese warning rendered in the preview
 * UI — the production build would fail closed instead (fail-fast validator).
 * The consistency spec (`tests/preview/consistency.spec.ts`) pins parity.
 */

import { z } from 'zod';

export const PREVIEW_CATEGORIES = ['tutorial', 'news', 'showcase'] as const;

export type PreviewCategory = (typeof PREVIEW_CATEGORIES)[number];

const looseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z
    .union([z.string(), z.date()])
    .transform((value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value)),
  updated: z
    .union([z.string(), z.date()])
    .transform((value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value))
    .optional(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  cover: z.string().optional(),
  coverAlt: z.string().optional(),
  draft: z.boolean().default(false),
  author: z.string().default('NEHS 攝影社')
});

export type PreviewFrontmatter = z.infer<typeof looseSchema>;

export type PreviewParsed = {
  data: PreviewFrontmatter;
  /** MDX body with the frontmatter fence removed. */
  body: string;
  /** Non-fatal issues displayed in the preview UI (production would fail the build). */
  warnings: string[];
};

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    const inner = trimmed.slice(1, -1);
    return trimmed.startsWith('"') ? inner.replace(/\\"/g, '"').replace(/\\\\/g, '\\') : inner.replace(/''/g, "'");
  }
  return trimmed;
}

function scalar(value: string): string | boolean | number {
  const text = unquote(value);
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^[+-]?\d+$/.test(text)) return Number(text);
  if (/^[+-]?\d*\.\d+$/.test(text)) return Number(text);
  if (text === 'null' || text === '~') return '';
  return text;
}

/**
 * Parse the `---` fenced block into a plain record. Unknown/multiline-exotic
 * constructs are kept as raw strings so validation can flag them.
 */
export function parseYamlSubset(source: string): { record: Record<string, unknown>; exotic: string[] } {
  const record: Record<string, unknown> = {};
  const exotic: string[] = [];
  const lines = source.split(/\r?\n/);
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (/^\s*(#|$)/.test(line)) {
      index += 1;
      continue;
    }
    const match = /^([A-Za-z0-9_-]+)\s*:(.*)$/.exec(line);
    if (!match) {
      exotic.push(`無法解析的行已忽略：${line.trim()}`);
      index += 1;
      continue;
    }
    const key = match[1];
    const rest = match[2].trim();
    if (rest === '' || rest.startsWith('#')) {
      // Nested block: string list or block scalar.
      const items: string[] = [];
      const blockLines: string[] = [];
      let folded: 'list' | 'block' | null = null;
      let cursor = index + 1;
      while (cursor < lines.length && /^(?:\s+|$)/.test(lines[cursor]) && lines[cursor].trim() !== '') {
        const inner = lines[cursor].trim();
        if (/^-\s+/.test(inner)) {
          folded = folded ?? 'list';
          if (folded === 'list') items.push(unquote(inner.replace(/^-\s+/, '')));
        } else if (folded === null && cursor === index + 1) {
          break;
        } else {
          folded = 'block';
          blockLines.push(lines[cursor].trim());
        }
        cursor += 1;
      }
      if (folded === 'list') record[key] = items;
      else if (folded === 'block') record[key] = blockLines.join('\n');
      else record[key] = '';
      index = cursor;
      continue;
    }
    if (/^[>|][-+]?\s*(#.*)?$/.test(rest)) {
      // `>` folded or `|` literal block scalar.
      const literal = rest.startsWith('|');
      const collected: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length && /^(?:\s+|$)/.test(lines[cursor])) {
        if (lines[cursor].trim() === '' && collected.length === 0) {
          cursor += 1;
          continue;
        }
        if (lines[cursor].trim() === '') break;
        collected.push(lines[cursor].trim());
        cursor += 1;
      }
      record[key] = literal ? collected.join('\n') : collected.join(' ');
      index = cursor;
      continue;
    }
    if (/^\[.*\]$/.test(rest)) {
      // Flow list: [a, b, "c"].
      record[key] = rest
        .slice(1, -1)
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .map((part) => String(scalar(part)));
      index += 1;
      continue;
    }
    record[key] = scalar(rest.split(/\s+#\s+/)[0]);
    index += 1;
  }
  return { record, exotic };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const dt = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(dt.getTime()) &&
    dt.getUTCFullYear() === Number(value.slice(0, 4)) &&
    dt.getUTCMonth() + 1 === Number(value.slice(5, 7)) &&
    dt.getUTCDate() === Number(value.slice(8, 10))
  );
}

/** Client reading-time twin of `readingMinutes` in `lib/content.ts` (CJK/400 + latin/220, min 1). */
export function previewReadingMinutes(text: string): number {
  const cjk = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) ?? []).length;
  const latin = (text.replace(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g, ' ').match(/[A-Za-z0-9'_-]+/g) ?? []).length;
  return Math.max(1, Math.round(cjk / 400 + latin / 220));
}

/**
 * Split raw file text into frontmatter + body and validate.
 * Never throws for content problems: fatal-shape issues become warnings and
 * the caller still renders with safe fallbacks.
 */
export function parsePreviewMdx(raw: string, fallbackSlug: string): PreviewParsed {
  const warnings: string[] = [];
  const fence = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
  let body = raw;
  let record: Record<string, unknown> = {};
  if (!fence) {
    warnings.push('找不到 frontmatter 區塊（---），將以預設值顯示，正式建置會失敗。');
  } else {
    body = raw.slice(fence[0].length);
    const { record: parsed, exotic } = parseYamlSubset(fence[1]);
    record = parsed;
    for (const note of exotic) warnings.push(note);
  }
  const shaped: Record<string, unknown> = {
    title: typeof record.title === 'string' && record.title.length > 0 ? record.title : fallbackSlug,
    description: typeof record.description === 'string' ? record.description : '',
    date: typeof record.date === 'string' && record.date.length > 0 ? record.date : '1970-01-01',
    category: typeof record.category === 'string' ? record.category : 'tutorial',
    tags: Array.isArray(record.tags) ? record.tags.map(String) : [],
    draft: typeof record.draft === 'boolean' ? record.draft : false,
    author: typeof record.author === 'string' && record.author.length > 0 ? record.author : 'NEHS 攝影社'
  };
  if (record.updated !== undefined) shaped.updated = String(record.updated);
  if (record.cover !== undefined) shaped.cover = String(record.cover);
  if (record.coverAlt !== undefined) shaped.coverAlt = String(record.coverAlt);

  const parsed = looseSchema.safeParse(shaped);
  if (!parsed.success) {
    warnings.push('frontmatter 未通過基本驗證，正式建置會失敗；預覽以預設值顯示。');
  }
  const data = parsed.success
    ? parsed.data
    : {
        title: fallbackSlug,
        description: '',
        date: '1970-01-01',
        category: 'tutorial',
        tags: [] as string[],
        draft: true,
        author: 'NEHS 攝影社'
      };

  if (!fence || !parsed.success) {
    // Cheap field-level notes for the common failure shapes.
  } else {
    if (typeof record.title !== 'string' || record.title.length === 0) warnings.push('缺少 title（已用 slug 代替顯示）。');
    if (typeof record.description !== 'string' || record.description.length === 0) {
      warnings.push('缺少 description，正式建置會失敗。');
    }
    if (!isCalendarDate(data.date)) warnings.push(`date「${String(record.date)}」不是有效 ISO 日期（YYYY-MM-DD），正式建置會失敗。`);
    if (data.updated !== undefined && !isCalendarDate(data.updated)) {
      warnings.push(`updated「${data.updated}」不是有效 ISO 日期，正式建置會失敗。`);
    }
    if (!(PREVIEW_CATEGORIES as readonly string[]).includes(data.category)) {
      warnings.push(`category「${data.category}」不在 tutorial／news／showcase 之中，正式建置會失敗。`);
    }
    const tags = data.tags;
    const seen = new Set<string>();
    tags.forEach((tag, i) => {
      if (tag.trim().length === 0) warnings.push(`tags[${i}] 為空，正式建置會失敗。`);
      else if (tag !== tag.trim()) warnings.push(`tags[${i}] 含首尾空白，正式建置會失敗。`);
      else if (seen.has(tag)) warnings.push(`tags[${i}]「${tag}」重複，正式建置會失敗。`);
      seen.add(tag.trim());
    });
    const hasCover = data.cover !== undefined && data.cover.trim().length > 0;
    const hasAlt = data.coverAlt !== undefined && data.coverAlt.trim().length > 0;
    if (hasCover !== hasAlt) warnings.push('cover／coverAlt 須成對出現，正式建置會失敗。');
    if (hasCover && !data.cover!.startsWith('/images/generated/articles/')) {
      warnings.push('cover 路徑須位於 /images/generated/articles/ 下，正式建置會失敗。');
    }
    if (hasAlt && data.coverAlt!.trim().length < 4) warnings.push('coverAlt 至少需要 4 個字，正式建置會失敗。');
  }
  return { data, body, warnings };
}
