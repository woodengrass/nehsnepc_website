import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initHomePage() {
  const hero = document.querySelector('.hero');
  const background = document.querySelector('.hero-bg');
  const navigation = document.querySelectorAll('.hero-nav-link');

  if (!hero || !background || !navigation.length) return;

  const media = gsap.matchMedia();

  media.add('(prefers-reduced-motion: no-preference)', () => {
    const intro = gsap.timeline({ defaults: { ease: 'power2.out' } });

    intro
      .fromTo('.hero-content', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 1.6 })
      .to('.hero-divider', { scaleX: 1, duration: 0.8 }, '-=0.45')
      .to('.hero-chevron', { autoAlpha: 0.45, duration: 0.45 }, '-=0.2');

    gsap.to(background, {
      autoAlpha: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: '50vh top',
        scrub: true
      }
    });

    gsap.to(navigation, {
      autoAlpha: 0.75,
      y: 0,
      duration: 0.5,
      stagger: 0.12,
      scrollTrigger: {
        trigger: document.body,
        start: '40vh top',
        toggleActions: 'play none none none'
      },
      onComplete: () => navigation.forEach((link) => link.classList.add('visible'))
    });

    gsap.to('.hero-chevron', {
      autoAlpha: 0.75,
      y: 6,
      duration: 1.4,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 1.8
    });
  });

  media.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set([background, '.hero-content', '.hero-divider', '.hero-chevron', navigation], {
      autoAlpha: 1,
      y: 0,
      scaleX: 1
    });
    navigation.forEach((link) => link.classList.add('visible'));
  });
}
