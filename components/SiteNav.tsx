'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const PAGES = [
  ['/', 'Home', '首頁'],
  ['/about', 'About', '關於'],
  ['/tutorial', 'Tutorial', '教學'],
  ['/tools', 'Tools', '工具'],
  ['/contact', 'Contact', '聯絡']
] as const;

const OPEN_MENU_LINK_CLASSES = [
  `
    flex
    translate-y-0
    flex-col
    gap-[0.3rem]
    text-5xl
    font-bold
    tracking-[-0.02em]
    opacity-100
    transition-[opacity,transform]
    duration-400
    ease-in-out
    delay-100
    motion-reduce:transition-none
  `,
  `
    flex
    translate-y-0
    flex-col
    gap-[0.3rem]
    text-5xl
    font-bold
    tracking-[-0.02em]
    opacity-100
    transition-[opacity,transform]
    duration-400
    ease-in-out
    delay-150
    motion-reduce:transition-none
  `,
  `
    flex
    translate-y-0
    flex-col
    gap-[0.3rem]
    text-5xl
    font-bold
    tracking-[-0.02em]
    opacity-100
    transition-[opacity,transform]
    duration-400
    ease-in-out
    delay-200
    motion-reduce:transition-none
  `,
  `
    flex
    translate-y-0
    flex-col
    gap-[0.3rem]
    text-5xl
    font-bold
    tracking-[-0.02em]
    opacity-100
    transition-[opacity,transform]
    duration-400
    ease-in-out
    delay-250
    motion-reduce:transition-none
  `,
  `
    flex
    translate-y-0
    flex-col
    gap-[0.3rem]
    text-5xl
    font-bold
    tracking-[-0.02em]
    opacity-100
    transition-[opacity,transform]
    duration-400
    ease-in-out
    delay-300
    motion-reduce:transition-none
  `
] as const;

const CLOSED_MENU_LINK_CLASSES = [
  `
    flex
    translate-y-5
    flex-col
    gap-[0.3rem]
    text-5xl
    font-bold
    tracking-[-0.02em]
    opacity-0
    transition-[opacity,transform]
    duration-400
    ease-in-out
    delay-100
    motion-reduce:transition-none
  `,
  `
    flex
    translate-y-5
    flex-col
    gap-[0.3rem]
    text-5xl
    font-bold
    tracking-[-0.02em]
    opacity-0
    transition-[opacity,transform]
    duration-400
    ease-in-out
    delay-150
    motion-reduce:transition-none
  `,
  `
    flex
    translate-y-5
    flex-col
    gap-[0.3rem]
    text-5xl
    font-bold
    tracking-[-0.02em]
    opacity-0
    transition-[opacity,transform]
    duration-400
    ease-in-out
    delay-200
    motion-reduce:transition-none
  `,
  `
    flex
    translate-y-5
    flex-col
    gap-[0.3rem]
    text-5xl
    font-bold
    tracking-[-0.02em]
    opacity-0
    transition-[opacity,transform]
    duration-400
    ease-in-out
    delay-250
    motion-reduce:transition-none
  `,
  `
    flex
    translate-y-5
    flex-col
    gap-[0.3rem]
    text-5xl
    font-bold
    tracking-[-0.02em]
    opacity-0
    transition-[opacity,transform]
    duration-400
    ease-in-out
    delay-300
    motion-reduce:transition-none
  `
] as const;

export default function SiteNav() {
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
              aria-current={isActive(href) ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
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
                className={menuOpen ? OPEN_MENU_LINK_CLASSES[index] : CLOSED_MENU_LINK_CLASSES[index]}
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
