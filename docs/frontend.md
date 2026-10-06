# Frontend Architecture

## Scope

This document covers the shared application shell, home page, visual language, styling, navigation, responsive conventions, accessibility baseline, photography handling, motion ownership, and SEO elements common to the frontend. Feature-specific behavior is documented separately in the other files in `docs/`.

## Route and Component Map

| Path | Responsibility |
| --- | --- |
| `app/layout.tsx` | Root document, default metadata, viewport, global navigation, grain layer, Google font link, and site JSON-LD |
| `app/admin/page.tsx` | Noindex Traditional Chinese admin gateway (`data-admin-root`) linking into `/keystatic`; no nav, sitemap, or canonical entry |
| `app/page.tsx` | Home route metadata and `Hero` composition |
| `components/home/Hero.tsx` | Server-rendered home identity and route index; no client state or GSAP |
| `components/SiteNav.tsx` + `components/SiteNavMenu.tsx` | Server header shell with hidden placeholder markup; client menu island (hamburger, modal overlay, focus containment/restoration, inert background, pathname-change cleanup, active-route matching, body scroll lock). Ten near-identical link-delay classes collapsed to one base plus inline `transition-delay` |
| `app/globals.css` | Tailwind import, design tokens, base typography, `.grain-overlay`, focus styles, hidden global scrollbar, body state classes, and reduced motion |
| `app/styles/about.css` | About-only selectors imported by `app/about/layout.tsx`, loaded only on `/about` |
| `lib/seo.tsx` | Canonical site URL and JSON-LD builders |
| `app/opengraph-image.tsx`, `lib/og.tsx` | Global 1200 by 630 Open Graph image |

All App Router files are Server Components by default. The shared shell stays server-rendered; `SiteNavMenu` is the only shared client island. Keep page-specific client code out of `app/layout.tsx` so heavy dependencies do not enter every route.

## Root Layout

`app/layout.tsx` sets `<html lang="zh-TW">`, `themeColor: #090909`, and `viewportFit: cover`. Default metadata supplies the site title, title template, Traditional Chinese description, Open Graph site identity, and large-image Twitter card. Page routes add their own canonical metadata.

The body order is a `.site-chrome` wrapper around route content, the fixed grain overlay, a `.site-chrome-nav` wrapper around `SiteNav`, then Organization and WebSite JSON-LD. The wrappers are neutral on public routes (no visual change) and exist so admin surfaces can suppress site chrome with pure CSS: `body:has([data-admin-root]) .grain-overlay, body:has([data-admin-root]) .site-chrome-nav { display: none; }` in `app/globals.css`. The layout stays a Server Component with no `usePathname` or `headers()` call, preserving prerendering. Never import Keystatic or admin client code into the root layout, and never target Keystatic internal classes. The grain is the `.grain-overlay` CSS class (same inline SVG turbulence, `contain: strict`) on a fixed, pointer-inert, `aria-hidden` layer. It is global and therefore carries a compositing cost on every route.

The layout preconnects to Google Fonts and loads Noto Serif TC from `fonts.googleapis.com`. This is a runtime third-party dependency. The current layout does not configure `next/font` for Cormorant Garamond or Raleway. `app/globals.css` and components still refer to `--font-heading-next` and `--font-body-next`; those variables are not currently defined by the layout, so browser font fallbacks apply. Preserve this distinction in future documentation until the implementation changes.

`app/styles/about.css` is imported by `app/about/layout.tsx` and loads only on `/about`. Its selectors are largely constrained by `.obscura`, `html:has(.obscura)`, and About state classes.

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

`components/SiteNavMenu.tsx` imports five destinations from `components/siteNavPages.ts` as `PAGES`: Home, About, Tutorial, Tools, and Contact. Non-home active matching includes child routes, so `/tutorial/...` activates Tutorial and `/tools/exposure-calculator` activates Tools. Overlay link stagger uses one shared class plus per-index inline `transition-delay` (100ms with 50ms steps), identical to the previous delay utilities.

The current visible control is the fixed hamburger menu at all widths. Desktop navigation markup and establishment copy exist but carry `hidden` classes. Opening the menu toggles `body.menu-open`, and global CSS locks scrolling. The trigger uses a native button with a Chinese `aria-label`, `aria-expanded`, `aria-haspopup="dialog"`, and `aria-controls="site-nav-menu"`; active links use `aria-current="page"`.

Modal behavior stays entirely within the shared client island, with no focus-trap dependency or client code added to the root layout:

