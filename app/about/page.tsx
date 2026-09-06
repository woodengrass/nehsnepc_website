import type { Metadata } from 'next';
import Link from 'next/link';

import AboutExperience from '@/components/about/AboutExperience';
import { ABOUT_EXIT_CONTENT, ABOUT_FOCUS_CONTENT, ABOUT_PHOTOS, ABOUT_STATIONS } from '@/lib/about_content';

export const metadata: Metadata = {
  title: 'About',
  description: 'NEHS 攝影社 — 讓攝影不再有門檻，從看懂照片開始，慢慢拍出自己的想法。',
  alternates: { canonical: '/about' }
};

const HERO_SRCSET_AVIF = '/images/generated/hero-640.avif 640w, /images/generated/hero-1280.avif 1280w, /images/generated/hero-1920.avif 1920w, /images/generated/hero-2560.avif 2560w';
const HERO_SRCSET_WEBP = '/images/generated/hero-640.webp 640w, /images/generated/hero-1280.webp 1280w, /images/generated/hero-1920.webp 1920w, /images/generated/hero-2560.webp 2560w';

export default function AboutPage() {
  return (
    <main className="obscura">
      <section className="obscura-camera" aria-label="NEHS Photography Club camera obscura">
        <div className="obscura-image-wrap" aria-hidden="true">
          <picture className="obscura-picture">
            <source type="image/avif" srcSet={HERO_SRCSET_AVIF} sizes="100vw" />
            <source type="image/webp" srcSet={HERO_SRCSET_WEBP} sizes="100vw" />
            <img className="obscura-image" src="/images/generated/hero-1280.webp" alt="" fetchPriority="high" />
          </picture>
          <div className="obscura-image-wash" />
          <div className="obscura-vignette" />
        </div>

        <canvas className="obscura-archive-canvas" id="archiveCanvas" aria-hidden="true" />

        <div className="obscura-hud" aria-hidden="true">
          <span className="obscura-coordinate obscura-coordinate-top">35.0123 N / 121.5429 E</span>
          <span className="obscura-reading" aria-live="polite"><b id="focusReading"></b></span>
          <div className="focusing-screen" aria-hidden="true">
            <canvas className="microprism-canvas" id="microprismCanvas" />
            <div className="split-focus">
              <div className="split-focus-half split-focus-top">
                <picture>
                  <source type="image/avif" srcSet={HERO_SRCSET_AVIF} sizes="100vw" />
                  <source type="image/webp" srcSet={HERO_SRCSET_WEBP} sizes="100vw" />
                  <img src={ABOUT_PHOTOS.focus} alt="" />
                </picture>
              </div>
              <div className="split-focus-half split-focus-bottom">
                <picture>
                  <source type="image/avif" srcSet={HERO_SRCSET_AVIF} sizes="100vw" />
                  <source type="image/webp" srcSet={HERO_SRCSET_WEBP} sizes="100vw" />
                  <img src={ABOUT_PHOTOS.focus} alt="" />
                </picture>
              </div>
              <span className="split-focus-line" />
            </div>
          </div>
        </div>

        <div className="obscura-intro">
          <p className="obscura-eyebrow">{ABOUT_FOCUS_CONTENT.eyebrow}</p>
          <h1>{ABOUT_FOCUS_CONTENT.title}</h1>
          <p className="obscura-prompt" id="focusGuide">{ABOUT_FOCUS_CONTENT.prompt}</p>
        </div>

        <div className="obscura-mobile-entry" aria-hidden="true">
          <p>{ABOUT_FOCUS_CONTENT.eyebrow}</p>
          <h1>{ABOUT_FOCUS_CONTENT.title}</h1>
          <div className="obscura-mobile-entry-footer">
            <span>SET 2.0m</span>
            <span>{ABOUT_FOCUS_CONTENT.prompt}</span>
          </div>
        </div>

        <div className="obscura-flash" aria-hidden="true" />
      </section>

      <section className="obscura-story" id="story" aria-label="About NEHS Photography Club">
        <article className="obscura-panel obscura-panel-manifesto" data-word="OBSERVE">
          <p className="obscura-index">{ABOUT_STATIONS[0].eyebrow}</p>
          <h2>{ABOUT_STATIONS[0].heading}</h2>
          <p>{ABOUT_STATIONS[0].body}</p>
        </article>

        <article className="obscura-panel obscura-panel-practice" data-word="FRAME">
          <p className="obscura-index">{ABOUT_STATIONS[1].eyebrow}</p>
          <h2>{ABOUT_STATIONS[1].heading}</h2>
          <p>{ABOUT_STATIONS[1].body}</p>
        </article>
      </section>

      <section className="obscura-exit" aria-label="About NEHS Photography Club conclusion">
        <div className="obscura-exit-stage">
          <section className="obscura-afterword" aria-labelledby="afterwordTitle">
            <div className="obscura-afterword-rail" aria-hidden="true">
              <span>NEHS</span>
              <span>HSINCHU / EST. 2016</span>
            </div>
            <div className="obscura-afterword-frame" aria-hidden="true">
              <div className="obscura-afterword-photo-wrap">
                <img className="obscura-afterword-photo" src={ABOUT_PHOTOS.final} alt="" loading="lazy" />
              </div>
              <p><span>ARCHIVE IMAGE / 03</span><span>JOIN THE CLUB</span></p>
            </div>
            <div className="obscura-afterword-copy">
              <p className="obscura-afterword-index">{ABOUT_EXIT_CONTENT.index}</p>
              <h2 id="afterwordTitle">
                {ABOUT_EXIT_CONTENT.title[0]}
                <br />
                {ABOUT_EXIT_CONTENT.title[1]}
              </h2>
              <p>{ABOUT_EXIT_CONTENT.body}</p>
              <div className="obscura-afterword-guide">
                <span>Next step / 下一步</span>
                <span>追蹤社群或先從攝影工具開始</span>
              </div>
              <div className="obscura-afterword-actions">
                {ABOUT_EXIT_CONTENT.actions.map((action) =>
                  action.external ? (
                    <a key={action.label} href={action.href} target="_blank" rel="noopener">
                      {action.label} <span aria-hidden="true">&rarr;</span>
                    </a>
                  ) : (
                    <Link key={action.label} href={action.href}>
                      {action.label} <span aria-hidden="true">&rarr;</span>
                    </Link>
                  )
                )}
              </div>
            </div>
            <div className="obscura-afterword-block obscura-afterword-block-red" aria-hidden="true" />
            <div className="obscura-afterword-block obscura-afterword-block-blue" aria-hidden="true" />
          </section>
        </div>
      </section>

      <AboutExperience />
    </main>
  );
}
