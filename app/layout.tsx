import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import SiteNav from '@/components/SiteNav';
import { SITE_NAME, SITE_URL, JsonLd, organizationJsonLd, websiteJsonLd } from '@/lib/seo';

import './globals.css';
import './styles/about.css';

export const viewport: Viewport = {
  themeColor: '#090909',
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
        <div
          className={`
            pointer-events-none
            fixed
            inset-0
            z-999
            bg-[url("data:image/svg+xml,%3Csvg_viewBox='0_0_512_512'_xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter_id='g'%3E%3CfeTurbulence_type='fractalNoise'_baseFrequency='.72'_numOctaves='4'_stitchTiles='stitch'/%3E%3C/filter%3E%3Crect_width='100%25'_height='100%25'_filter='url(%23g)'/%3E%3C/svg%3E")]
            bg-size-[420px_420px]
            bg-repeat
            opacity-[0.045]
            mix-blend-multiply
          `}
          aria-hidden="true"
        />
        <SiteNav />
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
      </body>
    </html>
  );
}