- While open, a neutral wrapper containing both the hamburger and overlay has `role="dialog"`, `aria-modal="true"`, and the accessible name `網站導覽`. Opening focuses the first overlay link (Home), without changing the scroll position.
- Tab and Shift+Tab cycle through the five overlay links and the hamburger. In DOM order the cycle is trigger → Home → About → Tutorial → Tools → Contact → trigger; opening starts at Home, so Shift+Tab reaches the close trigger rather than a background link.
- Sibling branches along the dialog's ancestor chain up to `body` become `inert`. This includes route content such as the Licensing link while leaving the dialog and trigger operable. Each sibling's prior inert value is saved and restored, rather than blindly removing inert set by another owner.
- Escape, toggling the trigger, selecting a link, or a `usePathname` pathname change closes the menu. Closing restores focus to the hamburger with `preventScroll`. Cleanup removes the open-menu key listener, restores background inert values, and removes `body.menu-open`, including on unmount and React Strict Mode effect remounts.
- The overlay and links remain mounted for the existing transitions. When closed, the overlay retains `visibility: hidden` and `aria-hidden="true"`, is itself `inert`, and all overlay links have `tabIndex={-1}`; the dialog-only attributes are absent from the wrapper.

Remaining constraints: the desktop placeholder navigation stays hidden, the hamburger retains its fixed `top-8`/`right-8` offsets without explicit safe-area inset padding, and query/hash-only changes do not trigger pathname cleanup. No layout, color, active-route matching, or animation timing changes accompany the modal behavior.

Any navigation change must test keyboard-only opening, first-link focus, repeated Tab/Shift+Tab wrapping (including the trigger), inability to focus background links while open, Escape/trigger/link close and focus return, closed-link exclusion, visible focus, route-active behavior on child routes, pathname changes including back/forward while open, scroll restoration and lock cleanup, mobile safe areas, and reduced motion. Verify that pre-existing background inert states survive cleanup and that Strict Mode remounts do not leak listeners, inert state, or scroll locks.

## Admin Gateway

`app/admin/page.tsx` is a static Server Component marked with `data-admin-root`. It renders H1 教學文章編輯／Admin with a red left rule, a one-paragraph staff-only purpose line (Keystatic entry), then a responsive grid: desktop `lg:` two-column (teaching content `minmax(0,2fr)` left, `nav[aria-label="編輯入口"]` navy `#101d2b` entry panel `minmax(16rem,1fr)` right, `lg:sticky` below `var(--header-height)`); mobile single column in DOM order hero → purpose → entry panel → teaching/rules → footer links. The entry panel holds exactly three entries — `/keystatic` 前往編輯器, `/tutorial` 教學文章頁面, repository-URL GH倉庫 (external) — each title plus arrow only with no description line, `py-5` row rhythm, `min-h-11` touch targets, hairline `white/15` rules, red hover; no `fixed` positioning so it never overlaps the footer. The main column holds a Teaching section (A blocks-not-code concepts for Figure/Callout/Model3D, B slash-menu Figure insert walkthrough with upload/alt/caption/dimensions, C save-to-branch-to-preview-to-merge flow guide with the `preview/<username>` convention plus a one-line `/preview` link carrying the saved-only note), a Workflow section holding the eight numbered guide blocks, a static-links section for the GitHub repository plus Vercel project, footer nav home/tutorial/contact, and no private repository data — it imports no Keystatic code). The eight blocks cover: 01 login, 02 branch selection (`preview/<username>` by convention, e.g. `preview/amy`, selector unenforceable, typo-fix bypass for designated admins on `main`), 03 save-versus-release (typing never autosaves; new entries default to draft; publish after merge to `main` requires `draft: false` plus a green Vercel build), 04 draft publicness, 05 concurrency (later saves win), 06 rollback (Git revert or redeploy a prior Vercel deployment; no status shown here), 07 slug rename (delete-plus-create, old URL 404s, no redirect), 08 pre-publish checks (rebuild, `images:build`, no unlicensed photos). The aside restates the public-draft warning plus the branch and publish rules. The links section holds static outbound links only (repository URL plus `https://vercel.com/dashboard` placeholder with a replace-when-known comment) and states the page never shows commit or deployment status.

Teaching-copy rule: every editor UI reference on `/admin` must exist verbatim in `keystatic.config.ts` field labels or the verified Keystatic 0.6.9 affordances (`Save`, `Choose file`/`Remove`, `Done`, `Edit`, `/` insert menu, block labels `Figure`/`Callout`/`Model3D`). No invented button, menu, or field text. `/preview` internals are out of scope here — the page links to `/preview` with one line only.

Teaching-copy style (STE-adapted): purpose line, public-draft aside, sections A/B/C, all eight workflow blocks, and the links intro follow ASD-STE100 rules adapted to Traditional Chinese — one instruction per sentence, every `。`-terminated CJK sentence at most 25 characters, active voice with an explicit actor (你／系統), warnings in `警告：` + consequence form placed before the guarded action, procedures as numbered steps in execution order. Approved-terms table (same concept, same characters everywhere): 儲存 (never 保存／存檔), 分支, 合併 (merge), 草稿 (draft checkbox), 發佈 (publish), 儲存庫 (repo), 預覽 (preview), 部署 (deployment), 重新部署 (redeploy), 還原 (revert), 重新導向 (redirect). Entry titles (前往編輯器／教學文章頁面／GH倉庫) are navigation labels, not teaching copy, and stay as-is.

Suppression and exclusion rules:

