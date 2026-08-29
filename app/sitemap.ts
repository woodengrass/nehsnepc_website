import type { MetadataRoute } from 'next';

import { CATEGORIES, getAllArticles } from '@/lib/content';
import { SITE_URL } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticles(false);
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/articles`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/portfolio`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.5 }
  ];

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map((category) => ({
    url: `${SITE_URL}/articles/category/${category.id}`,
    changeFrequency: 'weekly',
    priority: 0.6
  }));

  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/articles/${article.slug}`,
    lastModified: article.updated ?? article.date,
    changeFrequency: 'monthly',
    priority: 0.7
  }));

  return [...staticRoutes, ...categoryRoutes, ...articleRoutes];
}
