/**
 * sidebar.js
 * Handles:
 *   - Right sidebar proximity detection (opens when mouse is within 80px of right edge)
 *   - Slide-in / slide-out with 600ms close delay
 *   - Active link highlighting based on current page URL
 *   - Copyright year injection
 *   - Mobile hamburger menu open / close
 */

(function () {
  'use strict';

  var EDGE_THRESHOLD = 80;   // px from right edge that triggers sidebar open
  var CLOSE_DELAY    = 600;  // ms before sidebar closes after mouse leaves

  var panel      = document.getElementById('sidebarPanel');
  var hamburger  = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobileMenu');
  var mobileClose = document.getElementById('mobileClose');

  /* ——— Sidebar open / close ——— */

  var closeTimer = null;

  function openSidebar() {
    clearTimeout(closeTimer);
    if (panel) panel.classList.add('open');
  }

  function scheduleSidebarClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      if (panel) panel.classList.remove('open');
    }, CLOSE_DELAY);
  }

  /* Mouse proximity: open when within EDGE_THRESHOLD of the right edge */
  document.addEventListener('mousemove', function (e) {
    if (!panel) return;
    var distFromRight = window.innerWidth - e.clientX;

    if (distFromRight <= EDGE_THRESHOLD) {
      openSidebar();
    } else if (!panel.contains(e.target)) {
      /* Mouse left the proximity zone and is not hovering the panel */
      scheduleSidebarClose();
    }
  });

  /* Keep open while mouse is inside the panel, restart timer on leave */
  if (panel) {
    panel.addEventListener('mouseenter', function () {
      clearTimeout(closeTimer);
    });

    panel.addEventListener('mouseleave', function () {
      scheduleSidebarClose();
    });
  }

  /* ——— Active page detection ——— */

  var path = window.location.pathname.toLowerCase();
  var activePage = 'index';

  if (path.indexOf('about')     !== -1) activePage = 'about';
  else if (path.indexOf('portfolio') !== -1) activePage = 'portfolio';
  else if (path.indexOf('contact')   !== -1) activePage = 'contact';

  document.querySelectorAll('.sidebar-link').forEach(function (link) {
    if (link.dataset.page === activePage) {
      link.classList.add('active');
    }
  });

  /* Same active logic for mobile nav links */
  var mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
  mobileNavLinks.forEach(function (link) {
    var href = (link.getAttribute('href') || '').toLowerCase();
    if (
      (activePage === 'index'     && (href === 'index.html' || href === '../index.html' || href.endsWith('/'))) ||
      (activePage === 'about'     && href.indexOf('about')     !== -1) ||
      (activePage === 'portfolio' && href.indexOf('portfolio') !== -1) ||
      (activePage === 'contact'   && href.indexOf('contact')   !== -1)
    ) {
      link.style.opacity = '1';
    }
  });

  /* ——— Copyright year ——— */

  document.querySelectorAll('.year-placeholder').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ——— Mobile hamburger menu ——— */

  function openMobileMenu() {
    if (!mobileMenu || !hamburger) return;
    mobileMenu.classList.add('open');
    hamburger.classList.add('active');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileMenu.setAttribute('aria-hidden', 'false');
  }

  function closeMobileMenu() {
    if (!mobileMenu || !hamburger) return;
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
  }

  if (hamburger) {
    hamburger.addEventListener('click', function () {
      if (mobileMenu && mobileMenu.classList.contains('open')) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  if (mobileClose) {
    mobileClose.addEventListener('click', closeMobileMenu);
  }

  /* Close mobile menu if Escape key pressed */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMobileMenu();
  });

}());
