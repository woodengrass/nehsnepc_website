import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';

import { mdxComponents } from '@/components/mdx';
import { getAdjacentArticles, getAllArticles, getArticle, getCategory } from '@/lib/content';
import { formatDate } from '@/lib/format';

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
    authors: [{ name: article.author }]
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const category = getCategory(article.category);
  const { newer, older } = getAdjacentArticles(slug);

  return (
    <main className="article-main">
      <header className="article-hero">
        <Link href={`/articles/category/${article.category}`} className="article-eyebrow">
          {category?.label}
          {article.draft ? ' / DRAFT' : ''}
        </Link>
        <h1>{article.title}</h1>
        <div className="article-meta">
          <span>{formatDate(article.date)}</span>
          <span>{article.readingMinutes} MIN READ</span>
          <span>{article.author}</span>
        </div>
      </header>

      {article.cover ? (
        <div className="article-cover">
          <img src={article.cover} alt={article.coverAlt ?? article.title} />
        </div>
      ) : null}

      <div className="article-body">
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

      <footer className="article-footer">
        <nav className="article-nav" aria-label="文章導覽">
          {older ? (
            <div className="article-nav-card">
              <p className="article-nav-label">← OLDER</p>
              <Link href={`/articles/${older.slug}`}>
                <span className="article-nav-title">{older.title}</span>
              </Link>
            </div>
          ) : (
            <div className="article-nav-card" />
          )}
          {newer ? (
            <div className="article-nav-card next">
              <p className="article-nav-label">NEWER →</p>
              <Link href={`/articles/${newer.slug}`}>
                <span className="article-nav-title">{newer.title}</span>
              </Link>
            </div>
          ) : (
            <div className="article-nav-card next" />
          )}
        </nav>
      </footer>
    </main>
  );
}
