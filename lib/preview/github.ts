/**
 * Client-safe fetch of committed article MDX from the public GitHub repo.
 *
 * No `node:*` imports: this module runs in the `/preview` browser chunk.
 * Unauthenticated `api.github.com` contents API against
 * `woodengrass/nehsnepc_website` (public repo, public content — the preview
 * page is public-readable by design, see ADR-0006). Shows saved commits
 * only; unsaved Keystatic keystrokes are never visible here.
 */

export const PREVIEW_REPO = 'woodengrass/nehsnepc_website';

export const PREVIEW_DEFAULT_BRANCH = 'main';

/** Versioned article image sources mirrored by the pipeline (`assets/articles/<rel>`). */
export const PREVIEW_SOURCE_DIR = 'assets/articles';

/**
 * Client-side download cap for unprocessed originals (ADR-0006).
 * Originals are render-pixels-only; the budget keeps a branch preview from
 * pulling arbitrarily large files over an unauthenticated connection.
 */
export const PREVIEW_ORIGINAL_BUDGET_BYTES = 8 * 1024 * 1024;

/** Slug shape mirrors the server contract (`SLUG_RE` in lib/content-contract.ts). */
export const PREVIEW_SLUG_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

/** Branch names are free-form on GitHub; block only path-escape shapes. */
export function isSafeBranch(branch: string): boolean {
  if (branch.length === 0 || branch.length > 255) return false;
  if (branch.includes('..') || /[\s?#\\]/.test(branch)) return false;
  return true;
}

/**
 * Source-relative image path guard (`assets/articles/<rel>`).
 * Mirrors the traversal/shape checks of the manifest readers: non-empty,
 * no `..` segments, no leading slash, no backslashes or URL-breaking chars.
 */
export function isSafeOriginalRel(rel: string): boolean {
  if (rel.length === 0 || rel.length > 512) return false;
  if (rel.startsWith('/') || rel.includes('..') || rel.includes('\\')) return false;
  if (/[\s?#]/.test(rel)) return false;
  return true;
}

export type PreviewFetchErrorKind =
  | 'invalid-slug'
  | 'invalid-branch'
  | 'not-found'
  | 'rate-limited'
  | 'forbidden'
  | 'timeout'
  | 'network';

export class PreviewFetchError extends Error {
  readonly kind: PreviewFetchErrorKind;

  constructor(kind: PreviewFetchErrorKind, message: string) {
    super(message);
    this.name = 'PreviewFetchError';
    this.kind = kind;
  }
}

function contentsUrl(slug: string, ext: string, branch: string): string {
  return (
    `https://api.github.com/repos/${PREVIEW_REPO}/contents/` +
    `content/articles/${encodeURIComponent(slug)}.${ext}?ref=${encodeURIComponent(branch)}`
  );
}

/**
 * Stall guard for every preview GitHub fetch (ADR-0006): a hung
 * `api.github.com` connection must surface the honest timeout state, never
 * hang the preview UI. Per-fetch budget; the MDX lookup aborts on the first
 * stall (the stall is connection-level, so retrying the sibling extension
 * would only add a second budget), while image legs fall through to the next
 * URL / honest placeholder.
 */
export const PREVIEW_GITHUB_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number = PREVIEW_GITHUB_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } catch {
    if (controller.signal.aborted) {
      throw new PreviewFetchError(
        'timeout',
        '讀取逾時（30 秒內無回應），可能是連線停滯，請檢查連線後再試一次。'
      );
    }
    throw new PreviewFetchError('network', '網路連線失敗，請檢查連線後再試一次。');
  } finally {
    clearTimeout(timer);
  }
}

async function tryFetch(url: string, timeoutMs: number = PREVIEW_GITHUB_TIMEOUT_MS): Promise<Response> {
  return fetchWithTimeout(url, { Accept: 'application/vnd.github.raw' }, timeoutMs);
}

function rateLimited(response: Response): boolean {
  if (response.status !== 403) return false;
  const remaining = response.headers.get('x-ratelimit-remaining');
  if (remaining === '0') return true;
  // Unauthenticated abuse secondary limits sometimes surface as 403/429
  // without the header; treat a JSON rate-limit message as authoritative.
  return false;
}

/**
 * Fetch committed MDX source for `slug` on `branch`.
 * Tries `.mdx` then `.md` (production `getArticle` accepts both).
 * Throws `PreviewFetchError` with a Traditional-Chinese message.
 */
export async function fetchCommittedMdx(
  slug: string,
  branch: string,
  timeoutMs: number = PREVIEW_GITHUB_TIMEOUT_MS
): Promise<{ raw: string; ext: 'mdx' | 'md' }> {
  if (!PREVIEW_SLUG_RE.test(slug)) {
    throw new PreviewFetchError(
      'invalid-slug',
      `slug「${slug}」格式不正確，僅接受小寫英文、數字、連字號與底線。`
    );
  }
  if (!isSafeBranch(branch)) {
    throw new PreviewFetchError('invalid-branch', `分支「${branch}」格式不正確。`);
  }
  let sawRateLimit = false;
  for (const ext of ['mdx', 'md'] as const) {
    const response = await tryFetch(contentsUrl(slug, ext, branch), timeoutMs);
    if (response.ok) {
      return { raw: await response.text(), ext };
    }
    if (response.status === 404) continue;
    if (await isRateLimitBody(response)) {
      sawRateLimit = true;
      break;
    }
    if (rateLimited(response)) {
      sawRateLimit = true;
      break;
    }
    if (response.status === 403) {
      throw new PreviewFetchError('forbidden', 'GitHub 拒絕了這次讀取（403），請稍後再試。');
    }
    if (response.status >= 500) {
      throw new PreviewFetchError('network', `GitHub 伺服器錯誤（${response.status}），請稍後再試。`);
    }
    throw new PreviewFetchError('network', `讀取失敗（HTTP ${response.status}），請稍後再試。`);
  }
  if (sawRateLimit) {
    throw new PreviewFetchError(
      'rate-limited',
      '已達 GitHub 未登入讀取配額，請稍候再試（配額每小時重置）。'
    );
  }
  throw new PreviewFetchError(
    'not-found',
    `在分支「${branch}」找不到 slug「${slug}」的已提交文章（僅顯示已儲存的提交）。`
  );
}

async function isRateLimitBody(response: Response): Promise<boolean> {
  try {
    const clone = response.clone();
    const text = await clone.text();
    return /rate limit|abuse/i.test(text);
  } catch {
    return false;
  }
}

function originalContentsUrl(rel: string, branch: string): string {
  const encoded = rel
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return (
    `https://api.github.com/repos/${PREVIEW_REPO}/contents/` +
    `${PREVIEW_SOURCE_DIR}/${encoded}?ref=${encodeURIComponent(branch)}`
  );
}

function originalRawUrl(rel: string, branch: string): string {
  const encoded = rel
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `https://raw.githubusercontent.com/${PREVIEW_REPO}/${encodeURIComponent(branch)}/${PREVIEW_SOURCE_DIR}/${encoded}`;
}

function overBudget(response: Response): boolean {
  const declared = response.headers.get('content-length');
  if (!declared) return false;
  const size = Number(declared);
  return Number.isFinite(size) && size > PREVIEW_ORIGINAL_BUDGET_BYTES;
}

/**
 * Fetch the versioned ORIGINAL for a source-relative image path
 * (`assets/articles/<rel>`) on `branch` — the middle state of the preview
 * fallback chain (ADR-0006): the serialized managed path had no manifest
 * row, so its derivatives were never generated, but the committed original
 * is world-readable on the public repo.
 *
 * GitHub REST contents API (raw accept) is primary; `raw.githubusercontent`
 * is the fallback. Returns a blob object URL for a plain lazy `<img>`
 * (single source by definition — no srcset). Render pixels only: no EXIF
 * parsing or display anywhere in this chain.
 *
 * Throws `PreviewFetchError` with a Traditional-Chinese message when the
 * original is also unavailable (missing/oversize/offline/rate-limit) — the
 * caller keeps the existing honest placeholder in that case.
 */
export async function fetchCommittedImageOriginal(
  rel: string,
  branch: string,
  timeoutMs: number = PREVIEW_GITHUB_TIMEOUT_MS
): Promise<{ objectUrl: string; byteSize: number }> {
  if (!isSafeOriginalRel(rel)) {
    throw new PreviewFetchError('not-found', `圖片路徑「${rel}」格式不正確，無法讀取原始檔案。`);
  }
  if (!isSafeBranch(branch)) {
    throw new PreviewFetchError('invalid-branch', `分支「${branch}」格式不正確。`);
  }
  const urls = [originalContentsUrl(rel, branch), originalRawUrl(rel, branch)];
  let sawRateLimit = false;
  let sawForbidden = false;
  let sawOversize = false;
  for (const url of urls) {
    let response: Response;
    try {
      response = await fetchWithTimeout(
        url,
        url.includes('api.github.com') ? { Accept: 'application/vnd.github.raw' } : {},
        timeoutMs
      );
    } catch {
      // Stalled/offline leg (timeout is connection-level, but the sibling
      // URL is a different host and may still answer): try the next URL
      // before giving up.
      continue;
    }
    if (response.ok) {
      if (overBudget(response)) {
        sawOversize = true;
        continue;
      }
      const blob = await response.blob();
      if (blob.size > PREVIEW_ORIGINAL_BUDGET_BYTES) {
        sawOversize = true;
        continue;
      }
      return { objectUrl: URL.createObjectURL(blob), byteSize: blob.size };
    }
    if (response.status === 404) continue;
    if (await isRateLimitBody(response)) {
      sawRateLimit = true;
      break;
    }
    if (rateLimited(response)) {
      sawRateLimit = true;
      break;
    }
    if (response.status === 403) {
      sawForbidden = true;
      continue;
    }
    if (response.status >= 500) continue;
  }
  if (sawRateLimit) {
    throw new PreviewFetchError(
      'rate-limited',
      '已達 GitHub 未登入讀取配額，請稍候再試（配額每小時重置）。'
    );
  }
  if (sawForbidden) {
    throw new PreviewFetchError('forbidden', 'GitHub 拒絕了這次讀取（403），請稍後再試。');
  }
  if (sawOversize) {
    throw new PreviewFetchError(
      'network',
      `原始檔案超過 ${PREVIEW_ORIGINAL_BUDGET_BYTES / (1024 * 1024)}MiB 上限，預覽無法載入；正式建置的衍生檔不受影響。`
    );
  }
  throw new PreviewFetchError(
    'not-found',
    `在分支「${branch}」找不到原始圖片「${rel}」（衍生檔與原始檔皆無）。`
  );
}
