# Frontend Architecture

## Scope

This document covers the shared application shell, home page, visual language, styling, navigation, responsive conventions, accessibility baseline, photography handling, motion ownership, and SEO elements common to the frontend. Feature-specific behavior is documented separately in the other files in `docs/`.

## Route and Component Map

| Path | Responsibility |
| --- | --- |
| `app/layout.tsx` | Root document, default metadata, viewport, global navigation, grain layer, Google font link, and site JSON-LD |
| `app/page.tsx` | Home route metadata and `Hero` composition |
| `components/home/Hero.tsx` | Server-rendered home identity and route index; no client state or GSAP |
| `components/SiteNav.tsx` | Shared client navigation, active-route matching, menu state, Escape handling, and body scroll lock |
| `app/globals.css` | Tailwind import, design tokens, reset, base typography, focus styles, hidden global scrollbar, body state classes, and reduced motion |
| `app/styles/about.css` | About-only selectors imported globally by the root layout |
| `lib/seo.tsx` | Canonical site URL and JSON-LD builders |
| `app/opengraph-image.tsx`, `lib/og.tsx` | Global 1200 by 630 Open Graph image |

All App Router files are Server Components by default. `SiteNav` is the only shared client boundary. Keep page-specific client code out of `app/layout.tsx` so heavy dependencies do not enter every route.

## Root Layout

`app/layout.tsx` sets `<html lang="zh-TW">`, `themeColor: #090909`, and `viewportFit: cover`. Default metadata supplies the site title, title template, Traditional Chinese description, Open Graph site identity, and large-image Twitter card. Page routes add their own canonical metadata.

The body order is route content, fixed grain overlay, `SiteNav`, then Organization and WebSite JSON-LD. The grain uses an inline SVG turbulence background on a fixed, pointer-inert, `aria-hidden` layer. It is global and therefore carries a compositing cost on every route.

The layout preconnects to Google Fonts and loads Noto Serif TC from `fonts.googleapis.com`. This is a runtime third-party dependency. The current layout does not configure `next/font` for Cormorant Garamond or Raleway. `app/globals.css` and components still refer to `--font-heading-next` and `--font-body-next`; those variables are not currently defined by the layout, so browser font fallbacks apply. Preserve this distinction in future documentation until the implementation changes.

`app/styles/about.css` is imported by the root layout and downloaded globally. Its selectors are largely constrained by `.obscura`, `html:has(.obscura)`, and About state classes.

## Visual System

The visual direction is Commercial Swiss plus editorial photography and restrained motion. The interface uses structural grids, oversized type, deliberate whitespace, asymmetric composition, hard borders, and large color fields. Avoid generic dashboard patterns, excessive rounded cards, decorative gradients, glass effects, and unmotivated animation.

### Color tokens

`app/globals.css` defines both Tailwind theme values and runtime custom properties. The principal runtime palette is:

| Token | Value | Role |
| --- | --- | --- |
| `--color-bg`, `--color-paper` | `#f8f7f4` | Main off-white ground |
| `--color-surface` | `#ffffff` | Light content surface |
| `--color-text`, `--color-ink` | `#0a0a0a` | Primary ink |
| `--color-red` | `#c41e2a` | Deliberate accent and anchor |
| `--color-blue` | `#1e4d7a` | Structural blue |
| `--color-muted` | `rgba(10, 10, 10, 0.58)` | Secondary text |
| `--color-line` | `rgba(10, 10, 10, 0.18)` | Strong rules |
| `--color-line-soft` | `rgba(10, 10, 10, 0.08)` | Quiet grid lines |

The home content index uses the darker local navy `#101d2b`. Red is not intended to be distributed uniformly; it marks selected structural moments.

### Layout and motion tokens

- `--page-pad: clamp(1.25rem, 4vw, 4.5rem)`; mobile changes to `1.2rem`.
- `--header-height: 72px`; mobile changes to `58px`.
- `--transition-fast: 260ms cubic-bezier(0.22, 1, 0.36, 1)`.
- `--transition-slow: 700ms cubic-bezier(0.22, 1, 0.36, 1)`.

The main responsive breakpoints are `980px` for intermediate grid changes and `767px` for independently composed mobile layouts. Components use Tailwind arbitrary variants and conventional media queries. `100svh` is preferred where browser chrome affects viewport height.

### Typography

The global body uses the CJK serif stack based on Noto Serif TC, Source Han Serif, and Songti fallbacks. CSS expresses an intended Cormorant Garamond heading and Raleway body layer through unresolved `--font-heading-next` and `--font-body-next` variables. When changing fonts, update the layout loading mechanism, root variables, all direct component references, and this document together. Test tight CJK line heights on mobile because font substitution can clip oversized headings.

## Shared Navigation

`components/SiteNav.tsx` defines five destinations in the `PAGES` constant: Home, About, Tutorial, Tools, and Contact. Non-home active matching includes child routes, so `/tutorial/...` activates Tutorial and `/tools/exposure-calculator` activates Tools.

The current visible control is the fixed hamburger menu at all widths. Desktop navigation markup and establishment copy exist but carry `hidden` classes. Opening the menu toggles `body.menu-open`, and global CSS locks scrolling. Escape and selecting a link close the menu. The trigger uses a native button with a Chinese `aria-label` and `aria-expanded`; active links use `aria-current="page"`.

