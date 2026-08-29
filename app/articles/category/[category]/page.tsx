import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CATEGORIES, getCategory, getArticlesByCategory, isCategoryId } from '@/lib/content';
import { formatDate } from '@/lib/format';

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  if (!isCategoryId(category)) return {};
  const categoryInfo = getCategory(category);
  return {
    title: categoryInfo?.label ?? 'Articles',
    description: categoryInfo?.description
  };
}

export default async function ArticleCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isCategoryId(category)) notFound();
  const categoryInfo = getCategory(category);
  const articles = getArticlesByCategory(category);

  return (
    <main className="articles-main">
      <header className="articles-header">
        <p className="article-eyebrow">NEHS NEPC / JOURNAL</p>
        <h1>{categoryInfo?.label}</h1>
        <p>{categoryInfo?.description}</p>
      </header>

      <nav className="category-filter" aria-label="文章分類">
        <Link href="/articles" className="category-chip">ALL</Link>
        {CATEGORIES.map((item) => (
          <Link
            key={item.id}
            href={`/articles/category/${item.id}`}
            className={`category-chip${item.id === category ? ' active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {articles.length === 0 ? (
        <p className="category-empty">這個分類的文章正在準備中。</p>
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
                {categoryInfo?.label}
                {article.draft ? ' / DRAFT' : ''}
              </p>
              <h2><Link href={`/articles/${article.slug}`}><span className="article-card-title">{article.title}</span></Link></h2>
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
