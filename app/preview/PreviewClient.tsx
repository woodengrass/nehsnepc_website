'use client';

// Preview shell: slug+branch form, GitHub fetch, frontmatter parse, and
// loading/error states in zh-TW. The heavy MDX compiler is code-split one
// level deeper (./PreviewRenderer, also ssr:false via this route) so the
// initial preview chunk stays a light shell.
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  PREVIEW_DEFAULT_BRANCH,
  PreviewFetchError,
  fetchCommittedMdx
} from '@/lib/preview/github';
import { parsePreviewMdx, type PreviewParsed } from '@/lib/preview/frontmatter';

const PreviewRenderer = dynamic(() => import('./PreviewRenderer'), { ssr: false });

type Status =
  | { phase: 'idle' }
  | { phase: 'loading'; slug: string; branch: string }
  | { phase: 'error'; message: string; detail?: string }
  | { phase: 'ready'; slug: string; branch: string; parsed: PreviewParsed };

function ShellNote() {
  return (
    <p className="mt-4 border-l-4 border-[var(--color-red)] bg-[rgba(104,19,28,0.08)] px-5 py-4 text-[0.85rem] leading-[1.9] text-[var(--color-text)]">
      僅顯示已儲存的提交：此頁讀取 GitHub 上的已提交檔案，未按儲存的打字內容不會出現在這裡。內容為公開儲存庫的公開文章，SEO／JSON-LD
      不在此預覽。
    </p>
  );
}

export default function PreviewClient() {
  return (
    <Suspense>
      <PreviewInner />
    </Suspense>
  );
}

function PreviewInner() {
  const params = useSearchParams();
  const initialSlug = params.get('slug') ?? '';
  const initialBranch = params.get('branch') ?? PREVIEW_DEFAULT_BRANCH;
  const [slugInput, setSlugInput] = useState(initialSlug);
  const [branchInput, setBranchInput] = useState(initialBranch);
  const [status, setStatus] = useState<Status>({ phase: 'idle' });

  const load = useCallback(async (slug: string, branch: string) => {
    const cleanSlug = slug.trim();
    const cleanBranch = branch.trim() || PREVIEW_DEFAULT_BRANCH;
    if (!cleanSlug) {
      setStatus({ phase: 'error', message: '請輸入 slug。', detail: '例如：example' });
      return;
    }
    setStatus({ phase: 'loading', slug: cleanSlug, branch: cleanBranch });
    try {
      const { raw } = await fetchCommittedMdx(cleanSlug, cleanBranch);
      const parsed = parsePreviewMdx(raw, cleanSlug);
      setStatus({ phase: 'ready', slug: cleanSlug, branch: cleanBranch, parsed });
    } catch (error) {
      if (error instanceof PreviewFetchError) {
        setStatus({ phase: 'error', message: error.message });
      } else {
        setStatus({ phase: 'error', message: '發生未預期的錯誤，請稍後再試。' });
      }
    }
  }, []);

  useEffect(() => {
    if (initialSlug) void load(initialSlug, initialBranch);
    // Boot from URL once; later navigations go through the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main data-preview-root lang="zh-TW" className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-[760px] px-8 pb-10 pt-28 max-[767px]:px-[1.2rem] max-[767px]:pt-24">
        <p className="text-[0.64rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">
          Preview／分支文章預覽（不列入索引）
        </p>
        <h1 className="mt-4 text-[clamp(2rem,5vw,3.4rem)] font-semibold leading-[1.2] tracking-[-0.04em]">
          分支文章預覽
        </h1>
        <ShellNote />
        <form
          className="mt-8 grid gap-4 border-y border-[var(--color-line)] py-6 max-[767px]:grid-cols-1"
          onSubmit={(event) => {
            event.preventDefault();
            void load(slugInput, branchInput);
          }}
        >
          <label className="grid gap-2 text-[0.78rem] tracking-[0.06em] text-[var(--color-muted)]">
            SLUG
            <input
              value={slugInput}
              onChange={(event) => setSlugInput(event.target.value)}
              placeholder="example"
              autoComplete="off"
              spellCheck={false}
              aria-label="文章 slug"
              className="border border-[var(--color-line)] bg-transparent px-3 py-2 text-[1rem] text-[var(--color-text)]"
            />
          </label>
          <label className="grid gap-2 text-[0.78rem] tracking-[0.06em] text-[var(--color-muted)]">
            BRANCH（預設 main）
            <input
              value={branchInput}
              onChange={(event) => setBranchInput(event.target.value)}
              placeholder={PREVIEW_DEFAULT_BRANCH}
              autoComplete="off"
              spellCheck={false}
              aria-label="分支名稱"
              className="border border-[var(--color-line)] bg-transparent px-3 py-2 text-[1rem] text-[var(--color-text)]"
            />
          </label>
          <button
            type="submit"
            className="mt-2 w-fit border-t border-[#101d2b] bg-[#101d2b] px-6 py-3 text-[0.9rem] tracking-[0.08em] text-[var(--color-paper)] transition-colors hover:border-[var(--color-red)] hover:bg-[var(--color-red)] hover:text-[var(--color-ink)]"
          >
            載入已提交的文章
          </button>
        </form>

        {status.phase === 'loading' ? (
          <p role="status" className="py-16 text-[1rem] leading-[1.9] text-[var(--color-muted)]">
            正在從分支「{status.branch}」讀取「{status.slug}」的已提交內容……
          </p>
        ) : null}
        {status.phase === 'error' ? (
          <div role="alert" className="py-16">
            <p className="border-l-4 border-[var(--color-red)] pl-5 text-[1.1rem] leading-[1.9]">讀取失敗</p>
            <p className="mt-3 pl-5 text-[0.95rem] leading-[1.9] text-[var(--color-text)]">{status.message}</p>
            {status.detail ? (
              <p className="mt-2 pl-5 text-[0.85rem] leading-[1.9] text-[var(--color-muted)]">{status.detail}</p>
            ) : null}
          </div>
        ) : null}
        {status.phase === 'idle' ? (
          <p className="py-16 text-[1rem] leading-[1.9] text-[var(--color-muted)]">
            輸入 slug 與分支後載入；也可直接用網址參數開啟，例如 `/preview?slug=example&amp;branch=main`。
          </p>
        ) : null}
      </div>

      {status.phase === 'ready' ? (
        <PreviewRenderer slug={status.slug} branch={status.branch} parsed={status.parsed} />
      ) : (
        <nav aria-label="站內導覽" className="mx-auto max-w-[760px] px-8 pb-24 max-[767px]:px-[1.2rem]">
          <Link href="/tutorial" className="underline underline-offset-4">
            返回文章索引
          </Link>
        </nav>
      )}
    </main>
  );
}
