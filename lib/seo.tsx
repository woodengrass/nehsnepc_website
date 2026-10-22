import type { ArticleMeta } from './content';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nehsnepc.com';

export const SITE_NAME = '竹科實中攝影社 NEPC';

export const DEFAULT_OG_IMAGE_ALT = 'NEHS Photography Club — NEPC';

// Next 只做淺層合併：頁面一旦自訂 openGraph 就會整組覆蓋 layout 的設定，
// 也會失去根目錄 opengraph-image 檔案產生的預設分享圖，所以頁面要從這裡展開補齊。
export const BASE_OPEN_GRAPH = {
  siteName: SITE_NAME,
  locale: 'zh_TW'
} as const;

export const DEFAULT_OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: DEFAULT_OG_IMAGE_ALT
} as const;

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_URL).toString();
}

type JsonLdObject = Record<string, unknown>;

export function organizationJsonLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    alternateName: 'NEHS Photography Club',
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
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
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
