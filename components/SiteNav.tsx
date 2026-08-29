'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const PAGES = [
  ['/', 'Home'],
  ['/about', 'About'],
  ['/portfolio', 'Portfolio'],
  ['/contact', 'Contact']
] as const;

const LOGO_WIDTHS = [96, 192, 384];

function logoSrcSet(extension: 'avif' | 'webp') {
  return LOGO_WIDTHS.map((width) => `/images/generated/logo-${width}.${extension} ${width}w`).join(', ');
}

export default function SiteNav() {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const clearCloseTimer = () => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
    };
    const closeSidebar = () => {
      panel.classList.remove('open');
      closeTimer.current = null;
    };
    const scheduleClose = () => {
      if (closeTimer.current !== null) return;
      closeTimer.current = window.setTimeout(closeSidebar, 550);
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      if (event.clientX <= 56) {
        clearCloseTimer();
        panel.classList.add('open');
      } else if (!panel.matches(':hover')) {
        scheduleClose();
      }
    };
    const handlePanelEnter = () => clearCloseTimer();
    const handlePanelLeave = () => scheduleClose();

    document.addEventListener('pointermove', handlePointerMove);
    panel.addEventListener('pointerenter', handlePanelEnter);
    panel.addEventListener('pointerleave', handlePanelLeave);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      panel.removeEventListener('pointerenter', handlePanelEnter);
      panel.removeEventListener('pointerleave', handlePanelLeave);
      clearCloseTimer();
    };
  }, []);

  useEffect(() => {
    const hamburger = hamburgerRef.current;
    const closeButton = closeButtonRef.current;
    if (!hamburger || !closeButton) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen);
    if (menuOpen) closeButtonRef.current?.focus();
  }, [menuOpen]);

  const toggleMenu = () => setMenuOpen((open) => !open);

  const renderLinks = (className: string) =>
    PAGES.map(([href, label]) => (
      <Link
        key={href}
        href={href}
        className={`${className}${pathname === href ? ' active' : ''}`}
        onClick={() => setMenuOpen(false)}
      >
        {label}
      </Link>
    ));

  const renderLogoPicture = (className: string, alt: string) => (
    <picture>
      <source
        type="image/avif"
        srcSet={logoSrcSet('avif')}
        sizes="(max-width: 767px) 80px, 52px"
      />
      <source
        type="image/webp"
        srcSet={logoSrcSet('webp')}
        sizes="(max-width: 767px) 80px, 52px"
      />
      <img src="/images/generated/logo-192.webp" alt={alt} className={className} />
    </picture>
  );

  return (
    <>
      <aside className="sidebar" aria-label="Site navigation sidebar">
        <div className="sidebar-edge" aria-hidden="true" />
        <div className="sidebar-panel" ref={panelRef}>
          <div className="sidebar-header">
            {renderLogoPicture('sidebar-logo', 'NEHS Photography Club logo')}
            <p className="sidebar-brand">NEHS Photo Club</p>
          </div>
          <nav className="sidebar-nav" aria-label="Sidebar navigation">
            {renderLinks('sidebar-link')}
          </nav>
          <p className="sidebar-copy">&copy; {new Date().getFullYear()} NEHS Photography Club</p>
        </div>
      </aside>

      <button
        ref={hamburgerRef}
        className={`hamburger${menuOpen ? ' active' : ''}`}
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={menuOpen}
        onClick={toggleMenu}
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      <div className={`mobile-menu${menuOpen ? ' open' : ''}`} aria-hidden={!menuOpen}>
        <button
          ref={closeButtonRef}
          className="mobile-close"
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
        >
          &times;
        </button>
        <Link href="/" className="mobile-menu-logo-link" onClick={() => setMenuOpen(false)}>
          {renderLogoPicture('mobile-menu-logo', 'NEHS Photography Club')}
        </Link>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {renderLinks('mobile-nav-link')}
        </nav>
      </div>
    </>
  );
}
