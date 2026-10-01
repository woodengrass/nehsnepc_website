'use client';

// Browser MDX compile + full article layout for `/preview`.
// Layout mirrors `app/tutorial/[slug]/page.tsx` (same grid, type, cover,
// prose, and license footer) so the preview looks like the article.
// Deliberate gaps (ADR-0006): no JSON-LD/SEO, no adjacent-article nav, and
// frontmatter problems render as visible warnings instead of failing.
import Link from 'next/link';
import { useEffect, useState } from 'react';

import Callout from '@/components/mdx/Callout';
import MDXLink from '@/components/mdx/MDXLink';
import Model3D from '@/components/mdx/Model3D';
import { formatDate } from '@/lib/format';
import { compilePreviewBody } from '@/lib/preview/pipeline';
import { fetchCommittedImageOriginal } from '@/lib/preview/github';
import {
  loadPreviewManifest,
  previewImageSet,
  previewSourceRel,
  type PreviewImageSet,
  type PreviewManifest
} from '@/lib/preview/manifest';
import { previewReadingMinutes, type PreviewParsed } from '@/lib/preview/frontmatter';

type PreviewRendererProps = {
  slug: string;
  branch: string;
  parsed: PreviewParsed;
};

function MissingImage({ src, label }: { src: string; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      data-preview-missing-image={src}
      className="block border border-dashed border-[var(--color-red)] bg-[rgba(104,19,28,0.08)] px-5 py-10 text-center text-[0.85rem] leading-[1.9] text-[var(--color-text)]"
    >
      圖片衍生檔尚未產生：{src}
      <span className="mt-2 block text-[0.78rem] text-[var(--color-muted)]">
        分支上的新圖片需等待建置產生衍生檔；合併並建置成功後會正常顯示。
      </span>
    </span>
  );
}

function PreviewPicture({ set, alt, width, height }: { set: PreviewImageSet; alt: string; width?: number; height?: number }) {
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={set.avifSrcSet} />
      <source type="image/webp" srcSet={set.webpSrcSet} />
      <img src={set.fallbackSrc} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
    </picture>
  );
}

/**
 * Middle state of the preview fallback chain (ADR-0006): the managed path
 * has no manifest row (derivatives never generated), so fetch the versioned
 * ORIGINAL (`assets/articles/<rel>`) on the same branch and render pixels
 * only — a plain lazy `<img>` with no srcset (single source by definition)
 * plus an honest badge. Object URL is revoked on unmount/rel change.
 * When the original is also unavailable, keep the honest placeholder.
 */
function PreviewOriginalImage({
  rel,
  branch,
  src,
  alt,
  width,
  height
}: {
  rel: string;
  branch: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setObjectUrl(null);
    setFailed(false);
    fetchCommittedImageOriginal(rel, branch).then(
      (result) => {
        if (cancelled) {
          URL.revokeObjectURL(result.objectUrl);
          return;
        }
        url = result.objectUrl;
        setObjectUrl(result.objectUrl);
      },
      () => {
        if (!cancelled) setFailed(true);
      }
    );
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [rel, branch]);
  if (failed) return <MissingImage src={src} label={alt} />;
  if (!objectUrl) {
    return (
      <span
        role="status"
        data-preview-original-loading={src}
        className="block border border-[var(--color-line)] px-5 py-10 text-center text-[0.85rem] leading-[1.9] text-[var(--color-muted)]"
      >
        原圖載入中：{src}
      </span>
    );
  }
  return (
    <span className="block">
      <img src={objectUrl} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
      <span
        data-preview-original-badge={src}
        className="mt-2 block border-l-4 border-[var(--color-red)] pl-3 text-[0.78rem] leading-[1.9] text-[var(--color-muted)]"
      >
        未處理原圖預覽：此為分支上的原始檔案，尚未產生響應式衍生檔；合併並建置成功後會改用最佳化圖片。
      </span>
    </span>
  );
}

