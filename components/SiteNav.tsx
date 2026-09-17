import Link from 'next/link';

import SiteNavMenu from './SiteNavMenu';

// 靜態 header 殼：內容皆為 display:none 的佔位結構，不需要 JS。
// 作用中的開合選單與路由高亮由 <SiteNavMenu /> client island 負責。
import { SITE_NAV_PAGES as PAGES } from './siteNavPages';

export default function SiteNav() {
  return (
    <>
      <header className={`
        fixed
        top-8
        left-8
        z-100
        text-[0.9rem]
        font-semibold
        tracking-[-0.01em]
      `} role="banner">
        <nav className={`
          hidden
        `} aria-label="Primary navigation">
          {PAGES.map(([href, label, localizedLabel], index) => (
            <Link
              key={href}
              href={href}
              className={`
                hidden
              `}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span>{label}</span>
              <span>{localizedLabel}</span>
            </Link>
          ))}
        </nav>
        <span className={`
          hidden
        `}>
          EST. 2016 / HSINCHU
        </span>
      </header>

      <SiteNavMenu />
    </>
  );
}
