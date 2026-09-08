import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

import { mdxComponents } from '@/components/mdx';
import ReadingProgress from '@/components/articles/ReadingProgress';
import { getAdjacentArticles, getAllArticles, getArticle, getCategory } from '@/lib/content';
import { formatDate } from '@/lib/format';
import { JsonLd, articleJsonLd, breadcrumbJsonLd } from '@/lib/seo';

export function generateStaticParams() {
  // 構建期只展開正式文章；草稿由 getArticle 在開發環境動態提供。
  return getAllArticles(false).map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    authors: [{ name: article.author }],
    keywords: article.tags,
    alternates: {
      canonical: `/tutorial/${article.slug}`
    },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.description,
      url: `/tutorial/${article.slug}`,
      publishedTime: article.date,
      modifiedTime: article.updated ?? article.date,
      authors: [article.author],
      tags: article.tags,
      images: article.cover ? [{ url: article.cover, alt: article.coverAlt ?? article.title }] : undefined
    }
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const category = getCategory(article.category);
  const { newer, older } = getAdjacentArticles(slug);

  return (
    <main className={`
      min-h-screen
      bg-[var(--color-bg)]
    `}>
      <ReadingProgress />
      <JsonLd data={articleJsonLd(article)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Tutorial', path: '/tutorial' },
          { name: article.title, path: `/tutorial/${article.slug}` }
        ])}
      />
      <header className={`
        grid
        grid-cols-12
        [padding:clamp(8.5rem,16vh,12rem)_var(--page-pad)_3.5rem]
        max-[767px]:block
        max-[767px]:[padding-top:7.5rem]
        max-[767px]:[padding-bottom:2.5rem]
      `}>
        <div className={`
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
        `}>
          <Link href="/tutorial">Journal / 文章索引</Link>
          <span>Scroll to read / 向下閱讀</span>
        </div>
        <div className={`
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
        `}>
          <Link href={`/tutorial/category/${article.category}`} className={`
            inline-block
            border
            border-[var(--color-line)]
            px-3
            py-[0.45rem]
            text-[0.64rem]
            uppercase
            tracking-[0.14em]
            text-[var(--color-muted)]
          `}>
            {category?.label}
            {article.draft ? ' / DRAFT' : ''}
          </Link>
          <h1 className={`
            mt-[clamp(3rem,8vh,7rem)]
            max-w-[12em]
            text-[clamp(2.8rem,6vw,6.5rem)]
            font-semibold
            leading-[1.12]
            tracking-[-0.06em]
            max-[767px]:mt-[3.5rem]
            max-[767px]:text-[clamp(2.6rem,12vw,4.3rem)]
          `}>
            {article.title}
          </h1>
        </div>
        <div className={`
          col-[9/13]
          flex
          flex-col
          justify-end
          p-[2rem_0_1rem_1.5rem]
          max-[980px]:col-[8/13]
          max-[767px]:p-[1.5rem_0_0]
        `}>
          <p className={`
            text-[clamp(0.95rem,1.3vw,1.12rem)]
            leading-[1.85]
            text-[rgba(10,10,10,0.78)]
          `}>
            {article.description}
          </p>
          <div className={`
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
          `}>
            <span>{formatDate(article.date)}</span>
            <span>{article.readingMinutes} MIN READ</span>
            <span>{article.author}</span>
          </div>
        </div>
      </header>

      {article.cover ? (
        <div className={`
          relative
          mx-[var(--page-pad)]
          overflow-hidden
          before:absolute
          before:bottom-0
          before:left-[33.333%]
          before:top-0
          before:z-[2]
          before:w-px
          before:bg-[rgba(240,238,232,0.35)]
          after:absolute
          after:bottom-0
          after:left-[66.666%]
          after:top-0
          after:z-[2]
          after:w-px
          after:bg-[rgba(240,238,232,0.35)]
        `}>
          <img
            className={`
              aspect-[16/8]
              w-full
              grayscale-[0.6]
              contrast-[1.12]
              brightness-[0.8]
              max-[767px]:aspect-[4/3]
            `}
            src={article.cover}
            alt={article.coverAlt ?? article.title}
          />
        </div>
      ) : null}

      <div className={`
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
      `}>
        <MDXRemote
          source={article.content}
          components={mdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]]
            }
          }}
        />
      </div>

      <footer className={`
        mx-auto
        max-w-[760px]
        px-8
        pb-32
        max-[767px]:px-[var(--page-pad)]
        max-[767px]:pb-20
      `}>
        <nav
          className={`
            grid
            grid-cols-2
            border-l
            border-t
            border-[var(--color-line)]
            max-[767px]:grid-cols-1
          `}
          aria-label="文章導覽"
        >
          {older ? (
            <div className={`
              min-h-40
              min-w-0
              border-b
              border-r
              border-[var(--color-line)]
              p-[1.2rem]
            `}>
              <p className={`
                mb-5
                text-[0.64rem]
                uppercase
                tracking-[0.14em]
                text-[var(--color-muted)]
              `}>
                ← OLDER
              </p>
              <Link href={`/tutorial/${older.slug}`}>
                <span className={`
                  text-[1.05rem]
                  leading-[1.6]
                  transition-opacity
                  duration-[var(--transition-fast)]
                  hover:opacity-[0.58]
                `}>
                  {older.title}
                </span>
              </Link>
            </div>
          ) : (
            <div className={`
              min-h-40
              min-w-0
              border-b
              border-r
              border-[var(--color-line)]
              p-[1.2rem]
            `} />
          )}
          {newer ? (
            <div className={`
              min-h-40
              min-w-0
              border-b
              border-r
              border-[var(--color-line)]
              p-[1.2rem]
              text-right
              max-[767px]:text-left
            `}>
              <p className={`
                mb-5
                text-[0.64rem]
                uppercase
                tracking-[0.14em]
                text-[var(--color-muted)]
              `}>
                NEWER →
              </p>
              <Link href={`/tutorial/${newer.slug}`}>
                <span className={`
                  text-[1.05rem]
                  leading-[1.6]
                  transition-opacity
                  duration-[var(--transition-fast)]
                  hover:opacity-[0.58]
                `}>
                  {newer.title}
                </span>
              </Link>
            </div>
          ) : (
            <div className={`
              min-h-40
              min-w-0
              border-b
              border-r
              border-[var(--color-line)]
              p-[1.2rem]
              text-right
              max-[767px]:text-left
            `} />
          )}
        </nav>
        <p className={`
          mt-8
          border-t
          border-[var(--color-line)]
          pt-6
          text-[0.78rem]
          leading-[1.9]
          tracking-[0.04em]
          text-[var(--color-muted)]
        `}>
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
          <Link href="/licensing" className={`
            ml-4
            underline
            underline-offset-4
          `}>
            全站授權方式
          </Link>
        </p>
      </footer>
    </main>
  );
}