- `app/globals.css` gives `[data-admin-root]` a full-viewport off-white ground with page padding and hides `.grain-overlay` plus `.site-chrome-nav` via the `:has` marker above — zero JavaScript, mirroring the existing `html:has(.obscura)` pattern. One further `:has` rule sets `body:has([data-admin-root]) { overflow-x: clip; }`: the global `overflow-x: hidden` on `body` turns it into a scroll container, which disables viewport `position: sticky` in Chromium (entry panel would scroll away with the document); `clip` still prevents horizontal overflow but creates no scroll container, so the desktop entry panel sticks. Bare and hoisted (`href`/`precedence`) `<style>` tags do not survive Next 16 prerendering, which is why this lives in global CSS instead of the page file.
- Route metadata sets `title: 教學文章編輯`, a non-public description, `robots: { index: false, follow: false }`, and no canonical.
- `app/robots.ts` disallows `/admin`; `/admin` stays out of `SITE_NAV_PAGES` and the sitemap.
- `body.menu-open` locking never triggers on `/admin` because the nav island is not rendered there.

## Home Page

`app/page.tsx` is a small Server Component with canonical `/`. `components/home/Hero.tsx` is also server-rendered and imports only `next/link`; the current home page has no GSAP or browser runtime. Film frame visibility is handled by CSS media queries before first paint, so the Hero does not need a client boundary for responsive frame selection.

The first section is an identity composition with a minimum height of `max(760px, 100svh)` on desktop and `max(720px, 100svh)` on mobile. The visual center is deliberately weighted to the left: the `NEHS / NEPC` identity sits directly on the paper ground with a red registration edge and a narrow offset red bar, while the vertical film strip enters from the right as a partial obstruction. The title uses black and deep-navy type contrast instead of a pale backing panel. Technical information is limited to coordinates, frame notation, film stock, and frame numbers. One frame has a small local offset and shadow to suggest a pasted contact sheet; other elements remain aligned so the imperfection stays controlled. Decorative elements are `aria-hidden` where appropriate.

The film strip contains twelve available crops of the same generated hero image through native `<picture>` elements. AVIF variants are selected at 640 and 1280 widths, with a 1280 WebP `<img>` fallback. Different `object-position` values create a panoramic sequence. Frame visibility is decided entirely by CSS media queries before the first paint: mobile-width viewports always show two frames, while desktop viewports at or below `740px` height show two, medium-height screens show six, tall screens show eight, and larger screens retain all twelve. Mobile no longer changes frame count when the browser address bar changes the dynamic viewport height. These images are decorative and have empty alt text. CSS aspect ratios reserve space, but the elements do not supply intrinsic width/height attributes. The first two frames load eager (the first with high fetch priority); frames below the fold load lazy with async decoding, so hidden frames no longer decode on mobile.

The `Explore index` anchor scrolls to `#home-index` and is positioned at the lower-left edge of the hero so it reinforces the left-side visual center. The second section uses a dark navy field and four large route rows. Desktop rows contain number, English title, Chinese description, and arrow; mobile hides the description column. Hover changes the entire row to red, while native links preserve essential functionality for touch and keyboard users.

## Image Conventions

Photography is content unless explicitly decorative. Meaningful images require accurate alternative text. Repeated texture, grain, mood imagery, and duplicated crops may use `alt=""` and `aria-hidden` containers when surrounding text already communicates the content.

The project intentionally uses native `<picture>` and `<img>` rather than `next/image` in most places. The application therefore owns `srcset`, `sizes`, intrinsic dimensions, lazy/eager loading, decoding, and crop behavior. Generated AVIF/WebP variants live in `public/images/generated/` and are created by `npm run images:build`; the normal build does not regenerate them.

When changing photography:

1. Preserve the authored crop and image role.
2. Add or update source assets under `assets/sources/` (About satellites: `assets/satellites/`).
3. Update `scripts/optimize_images.js` if a new generated family is needed.
4. Run `npm run images:build`.
5. Verify AVIF and WebP paths, desktop/mobile `sizes`, loading priority, alt text, and layout stability.

## Accessibility and Motion Baseline

Global `:focus-visible` applies a two-pixel ink outline with four-pixel offset. Native smooth scrolling is enabled by default. Under `prefers-reduced-motion: reduce`, global CSS disables smooth scrolling and reduces animation/transition duration to `0.01ms`; JavaScript motion must still implement its own media-query behavior.

Body classes own global scroll lock:

- `menu-open` from `SiteNavMenu`;
- `has-modal` from Contact (`ShootRequestModal`: set on open, restored on cleanup);
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
- Check global CSS state classes against all owning components; navigation cleanup must also restore saved background inert values and release its key listener on close, pathname change, and unmount/Strict Mode remount. Contact background isolation and `has-modal` ownership live in `contact.md` under the ShootRequest Modal section.
- Preserve canonical metadata for public pages.
- Run `npm run build`.
- Manually test home and navigation on mobile and desktop, with keyboard and reduced motion. For navigation, verify first-link focus, both Tab wrap directions through links plus trigger, inert background (including Licensing), focus restoration on Escape/trigger/link close, closed links excluded from focus, child-route highlighting, back/forward pathname cleanup, preserved scroll position, and mobile safe areas.
