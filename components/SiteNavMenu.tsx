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
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousPathnameRef = useRef(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname;
      setMenuOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen);
    return () => document.body.classList.remove('menu-open');
  }, [menuOpen]);

  useEffect(() => {
    const hamburger = hamburgerRef.current;
    const menu = menuRef.current;
    const panel = panelRef.current;
    if (!menuOpen || !hamburger || !menu || !panel) return;

    const links = Array.from(panel.querySelectorAll<HTMLAnchorElement>('a[href]'));
    const focusable = [hamburger, ...links];
    const background = new Map<HTMLElement, boolean>();
    // Inert sibling branches up to body, never the dialog or its trigger.
    for (let branch: HTMLElement | null = menu; branch && branch !== document.body; branch = branch.parentElement) {
      for (const sibling of branch.parentElement?.children ?? []) {
        if (sibling instanceof HTMLElement && sibling !== branch) {
          background.set(sibling, sibling.inert);
          sibling.inert = true;
        }
      }
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
      }
      if (event.key !== 'Tab') return;
      event.preventDefault();
      const index = focusable.findIndex((element) => element === document.activeElement);
      const nextIndex = event.shiftKey
        ? (index <= 0 ? focusable.length - 1 : index - 1)
        : (index + 1) % focusable.length;
      focusable[nextIndex]?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', handleKeydown);
    (links[0] ?? hamburger).focus({ preventScroll: true });

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      for (const [element, inert] of background) element.inert = inert;
      hamburger.focus({ preventScroll: true });
    };
  }, [menuOpen]);

  const toggleMenu = () => setMenuOpen((open) => !open);
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div
      ref={menuRef}
      {...(menuOpen ? {
        role: 'dialog',
        'aria-modal': true,
        'aria-label': '網站導覽'
      } as const : {})}
    >
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
        aria-haspopup="dialog"
        aria-controls="site-nav-menu"
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
        ref={panelRef}
        id="site-nav-menu"
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
        inert={!menuOpen}
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
                // 預取 /about 會連帶 preload 該路由專屬的 about.css，讓每一頁都多下載一份用不到的樣式。
                prefetch={href === '/about' ? false : undefined}
                className={`${MENU_LINK_BASE_CLASSES} ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}
                style={{ transitionDelay: `${100 + index * 50}ms` }}
                aria-current={active ? 'page' : undefined}
                tabIndex={menuOpen ? undefined : -1}
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
    </div>
  );
}
