import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import SiteNav from '@/components/SiteNav';
import { SITE_NAME, SITE_URL, JsonLd, organizationJsonLd, websiteJsonLd } from '@/lib/seo';

import './globals.css';

export const viewport: Viewport = {
  themeColor: '#090909',
  viewportFit: 'cover'
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '竹科實中攝影社 NEPC',
    template: '%s — 竹科實中攝影社 NEPC'
  },
  description: '竹科實中攝影社 NEPC 官方網站 — 分享攝影知識，不論程度都能一起探索攝影的樂趣',
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'zh_TW'
  },
  twitter: {
    card: 'summary_large_image'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Noto Serif TC 與思源宋體共用字形來源，unicode-range 會按頁面文字分片下載。 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <div className="grain-overlay" aria-hidden="true" />
        <SiteNav />
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
      </body>
    </html>
  );
}