function PreviewFigure({
  src,
  alt,
  caption,
  width,
  height,
  manifest,
  branch
}: {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  manifest: PreviewManifest | null;
  branch: string;
}) {
  const resolved = previewImageSet(src, manifest);
  const sourceRel = resolved && 'missing' in resolved ? previewSourceRel(src) : null;
  return (
    <figure
      className={`
      my-[3em]
      [&>img]:h-auto
      [&>img]:w-full
      [&>img]:grayscale-[0.4]
      [&>img]:contrast-[1.06]
      [&>img]:brightness-[0.9]
      [&>figcaption]:mt-[0.8rem]
      [&>figcaption]:text-right
      [&>figcaption]:text-[0.68rem]
      [&>figcaption]:tracking-[0.1em]
      [&>figcaption]:text-[var(--color-muted)]
    `}
    >
      {resolved && 'missing' in resolved ? (
        sourceRel ? (
          <PreviewOriginalImage rel={sourceRel} branch={branch} src={src} alt={alt} width={width} height={height} />
        ) : (
          <MissingImage src={src} label={alt} />
        )
      ) : resolved ? (
        <PreviewPicture set={resolved.set} alt={alt} width={width} height={height} />
      ) : (
        <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
      )}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

function PreviewCover({ src, alt, branch, manifest }: { src: string; alt: string; branch: string; manifest: PreviewManifest | null }) {
  // Same fallback contract as the figure branch: generated srcset first,
  // then the versioned original on the same branch, never silent.
  const resolved = previewImageSet(src, manifest);
  if (resolved && 'missing' in resolved) {
    const sourceRel = previewSourceRel(src);
    if (!sourceRel) return <MissingImage src={src} label={alt} />;
    return <PreviewOriginalImage rel={sourceRel} branch={branch} src={src} alt={alt} />;
  }
  if (resolved) return <PreviewPicture set={resolved.set} alt={alt} />;
  return <img src={src} alt={alt} loading="eager" decoding="async" />;
}

export default function PreviewRenderer({ slug, branch, parsed }: PreviewRendererProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [Content, setContent] = useState<React.ComponentType<any> | null>(null);
  const [manifest, setManifest] = useState<PreviewManifest | null>(null);
  const [manifestReady, setManifestReady] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setCompileError(null);
    compilePreviewBody(parsed.body).then(
      (module) => {
        if (!cancelled) setContent(() => module.default);
      },
      () => {
        if (!cancelled) setCompileError('文章內文編譯失敗，可能是 MDX 語法或元件用法錯誤；正式建置同樣會失敗。');
      }
    );
    loadPreviewManifest().then((loaded) => {
      if (cancelled) return;
      setManifest(loaded);
      setManifestReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [parsed]);

  const { data, warnings } = parsed;
  const readingMinutes = previewReadingMinutes(parsed.body);

  return (
    <article data-preview-article={slug} data-preview-branch={branch}>
      {warnings.length > 0 ? (
        <div role="note" aria-label="frontmatter 檢查" className="mx-auto max-w-[760px] px-8 max-[767px]:px-[1.2rem]">
          <div className="border border-[var(--color-line)] border-l-[6px] border-l-[var(--color-red)] p-[1.4rem]">
            <p className="mb-[0.7rem] text-[0.64rem] uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Frontmatter 注意（正式建置會失敗）
            </p>
            <ul className="pl-6 text-[0.9rem] leading-[1.9]">
              {warnings.map((warning) => (
                <li key={warning} className="mb-[0.55em] marker:text-[var(--color-red)]">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <header
        className={`
        grid
        grid-cols-12
        [padding:clamp(8.5rem,16vh,12rem)_var(--page-pad)_3.5rem]
        max-[767px]:block
        max-[767px]:[padding-top:7.5rem]
        max-[767px]:[padding-bottom:2.5rem]
      `}
      >
        <div
          className={`
          col-[1/13]
          flex
          justify-between
          border-y
          border-[var(--color-line)]
          py-[0.85rem]
          text-[0.64rem]
          uppercase
          tracking-[0.14em]
          text-[var(--color-muted)]
          max-[767px]:text-[0.55rem]
        `}
        >
          <Link href="/tutorial">Journal / 文章索引</Link>
          <span>
            Preview／{branch}／{slug}
          </span>
        </div>
        <div
          className={`
          col-[1/9]
          min-h-[47vh]
          border-r
          border-[var(--color-line)]
          p-[2rem_2rem_1rem_0]
          max-[980px]:col-[1/8]
          max-[767px]:min-h-0
          max-[767px]:border-r-0
          max-[767px]:border-b
          max-[767px]:p-[1.5rem_0_3rem]
        `}
        >
          <span
            className={`
            inline-block
            border
            border-[var(--color-line)]
            px-3
            py-[0.45rem]
            text-[0.64rem]
            uppercase
            tracking-[0.14em]
            text-[var(--color-muted)]
          `}
          >
            {data.category}
            {data.draft ? ' / DRAFT' : ''}
            {' / PREVIEW'}
          </span>
          <h1
            className={`
            mt-[clamp(3rem,8vh,7rem)]
            max-w-[12em]
            text-[clamp(2.8rem,6vw,6.5rem)]
            font-semibold
            leading-[1.12]
            tracking-[-0.06em]
            max-[767px]:mt-[3.5rem]
            max-[767px]:text-[clamp(2.6rem,12vw,4.3rem)]
          `}
          >
            {data.title}
          </h1>
        </div>
        <div
          className={`
          col-[9/13]
          flex
          flex-col
          justify-end
          p-[2rem_0_1rem_1.5rem]
          max-[980px]:col-[8/13]
          max-[767px]:p-[1.5rem_0_0]
        `}
        >
          <p
            className={`
            text-[clamp(0.95rem,1.3vw,1.12rem)]
            leading-[1.85]
            text-[rgba(10,10,10,0.78)]
          `}
          >
            {data.description}
          </p>
          <div
            className={`
            mt-10
            grid
            gap-[0.55rem]
            border-t
            border-[var(--color-line)]
            pt-4
            text-[0.64rem]
            uppercase
            tracking-[0.14em]
            text-[var(--color-muted)]
            max-[767px]:grid-cols-2
          `}
          >
            <span>{formatDate(data.date)}</span>
            <span>{readingMinutes} MIN READ</span>
            <span>{data.author}</span>
          </div>
        </div>
      </header>

      {data.cover ? (
        <div
          className={`
          relative
          mx-[var(--page-pad)]
          overflow-hidden
        `}
        >
          <PreviewCover src={data.cover} alt={data.coverAlt ?? data.title} branch={branch} manifest={manifest} />
        </div>
      ) : null}

      <div
        data-preview-body
        className={`
        mx-auto
        max-w-[760px]
        border-x
        border-[var(--color-line-soft)]
        px-8
        py-24
        text-[1.04rem]
        leading-[2]
        text-[rgba(10,10,10,0.88)]
        [&>*:first-child]:mt-0
        [&_h2]:relative
        [&_h2]:my-[3em]
        [&_h2]:border-t
        [&_h2]:border-[var(--color-line)]
        [&_h2]:pt-4
        [&_h2]:text-[clamp(1.65rem,3vw,2.4rem)]
        [&_h2]:font-semibold
        [&_h2]:leading-[1.45]
        [&_h2]:scroll-mt-[calc(var(--header-height)+2rem)]
        [&_h2]:before:absolute
        [&_h2]:before:left-0
        [&_h2]:before:top-[-1px]
        [&_h2]:before:h-1
        [&_h2]:before:w-16
        [&_h2]:before:bg-[var(--color-red)]
        [&_h3]:my-[2.5em]
        [&_h3]:text-[1.35rem]
        [&_h3]:font-semibold
        [&_h3]:leading-[1.45]
        [&_h4]:font-semibold
        [&_h4]:leading-[1.45]
        [&_h2_a]:text-inherit
        [&_h3_a]:text-inherit
        [&_p]:mb-[1.6em]
        [&_a]:border-b
        [&_a]:border-[rgba(10,10,10,0.48)]
        [&_a]:transition-[color,border-color]
        [&_a]:duration-[var(--transition-fast)]
        [&_a:hover]:border-white
        [&_a:hover]:text-white
        [&_strong]:font-semibold
        [&_strong]:text-[var(--color-text)]
        [&_ul]:mb-[1.6em]
        [&_ul]:pl-6
        [&_ol]:mb-[1.6em]
        [&_ol]:pl-6
        [&_li]:mb-[0.55em]
        [&_li]:marker:text-[var(--color-red)]
        [&_blockquote]:my-[2.3em]
        [&_blockquote]:border-l-[5px]
        [&_blockquote]:border-[var(--color-blue)]
        [&_blockquote]:bg-[rgba(16,43,78,0.22)]
        [&_blockquote]:p-[1.2rem_1.4rem]
        [&_blockquote]:text-[rgba(10,10,10,0.72)]
        [&_code]:bg-[rgba(10,10,10,0.09)]
        [&_code]:px-[0.4em]
        [&_code]:py-[0.15em]
        [&_code]:font-mono
        [&_code]:text-[0.84em]
        [&_pre]:mb-[1.8em]
        [&_pre]:overflow-x-auto
        [&_pre]:border
        [&_pre]:border-[var(--color-line)]
        [&_pre]:bg-[#0e0e0e]
        [&_pre]:p-[1.2rem_1.4rem]
        [&_pre_code]:bg-transparent
        [&_pre_code]:p-0
        [&_pre_code]:text-[0.82rem]
        [&_pre_code]:leading-[1.7]
        [&_hr]:my-[3.2em]
        [&_hr]:border-0
        [&_hr]:border-t
        [&_hr]:border-[var(--color-line)]
        [&_table]:mb-[1.8em]
        [&_table]:w-full
        [&_table]:border-collapse
        [&_table]:text-[0.92rem]
        [&_th]:border
        [&_th]:border-[var(--color-line)]
        [&_th]:p-[0.65em_0.9em]
        [&_th]:text-left
        [&_th]:text-[0.7rem]
        [&_th]:font-normal
        [&_th]:uppercase
        [&_th]:tracking-[0.12em]
        [&_th]:text-[var(--color-muted)]
        [&_td]:border
        [&_td]:border-[var(--color-line)]
        [&_td]:p-[0.65em_0.9em]
        [&_td]:text-left
        [&_.article-figure]:my-[3em]
        [&_.article-model]:my-[3em]
        max-[767px]:border-0
        max-[767px]:px-[1.2rem]
        max-[767px]:py-16
        max-[767px]:text-base
        max-[767px]:[&_.article-figure]:mx-[-1.2rem]
        max-[767px]:[&_.article-model]:mx-[-1.2rem]
      `}
      >
        {compileError ? (
          <p role="alert">{compileError}</p>
        ) : Content && manifestReady ? (
          <Content
            components={{
              a: MDXLink,
              // Client-safe Figure twin: same classes, manifest via fetch.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              Figure: (props: any) => <PreviewFigure {...props} manifest={manifest} branch={branch} />,
              Callout,
              Model3D
            }}
          />
        ) : (
          <p role="status">內文編譯中……</p>
        )}
      </div>

      <footer
        className={`
        mx-auto
        max-w-[760px]
        px-8
        pb-32
        max-[767px]:px-[var(--page-pad)]
        max-[767px]:pb-20
      `}
      >
        <p
          className={`
          border-t
          border-[var(--color-line)]
          pt-6
          text-[0.78rem]
          leading-[1.9]
          tracking-[0.04em]
          text-[var(--color-muted)]
        `}
        >
          本文以創用 CC 姓名標示-相同方式分享 4.0 授權釋出，歡迎分享與改作，需標示出處並以相同授權釋出。
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hant"
            target="_blank"
            rel="noopener noreferrer"
            className={`
              ml-2
              underline
              underline-offset-4
            `}
          >
            授權全文
          </a>
          <Link
            href="/licensing"
            className={`
            ml-4
            underline
            underline-offset-4
          `}
          >
            全站授權方式
          </Link>
        </p>
        <p className="mt-6 text-[0.78rem] leading-[1.9] tracking-[0.04em] text-[var(--color-muted)]">
          預覽來源：{branch} 分支 slug「{slug}」的已提交內容；未儲存的打字內容不會顯示。本頁不列入索引與導覽。
        </p>
        <nav aria-label="站內導覽" className="mt-6">
          <Link href="/tutorial" className="underline underline-offset-4">
            返回文章索引
          </Link>
        </nav>
      </footer>
    </article>
  );
}