Known limitations:

- no focus transfer into the opened panel;
- no focus trap or `inert` state;
- no explicit focus restoration on close;
- closed links remain mounted and are hidden visually/with `aria-hidden`, not conditionally removed from tab order;
- an unused `hamburgerRef` remains in the component.

Any navigation change must test keyboard order, Escape, focus visibility, route-active behavior, scroll restoration, mobile safe areas, and reduced motion.

## Home Page

`app/page.tsx` is a small Server Component with canonical `/`. `components/home/Hero.tsx` is also server-rendered and imports only `next/link`; the current home page has no GSAP or browser runtime. Film frame visibility is handled by CSS media queries before first paint, so the Hero does not need a client boundary for responsive frame selection.

The first section is an identity composition with a minimum height of `max(760px, 100svh)` on desktop and `max(720px, 100svh)` on mobile. The visual center is deliberately weighted to the left: the `NEHS / NEPC` identity sits directly on the paper ground with a red registration edge and a narrow offset red bar, while the vertical film strip enters from the right as a partial obstruction. The title uses black and deep-navy type contrast instead of a pale backing panel. Technical information is limited to coordinates, frame notation, film stock, and frame numbers. One frame has a small local offset and shadow to suggest a pasted contact sheet; other elements remain aligned so the imperfection stays controlled. Decorative elements are `aria-hidden` where appropriate.

The film strip contains twelve available crops of the same generated hero image through native `<picture>` elements. AVIF variants are selected at 640 and 1280 widths, with a 1280 WebP `<img>` fallback. Different `object-position` values create a panoramic sequence. Frame visibility is decided entirely by CSS media queries before the first paint: viewports at or below `740px` height show two frames, phone-width viewports above that height show three, medium-height screens show six, tall screens show eight, and larger screens retain all twelve. Height is therefore the primary density signal, while phone width provides a cap; no client-side measurement or post-render frame-count calculation is used. These images are decorative and have empty alt text. CSS aspect ratios reserve space, but the elements do not supply intrinsic width/height attributes.

The `Explore index` anchor scrolls to `#home-index` and is positioned at the lower-left edge of the hero so it reinforces the left-side visual center. The second section uses a dark navy field and four large route rows. Desktop rows contain number, English title, Chinese description, and arrow; mobile hides the description column. Hover changes the entire row to red, while native links preserve essential functionality for touch and keyboard users.

## Image Conventions

Photography is content unless explicitly decorative. Meaningful images require accurate alternative text. Repeated texture, grain, mood imagery, and duplicated crops may use `alt=""` and `aria-hidden` containers when surrounding text already communicates the content.

The project intentionally uses native `<picture>` and `<img>` rather than `next/image` in most places. The application therefore owns `srcset`, `sizes`, intrinsic dimensions, lazy/eager loading, decoding, and crop behavior. Generated AVIF/WebP variants live in `public/images/generated/` and are created by `npm run images:build`; the normal build does not regenerate them.

When changing photography:

1. Preserve the authored crop and image role.
2. Add or update source assets under `public/images/`.
3. Update `scripts/optimize_images.js` if a new generated family is needed.
4. Run `npm run images:build`.
5. Verify AVIF and WebP paths, desktop/mobile `sizes`, loading priority, alt text, and layout stability.

## Accessibility and Motion Baseline

Global `:focus-visible` applies a two-pixel ink outline with four-pixel offset. Native smooth scrolling is enabled by default. Under `prefers-reduced-motion: reduce`, global CSS disables smooth scrolling and reduces animation/transition duration to `0.01ms`; JavaScript motion must still implement its own media-query behavior.

Body classes own global scroll lock:

- `menu-open` from `SiteNav`;
- `has-modal` from Contact;
- `is-focus-locked` from About.

Every client component that sets one must remove it during cleanup, including failed initialization and React Strict Mode remounts.

Required review for frontend changes:

- keyboard-only navigation and visible focus;
- 320px-class mobile width and desktop layout;
- touch scrolling without reliance on hover;
- reduced-motion behavior;
- semantic heading order and image alternatives;
- loading and layout stability on slow connections;
- no import of Three.js, GSAP, model-viewer, or feature engines into shared layout code.

## SEO Surfaces

`lib/seo.tsx` derives the public origin from `NEXT_PUBLIC_SITE_URL`, falling back to `https://nehsnepc.com`. The root emits Organization and WebSite JSON-LD. `app/opengraph-image.tsx` and `lib/og.tsx` generate a Latin-only branded PNG because CJK fonts are not embedded in the image renderer. Route and content-specific SEO behavior is detailed in `posts.md` and `technical-stack.md`.

## Change Checklist

- Update this file when routes, root metadata, navigation, design tokens, fonts, shared accessibility, breakpoints, home composition, or image conventions change.
- Keep shared heavy dependencies code-split and outside `app/layout.tsx`.
- Check global CSS state classes against all owning components.
- Preserve canonical metadata for public pages.
- Run `npm run build`.
- Manually test home and navigation on mobile and desktop, with keyboard and reduced motion.
