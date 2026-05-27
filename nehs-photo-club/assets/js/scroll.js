(function () {
  'use strict';

  var heroBg  = document.getElementById('heroBg');
  var heroNav = document.getElementById('heroNav');
  if (!heroBg || !heroNav) return;

  var navLinks = heroNav.querySelectorAll('.hero-nav-link');
  var revealed = false; /* one-way flag — never resets */

  function onScroll() {
    var scrollY = window.scrollY || window.pageYOffset || 0;
    var vh      = window.innerHeight;

    /* Background: fades in over first 50vh of scroll, stays once reached */
    var bgOpacity = Math.min(1, scrollY / (vh * 0.5));
    heroBg.style.opacity = bgOpacity;

    /* Nav: appears after 40vh scroll, never hides again */
    if (!revealed && scrollY > vh * 0.4) {
      revealed = true;
      navLinks.forEach(function (link) {
        link.classList.add('visible');
      });
    }
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        onScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  onScroll();

  /* Generic reveal for future pages */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { obs.observe(el); });
  }

}());