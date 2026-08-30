import type { ArticleMeta } from './content';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nehsnepc.com';

export const SITE_NAME = 'NEHS Photography Club';

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_URL).toString();
}

type JsonLdObject = Record<string, unknown>;

export function organizationJsonLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    alternateName: 'NEHS 攝影社',
    url: SITE_URL,
    logo: absoluteUrl('/images/generated/logo-384.webp'),
    sameAs: ['https://instagram.com/nehs_nepc']
  };
}

export function websiteJsonLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'zh-TW'
  };
}

export function articleJsonLd(article: ArticleMeta & { description: string }): JsonLdObject {
  const category = article.category;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    inLanguage: 'zh-TW',
    datePublished: article.date,
    dateModified: article.updated ?? article.date,
    author: { '@type': 'Organization', name: article.author },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/images/generated/logo-384.webp') }
    },
    mainEntityOfPage: absoluteUrl(`/tutorial/${article.slug}`),
    articleSection: category,
    keywords: article.tags.join(', '),
    image: article.cover ? absoluteUrl(article.cover) : undefined
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export function JsonLd({ data }: { data: JsonLdObject }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
