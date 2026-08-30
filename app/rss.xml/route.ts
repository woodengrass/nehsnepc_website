import { getAllArticles, getCategory } from '@/lib/content';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-static';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const articles = getAllArticles(false);
  const items = articles
    .map((article) => {
      const categoryLabel = getCategory(article.category)?.label ?? article.category;
      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${SITE_URL}/tutorial/${article.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/tutorial/${article.slug}</guid>
      <description>${escapeXml(article.description)}</description>
      <category>${escapeXml(categoryLabel)}</category>
      <pubDate>${new Date(`${article.date}T00:00:00Z`).toUTCString()}</pubDate>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>NEHS Photography Club — Tutorial</title>
    <link>${SITE_URL}/tutorial</link>
    <description>NEHS 攝影社文章 — 攝影教學、社團動態與 3D 展示。</description>
    <language>zh-TW</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' }
  });
}
