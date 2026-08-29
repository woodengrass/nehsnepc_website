'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const backgroundRef = useRef<HTMLPictureElement>(null);
  const navigationRef = useRef<HTMLAnchorElement[]>([]);

  useEffect(() => {
    const background = backgroundRef.current;
    const navigation = navigationRef.current.filter(Boolean);
    if (!background || !navigation.length) return;

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

    return () => media.revert();
  }, []);

  return (
    <section className="hero" id="hero" aria-label="Hero">
      <picture className="hero-bg" ref={backgroundRef}>
        <source
          type="image/avif"
          srcSet="/images/generated/hero-640.avif 640w, /images/generated/hero-1280.avif 1280w, /images/generated/hero-1920.avif 1920w, /images/generated/hero-2560.avif 2560w"
          sizes="100vw"
        />
        <source
          type="image/webp"
          srcSet="/images/generated/hero-640.webp 640w, /images/generated/hero-1280.webp 1280w, /images/generated/hero-1920.webp 1920w, /images/generated/hero-2560.webp 2560w"
          sizes="100vw"
        />
        <img src="/images/generated/hero-1280.webp" alt="Photography club hero image" />
      </picture>

      <div className="hero-overlay" aria-hidden="true" />

      <div className="hero-content">
        <h1 className="hero-title">
          <span className="hero-title-line1">NEHS</span>
          <span className="hero-title-line2">Photography Club</span>
        </h1>

        <div className="hero-divider" aria-hidden="true" />

        <div className="hero-chevron" aria-label="Scroll down">
          <svg width="22" height="13" viewBox="0 0 22 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
              d="M1 1L11 11L21 1"
              stroke="white"
              strokeWidth="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <nav className="hero-nav" aria-label="Main navigation">
        {([
          ['/', 'Home', 0],
          ['/about', 'About', 1],
          ['/portfolio', 'Portfolio', 2],
          ['/contact', 'Contact', 3]
        ] as const).map(([href, label, index]) => (
          <Link
            key={href}
            href={href}
            className="hero-nav-link"
            data-index={index}
            ref={(node) => {
              if (node) navigationRef.current[index] = node;
            }}
          >
            {label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
