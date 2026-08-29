import type { Metadata } from 'next';
import Link from 'next/link';

import { CATEGORIES, getAllArticles } from '@/lib/content';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Articles',
  description: 'NEHS 攝影社文章 — 攝影教學、社團動態與 3D 展示。'
};

export default function ArticlesPage() {
  const articles = getAllArticles();

  return (
    <main className="articles-main">
      <header className="articles-header">
        <p className="article-eyebrow">NEHS NEPC / JOURNAL</p>
        <h1>Articles</h1>
        <p>讓攝影不再有門檻——教學、動態與 3D 展示，從看懂照片開始。</p>
      </header>

      <nav className="category-filter" aria-label="文章分類">
        <Link href="/articles" className="category-chip active">ALL</Link>
        {CATEGORIES.map((category) => (
          <Link
            key={category.id}
            href={`/articles/category/${category.id}`}
            className="category-chip"
          >
            {category.label}
          </Link>
        ))}
      </nav>

      {articles.length === 0 ? (
        <p className="category-empty">第一篇文章正在準備中。</p>
      ) : (
        <div className="articles-grid">
          {articles.map((article) => (
            <article key={article.slug} className="article-card">
              <Link href={`/articles/${article.slug}`} className="article-card-cover">
                {article.cover ? (
                  <img src={article.cover} alt={article.coverAlt ?? ''} loading="lazy" decoding="async" />
                ) : (
                  <span className="article-card-cover-empty" aria-hidden="true">NEPC</span>
                )}
              </Link>
              <p className="article-card-category">
                {CATEGORIES.find((category) => category.id === article.category)?.label}
                {article.draft ? ' / DRAFT' : ''}
              </p>
              <h2><Link href={`/articles/${article.slug}`} className="article-card-title-link"><span className="article-card-title">{article.title}</span></Link></h2>
              <p className="article-card-date">
                {formatDate(article.date)} / {article.readingMinutes} MIN
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
