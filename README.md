<div align="center">
  <img src="./public/images/generated/logo-384.webp" alt="NEHS Photography Club logo" width="120" />
  <h1>NEHS Photography Club Website</h1>
  <p>Editorial Swiss-style site for the NEHS photography club.</p>
  <p>
    <a href="./README.zh-TW.md">中文版</a>
    ·
    <a href="./LICENSING.md">Licensing</a>
    ·
    <a href="./docs/README.md">Docs</a>
  </p>
  <p>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT (code)" /></a>
    <a href="https://creativecommons.org/licenses/by-sa/4.0/"><img src="https://img.shields.io/badge/Articles-CC_BY--SA_4.0-lightgrey.svg" alt="Articles: CC BY-SA 4.0" /></a>
    <img src="https://img.shields.io/badge/Next.js-16-black.svg" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/React-19-61DAFB.svg" alt="React 19" />
    <img src="https://img.shields.io/badge/node-%3E%3D20.9-brightgreen.svg" alt="Node >= 20.9" />
  </p>
</div>

## Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Licensing](#licensing)
- [Documentation](#documentation)

## Installation

Prerequisites:

- Node.js `20.9.0` or newer (required by Next.js and Sharp).
- pnpm (`packageManager` is pinned to pnpm@10.15.1).

```bash
pnpm install
```

The only application environment variable is optional:

```bash
NEXT_PUBLIC_SITE_URL=https://nehsnepc.com
```

It defaults to `https://nehsnepc.com` when unset and controls canonical URLs,
metadata base, JSON-LD, sitemap, robots, and RSS links. It is public and must
never contain a secret. No `.env` files are checked in.

## Quick Start

| Command | When to run it |
| --- | --- |
| `npm run dev` | Local development (Turbopack). |
| `npm run build` | Production build. This is the **only automated quality gate** — no lint, test, formatter, or standalone typecheck is configured. |
| `npm run start` | Serve the production build locally. |
| `npm run images:build` | After changing source images. Regenerates AVIF/WebP variants into `public/images/generated/` (requires `sharp`). |
| `npm run models:build` | After changing GLB sources in `public/models/src/`. Writes optimized files to `public/models/opt/`. |

Asset pipelines are **not** part of `npm run build`; run them separately before
building whenever sources change.

## How It Works

**Server-first rendering.** Routes are React Server Components by default.
Client components exist only around browser behavior: navigation, the About
focus experience, contact interactions, the exposure calculator, reading
progress, and 3D model previews.

**Heavy runtimes stay isolated and lazy.** Three.js (About archive), GSAP (About
story), and `@google/model-viewer` (article embeds) are dynamically imported
only on the routes that need them — never in shared layout or navigation.
Keep it that way.

**Filesystem content, not a CMS.** Articles live in `content/articles/*.mdx`
with Zod-validated frontmatter ([`lib/content.ts`](./lib/content.ts)).
Non-draft routes are enumerated at build time, so every content change requires
a rebuild. `draft: true` articles appear in development only.

**Exposure calculator shape.**
[`components/tools/ExposureCalculator.tsx`](./components/tools/ExposureCalculator.tsx)
is a controlled React client component; all photographic math lives as pure
functions in [`lib/exposure/exposure.ts`](./lib/exposure/exposure.ts).
Details live in [`docs/tools.md`](./docs/tools.md).

**SEO is generated, not hand-written.** Sitemap, robots, RSS, and the OG image
are routes derived from the same content source ([`lib/seo.tsx`](./lib/seo.tsx),
[`app/sitemap.ts`](./app/sitemap.ts), [`app/robots.ts`](./app/robots.ts),
[`app/rss.xml/route.ts`](./app/rss.xml/route.ts),
[`app/opengraph-image.tsx`](./app/opengraph-image.tsx)).

## Project Structure

```text
app/                    Routes (App Router). layout.tsx, page.tsx per section,
                        sitemap/robots/rss/og-image routes, globals.css
  about/                Camera-obscura focus experience
  contact/              Contact channels + request form
  tools/                Tool catalogue + exposure-calculator route
  tutorial/             Article index, category/[category], [slug]
components/             UI by area: home, about, contact, tools,
                        articles, mdx (Figure, Callout, Model3D, MDXLink)
lib/                    Shared code: content.ts, tools.ts, seo.tsx, og.tsx,
                        format.ts, about_content.ts, archive_scene.js,
                        exposure/ (pure calculator module)
content/articles/       Repository-owned MDX articles
public/                 Static assets: images/ (sources), images/generated/
                        (committed variants), models/src|opt/
scripts/                optimize_images.js, optimize_models.js
docs/                   Maintained technical reference, one document per area
```

## Licensing

- Source code: MIT — see [`LICENSE`](./LICENSE).
- Photographs: © NEHS Photography Club, all rights reserved, except five About
  satellite images (`06`–`10`) used under the Unsplash License with attribution.
- Tutorial articles: CC BY-SA 4.0.

Full map and Unsplash credits: [`LICENSING.md`](./LICENSING.md) and the
[`/licensing`](https://nehsnepc.com/licensing) page.

## Documentation

Area-specific detail lives in [`docs/`](./docs/). Each document owns its area:

| Area | Document |
| --- | --- |
| Shared UI and visual system | [Frontend Architecture](./docs/frontend.md) |
| Tool catalogue and exposure calculator | [Tools](./docs/tools.md) |
| Contact channels and request form | [Contact](./docs/contact.md) |
| Camera-obscura and archive experience | [About](./docs/about.md) |
| MDX articles and publication surfaces | [Posts](./docs/posts.md) |
| Embedded GLB preview and optimization | [3D Model Preview](./docs/model-preview.md) |
| Runtime, builds, assets, SEO, and deployment | [Technical Stack](./docs/technical-stack.md) |

Documentation is part of the implementation: update the owning document in the
same change as the code. See [docs/README.md](./docs/README.md) for the full
maintenance contract and verification baseline.
