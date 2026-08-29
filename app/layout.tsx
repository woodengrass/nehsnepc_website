import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Raleway } from 'next/font/google';
import type { ReactNode } from 'react';

import SiteNav from '@/components/SiteNav';
import { SITE_NAME, SITE_URL, JsonLd, organizationJsonLd, websiteJsonLd } from '@/lib/seo';

import './globals.css';
import './styles/main.css';
import './styles/sidebar.css';
import './styles/hero.css';
import './styles/about.css';
import './styles/contact.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-heading-next'
});

const raleway = Raleway({
  subsets: ['latin'],
  weight: ['200', '300', '400'],
  display: 'swap',
  variable: '--font-body-next'
});

export const viewport: Viewport = {
  themeColor: '#000000',
  viewportFit: 'cover'
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'NEHS Photography Club',
    template: '%s — NEHS Photography Club'
  },
  description: 'NEHS 攝影社 — LOOK CLOSER. 讓攝影不再有門檻，從看懂照片開始。',
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
    <html lang="zh-TW" className={`${cormorant.variable} ${raleway.variable}`}>
      <body>
        {children}
        <div className="grain-overlay" aria-hidden="true" />
        <SiteNav />
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Noto Serif TC 保留 CDN unicode-range 分片：瀏覽器只下載頁面實際用到的字元切片 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </body>
    </html>
  );
}
