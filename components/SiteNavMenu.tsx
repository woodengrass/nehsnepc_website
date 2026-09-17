'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { SITE_NAV_PAGES as PAGES } from './siteNavPages';

// 十組近乎相同的選單連結字串合併為單一基底 + 行內 transition-delay，
// 視覺時序與原本 delay-100…delay-300 完全一致。
const MENU_LINK_BASE_CLASSES = `
  flex
  flex-col
  gap-[0.3rem]
  text-5xl
  font-bold
  tracking-[-0.02em]
  transition-[opacity,transform]
  duration-400
  ease-in-out
  motion-reduce:transition-none
`;

export default function SiteNavMenu() {
  const pathname = usePathname();
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen);
    return () => document.body.classList.remove('menu-open');
  }, [menuOpen]);

  const toggleMenu = () => setMenuOpen((open) => !open);
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <button
        ref={hamburgerRef}
        className={menuOpen ? `
          fixed
          top-8
          right-8
          z-200
          flex
          h-6
          w-8
          cursor-pointer
          flex-col
          gap-[0.4rem]
          border-0
          bg-transparent
          p-0
          mix-blend-normal
        ` : `
          fixed
          top-8
          right-8
          z-200
          flex
          h-6
          w-8
          cursor-pointer
          flex-col
          gap-[0.4rem]
          border-0
          bg-transparent
          p-0
          mix-blend-difference
        `}
        type="button"
        aria-label={menuOpen ? '關閉選單' : '開啟選單'}
        aria-expanded={menuOpen}
        onClick={toggleMenu}
      >
        <span className={menuOpen ? `
          h-0.5
          w-full
          translate-y-[0.6rem]
          rotate-45
          bg-[var(--color-text)]
          transition-all
          duration-300
          ease-in-out
          motion-reduce:transition-none
        ` : `
          h-0.5
          w-full
          bg-white
          transition-all
          duration-300
          ease-in-out
          motion-reduce:transition-none
        `} />
        <span className={menuOpen ? `
          h-0.5
          w-full
          bg-[var(--color-text)]
          opacity-0
          transition-all
          duration-300
          ease-in-out
          motion-reduce:transition-none
        ` : `
          h-0.5
          w-full
          bg-white
          transition-all
          duration-300
          ease-in-out
          motion-reduce:transition-none
        `} />
        <span className={menuOpen ? `
          h-0.5
          w-full
          -translate-y-[0.6rem]
          -rotate-45
          bg-[var(--color-text)]
          transition-all
          duration-300
          ease-in-out
          motion-reduce:transition-none
        ` : `
          h-0.5
          w-full
          bg-white
          transition-all
          duration-300
          ease-in-out
          motion-reduce:transition-none
        `} />
      </button>

      <div
        className={menuOpen ? `
          visible
          fixed
          inset-0
          z-150
          flex
          items-center
          justify-center
          bg-[var(--color-bg)]
          opacity-100
          transition-[opacity,visibility]
          duration-400
          ease-in-out
          motion-reduce:transition-none
        ` : `
          invisible
          fixed
          inset-0
          z-150
          flex
          items-center
          justify-center
          bg-[var(--color-bg)]
          opacity-0
          transition-[opacity,visibility]
          duration-400
          ease-in-out
          motion-reduce:transition-none
        `}
        aria-hidden={!menuOpen}
      >
        <nav className={`
          flex
          flex-col
          gap-8
        `} aria-label="Mobile navigation">
          {PAGES.map(([href, label], index) => {
            const active = isActive(href);

            return (
              <Link
                key={href}
                href={href}
                className={`${MENU_LINK_BASE_CLASSES} ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}
                style={{ transitionDelay: `${100 + index * 50}ms` }}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                <span className={active ? `
                  text-[var(--color-red)]
                ` : `
                  text-[var(--color-text)]
                `}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
