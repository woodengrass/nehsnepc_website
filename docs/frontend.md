# Frontend Architecture

Implementation source of truth is the code at `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/admin/page.tsx`, `components/SiteNav.tsx`, `components/SiteNavMenu.tsx`, `components/siteNavPages.ts`, `components/home/Hero.tsx`, `lib/seo.tsx`, `app/opengraph-image.tsx`, and `lib/og.tsx`. Route responsibilities, token values, breakpoints, nav focus handling, admin gateway blocks, hero composition details, and image width tables live there and are not repeated here. This document records only decisions, external contracts, history, and the checks a maintainer cannot derive from code.

## Decisions

The shared shell stays server-rendered with one client island (`SiteNavMenu`). Page-specific client code stays out of `app/layout.tsx` so heavy runtimes (Three.js, GSAP, model-viewer) never enter every route. That isolation is load-bearing for performance and must be preserved.

The visual direction is Commercial Swiss plus editorial photography and restrained motion: structural grids, oversized type, deliberate whitespace, asymmetric composition, hard borders, large color fields. Red marks selected structural moments and is not distributed uniformly. Animation must communicate structure or atmosphere, and every major animation considers `prefers-reduced-motion`.

The project uses native `<picture>` and `<img>` rather than `next/image` in most places, so the application owns `srcset`, `sizes`, loading priority, decoding, and crop behavior. Generated AVIF/WebP variants are committed outputs of `npm run images:build`; the normal build does not regenerate them.

Body classes own global scroll lock (`menu-open`, `has-modal`, `is-focus-locked`). Every client component that sets one must remove it during cleanup, including failed initialization and React Strict Mode remounts.

The body order wraps route content and navigation in neutral `.site-chrome` wrappers so admin surfaces can suppress site chrome with pure CSS and no layout JavaScript.

## External Contracts

Noto Serif TC loads at runtime through a Google Fonts stylesheet. It is a third-party request: if blocked, typography falls back. The Open Graph image renderer embeds no CJK fonts, so the generated image stays Latin-only by design.

## History

The layout expresses intended Cormorant Garamond and Raleway layers through font variables the current layout does not define, so browser fallbacks apply. Keep that distinction until the implementation changes.

The visible navigation is the fixed hamburger menu at all widths; desktop navigation markup exists but stays hidden. The home page carries no GSAP or browser runtime; film frame visibility is decided by CSS media queries before first paint.

## Runbook

When changing photography: preserve the authored crop and role, add sources under `assets/sources/` (About satellites: `assets/satellites/`), update `scripts/optimize_images.js` if a new family is needed, run `npm run images:build`, and verify variants, `sizes`, loading priority, alt text, and layout stability.

Frontend changes require manual review on desktop and a 320px-class mobile width, with keyboard-only navigation, visible focus, touch scrolling without hover dependence, reduced-motion behavior, and slow-connection loading. Navigation changes additionally require focus return, background-link exclusion while open, child-route highlighting, back/forward cleanup, and Strict Mode remount checks. Shared-layout changes must prove no heavy runtime entered the common bundle.

## Change Rule

Update this document only for decision-affecting changes: layout ownership, visual direction, font loading mechanism, shared accessibility baseline, image conventions, or scroll-lock ownership. Token values, breakpoint numbers, markup details, or hero composition tweaks need no doc update.
