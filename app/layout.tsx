import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import SiteNav from '@/components/SiteNav';

import './globals.css';
import './styles/main.css';
import './styles/sidebar.css';
import './styles/hero.css';
import './styles/about.css';
import './styles/contact.css';

export const metadata: Metadata = {
  title: {
    default: 'NEHS Photography Club',
    template: '%s — NEHS Photography Club'
  },
  description: 'NEHS 攝影社 — LOOK CLOSER. 讓攝影不再有門檻，從看懂照片開始。'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        {children}
        <div className="grain-overlay" aria-hidden="true" />
        <SiteNav />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Noto+Serif+TC:wght@400;500&family=Raleway:wght@200;300;400&display=swap"
          rel="stylesheet"
        />
      </body>
    </html>
  );
}
