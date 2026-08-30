import type { Metadata } from 'next';
import Link from 'next/link';

import { CATEGORIES, getAllArticles } from '@/lib/content';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Tutorial',
  description: 'NEHS 攝影社教學文章 — 攝影教學、社團動態與 3D 展示。',
  alternates: { canonical: '/tutorial' }
};

export default function TutorialPage() {
  const articles = getAllArticles();

  return (
    <main className={`
      relative
      min-h-screen
      [padding:clamp(8.5rem,16vh,12rem)_var(--page-pad)_8rem]
      max-[767px]:[padding-top:7.5rem]
      max-[767px]:[padding-bottom:5rem]
    `}>
      <span
        aria-hidden="true"
        className={`
          pointer-events-none
          absolute
          right-[var(--page-pad)]
          top-[var(--header-height)]
          text-[rgba(10,10,10,0.035)]
          text-[clamp(11rem,24vw,25rem)]
          font-bold
          leading-[0.9]
          max-[767px]:hidden
        `}
      >
        02
      </span>
      <header className={`
        relative
        grid
        min-h-[43vh]
        grid-cols-12
        border-y
        border-[var(--color-line)]
        max-[767px]:block
        max-[767px]:min-h-0
      `}>
        <div className={`
          col-[1/9]
          flex
          flex-col
          justify-between
          border-r
          border-[var(--color-line)]
          p-[1rem_1rem_1.2rem_0]
          max-[980px]:col-[1/8]
          max-[767px]:min-h-[15rem]
          max-[767px]:border-r-0
          max-[767px]:border-b
          max-[767px]:p-[0.8rem_0_1.2rem]
        `}>
          <p className={`
            text-[0.64rem]
            uppercase
            tracking-[0.14em]
            text-[var(--color-muted)]
          `}>
            NEHS NEPC / JOURNAL
          </p>
          <h1 className={`
            max-w-full
            overflow-wrap-anywhere
            text-[clamp(4rem,9vw,9.5rem)]
            font-semibold
            leading-[0.85]
            tracking-[-0.075em]
            max-[767px]:text-[clamp(3.8rem,21vw,6.2rem)]
          `}>
            Tutorial
          </h1>
        </div>
        <div className={`
          col-[9/13]
          flex
          flex-col
          justify-end
          p-[1.2rem_0_1.2rem_1.4rem]
          max-[980px]:col-[8/13]
          max-[767px]:p-[1.2rem_0]
        `}>
          <span className={`
            mb-auto
            text-[0.64rem]
            uppercase
            tracking-[0.14em]
            text-[var(--color-muted)]
            max-[767px]:mb-[3.5rem]
          `}>
            Reading index / 閱讀索引
          </span>
          <p className={`
            max-w-[28rem]
            text-[clamp(0.95rem,1.3vw,1.12rem)]
            leading-[1.85]
            text-[rgba(10,10,10,0.78)]
          `}>
            讓攝影不再有門檻。教學、動態與 3D 展示，從看懂照片開始。
          </p>
          <strong className={`
            mt-8
            text-[0.64rem]
            font-normal
            uppercase
            tracking-[0.14em]
            text-[var(--color-text)]
            max-[767px]:mt-6
          `}>
            {String(articles.length).padStart(2, '0')} / ARTICLES
          </strong>
        </div>
      </header>

      <nav className={`
        relative
        my-8
        mb-20
        flex
        min-h-14
        items-stretch
        overflow-visible
        border-y
        border-[var(--color-line)]
        max-[767px]:my-[1.4rem]
        max-[767px]:mb-12
        max-[767px]:overflow-x-auto
        max-[767px]:[scrollbar-width:none]
      `} aria-label="文章分類">
        <span className={`
          flex
          min-w-[25%]
          items-center
          border-r
          border-[var(--color-line)]
          px-5
          py-3
          text-[0.64rem]
          uppercase
          tracking-[0.14em]
          text-[var(--color-muted)]
          max-[767px]:hidden
        `}>
          Filter / 分類
        </span>
        <Link href="/tutorial" className={`
          relative
          flex
          min-w-40
          items-center
          justify-center
          border-r
          border-[var(--color-line)]
          px-5
          py-3
          text-[0.64rem]
          uppercase
          tracking-[0.14em]
          text-[var(--color-ink)]
          transition-[color,background]
          duration-[var(--transition-fast)]
          after:absolute
          after:inset-x-0
          after:bottom-0
          after:h-1
          after:bg-[var(--color-red)]
          max-[767px]:min-w-max
          max-[767px]:px-4
          max-[767px]:py-[0.9rem]
        `}>
          ALL
        </Link>
        {CATEGORIES.map((category) => (
          <Link
            key={category.id}
            href={`/tutorial/category/${category.id}`}
            className={`
              flex
              min-w-40
              items-center
              justify-center
              border-r
              border-[var(--color-line)]
              px-5
              py-3
              text-[0.64rem]
              uppercase
              tracking-[0.14em]
              text-[var(--color-muted)]
              transition-[color,background]
              duration-[var(--transition-fast)]
              hover:bg-[var(--color-blue)]
              hover:text-[var(--color-text)]
              max-[767px]:min-w-max
              max-[767px]:px-4
              max-[767px]:py-[0.9rem]
            `}
          >
            {category.label}
          </Link>
        ))}
      </nav>

      {articles.length === 0 ? (
        <p className={`
          py-16
          text-[var(--color-muted)]
        `}>
          第一篇文章正在準備中。
        </p>
      ) : (
        <div className={`
          grid
          grid-cols-3
          border-l
          border-t
          border-[var(--color-line)]
          max-[980px]:grid-cols-2
          max-[767px]:grid-cols-1
        `}>
          {articles.map((article, index) => (
            <article
              key={article.slug}
              className={`
                relative
                min-w-0
                border-b
                border-r
                border-[var(--color-line)]
                ${index === 0
                  ? `
                    col-span-2
                    max-[767px]:col-auto
                  `
                  : ''}
              `}
            >
              <span
                aria-hidden="true"
                className={`
                  absolute
                  right-4
                  top-4
                  z-[3]
                  min-w-[2.3rem]
                  bg-[var(--color-paper)]
                  px-[0.45rem]
                  py-[0.35rem]
                  text-center
                  text-[0.61rem]
                  tracking-[0.1em]
                  text-[var(--color-ink)]
                `}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <Link href={`/tutorial/${article.slug}`} className={`
                relative
                block
                aspect-[4/3]
                overflow-hidden
                bg-[var(--color-surface)]
                ${index === 0
                  ? `
                    aspect-[2/1]
                    max-[767px]:aspect-[4/3]
                  `
                  : ''}
              `}>
                {article.cover ? (
                  <>
                    <img
                      className={`
                        h-[108%]
                        w-[108%]
                        max-w-none
                        -translate-x-[3%]
                        -translate-y-[3%]
                        grayscale-[0.85]
                        contrast-[1.12]
                        brightness-[0.72]
                        transition-[filter,transform]
                        duration-[var(--transition-slow)]
                        hover:translate-y-[-3%]
                        hover:translate-x-0
                        hover:grayscale-[0.08]
                        hover:contrast-[1.06]
                        hover:brightness-[0.88]
                      `}
                      src={article.cover}
                      alt={article.coverAlt ?? ''}
                      loading="lazy"
                      decoding="async"
                    />
                    <span
                      aria-hidden="true"
                      className={`
                        pointer-events-none
                        absolute
                        inset-0
                        bg-[linear-gradient(115deg,rgba(16,43,78,0.58),transparent_42%,rgba(104,19,28,0.32))]
                        mix-blend-multiply
                      `}
                    />
                  </>
                ) : (
                  <span
                    className={`
                      grid
                      h-full
                      w-full
                      place-items-center
                      text-[clamp(2rem,5vw,4rem)]
                      font-bold
                      tracking-[-0.05em]
                      text-[rgba(10,10,10,0.18)]
                    `}
                    aria-hidden="true"
                  >
                    NEPC
                  </span>
                )}
              </Link>
              <div className={`
                relative
                flex
                min-h-56
                flex-col
                overflow-hidden
                p-[1.2rem]
                after:absolute
                after:-bottom-8
                after:-right-8
                after:h-20
                after:w-20
                after:rotate-45
                after:border
                after:border-[var(--color-line)]
                ${index % 3 === 0
                  ? `
                    after:border-0
                    after:bg-[var(--color-red)]
                    after:opacity-[0.45]
                  `
                  : index % 3 === 1
                    ? `
                      after:border-0
                      after:bg-[var(--color-blue)]
                      after:opacity-50
                    `
                    : ''}
                max-[767px]:min-h-48
              `}>
                <p className={`
                  mb-5
                  text-[0.64rem]
                  uppercase
                  tracking-[0.14em]
                  text-[var(--color-muted)]
                `}>
                  {CATEGORIES.find((category) => category.id === article.category)?.label}
                  {article.draft ? ' / DRAFT' : ''}
                </p>
                <h2 className={`
                  max-w-[88%]
                `}>
                  <Link href={`/tutorial/${article.slug}`}>
                    <span className={`
                      text-[clamp(1.25rem,1.75vw,1.65rem)]
                      font-semibold
                      leading-[1.45]
                      transition-opacity
                      duration-[var(--transition-fast)]
                      hover:opacity-[0.66]
                      ${index === 0
                        ? `
                          text-[clamp(1.7rem,2.7vw,2.7rem)]
                          max-[767px]:text-[clamp(1.35rem,7vw,1.8rem)]
                        `
                        : ''}
                    `}>
                      {article.title}
                    </span>
                  </Link>
                </h2>
                <p className={`
                  mt-auto
                  pt-[1.4rem]
                  text-[0.64rem]
                  uppercase
                  tracking-[0.14em]
                  text-[rgba(10,10,10,0.5)]
                `}>
                  {formatDate(article.date)} / {article.readingMinutes} MIN
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
