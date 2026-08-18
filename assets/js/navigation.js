const pages = [
  ['index', 'Home'],
  ['about', 'About'],
  ['portfolio', 'Portfolio'],
  ['contact', 'Contact']
];

const currentPage = document.body.className.match(/page-([\w-]+)/)?.[1] || 'index';
const prefix = document.body.classList.contains('page-index') ? '' : '../';
const logoAvifSrcset = [96, 192, 384]
  .map((width) => `${new URL(`../images/generated/logo-${width}.avif`, import.meta.url).href} ${width}w`)
  .join(', ');
const logoWebpSrcset = [96, 192, 384]
  .map((width) => `${new URL(`../images/generated/logo-${width}.webp`, import.meta.url).href} ${width}w`)
  .join(', ');
const logoFallback = new URL('../images/generated/logo-192.webp', import.meta.url).href;
const hrefFor = (page) => {
  if (page === 'index') return `${prefix}index.html`;
  return prefix ? `${page}.html` : `pages/${page}.html`;
};

function navigationLinks(className) {
  return pages.map(([page, label]) => (
    `<a href="${hrefFor(page)}" class="${className}${page === currentPage ? ' active' : ''}">${label}</a>`
  )).join('');
}

function logoPicture(className, alt) {
  return `<picture>
    <source type="image/avif" srcset="${logoAvifSrcset}" sizes="(max-width: 767px) 80px, 52px">
    <source type="image/webp" srcset="${logoWebpSrcset}" sizes="(max-width: 767px) 80px, 52px">
    <img src="${logoFallback}" alt="${alt}" class="${className}">
  </picture>`;
}

class SiteNavigation extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <aside class="sidebar" aria-label="Site navigation sidebar">
        <div class="sidebar-edge" aria-hidden="true"></div>
        <div class="sidebar-panel">
          <div class="sidebar-header">
            ${logoPicture('sidebar-logo', 'NEHS Photography Club logo')}
            <p class="sidebar-brand">NEHS Photo Club</p>
          </div>
          <nav class="sidebar-nav" aria-label="Sidebar navigation">${navigationLinks('sidebar-link')}</nav>
          <p class="sidebar-copy">&copy; ${new Date().getFullYear()} NEHS Photography Club</p>
        </div>
      </aside>
      <button class="hamburger" type="button" aria-label="Open navigation menu" aria-expanded="false">
        <span class="hamburger-line"></span><span class="hamburger-line"></span><span class="hamburger-line"></span>
      </button>
      <div class="mobile-menu" aria-hidden="true">
        <button class="mobile-close" type="button" aria-label="Close navigation menu">&times;</button>
        <a href="${hrefFor('index')}" class="mobile-menu-logo-link">${logoPicture('mobile-menu-logo', 'NEHS Photography Club')}</a>
        <nav class="mobile-nav" aria-label="Mobile navigation">${navigationLinks('mobile-nav-link')}</nav>
      </div>`;

    const panel = this.querySelector('.sidebar-panel');
    const hamburger = this.querySelector('.hamburger');
    const menu = this.querySelector('.mobile-menu');
    const closeButton = this.querySelector('.mobile-close');
    let closeTimer = null;

    const closeSidebar = () => {
      panel.classList.remove('open');
      closeTimer = null;
    };
    const scheduleClose = () => {
      if (closeTimer) return;
      closeTimer = window.setTimeout(closeSidebar, 550);
    };
    document.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      if (event.clientX <= 56) {
        clearTimeout(closeTimer);
        closeTimer = null;
        panel.classList.add('open');
      } else if (!panel.matches(':hover')) scheduleClose();
    });
    panel.addEventListener('pointerenter', () => {
      clearTimeout(closeTimer);
      closeTimer = null;
    });
    panel.addEventListener('pointerleave', scheduleClose);

    const setMenu = (isOpen) => {
      menu.classList.toggle('open', isOpen);
      menu.setAttribute('aria-hidden', String(!isOpen));
      hamburger.classList.toggle('active', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('menu-open', isOpen);
      if (isOpen) closeButton.focus();
    };
    hamburger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
    closeButton.addEventListener('click', () => setMenu(false));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });
  }
}

customElements.define('site-navigation', SiteNavigation);
