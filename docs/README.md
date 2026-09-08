# Documentation Index

This directory is the maintained technical reference for the current
application. It documents the code as it exists on `main`. For project
overview, installation, quick start, and project structure, see the root
[README.md](../README.md) ([中文版](../README.zh-TW.md)).

## Documentation Map

| Area | Document | Primary source files |
| --- | --- | --- |
| Shared UI and visual system | [Frontend Architecture](./frontend.md) | `app/layout.tsx`, `app/globals.css`, `components/SiteNav.tsx`, `components/home/Hero.tsx` |
| Tool catalogue and exposure calculator | [Tools](./tools.md) | `app/tools/**`, `components/tools/**`, `lib/tools.ts`, `lib/exposure/**` |
| Contact channels and request form | [Contact](./contact.md) | `app/contact/page.tsx`, `components/contact/ContactPage.tsx` |
| Camera-obscura and archive experience | [About](./about.md) | `app/about/page.tsx`, `components/about/AboutExperience.tsx`, `lib/archive_scene.js` |
| MDX articles and publication surfaces | [Posts](./posts.md) | `content/articles/**`, `app/tutorial/**`, `lib/content.ts`, `components/mdx/**` |
| Embedded GLB preview and optimization | [3D Model Preview](./model-preview.md) | `components/mdx/Model3D.tsx`, `scripts/optimize_models.js`, `public/models/**` |
| Runtime, builds, assets, SEO, and deployment | [Technical Stack](./technical-stack.md) | `package.json`, configuration files, `scripts/**`, SEO metadata routes |

## Maintenance Contract

Documentation is part of the implementation. A change is incomplete if its
behavior, public contract, operational workflow, or known limitations differ
from these documents.

- Update the owning document **in the same change** as the code.
- When a change crosses areas, update every affected document.
- The map table above is the single source of ownership: when documents are
  added, renamed, removed, or their boundaries change, update it here.
- Describe current behavior. Do not preserve obsolete documentation as a
  compatibility layer; label future intent explicitly if it must be recorded.

## Verification Baseline

Before deployment, run `npm run build` and manually inspect the affected route
at desktop and mobile widths. Interactive changes additionally require keyboard
testing and `prefers-reduced-motion` testing. Changes involving WebGL or
embedded models require a real browser — the production build does not validate
GPU behavior, touch gestures, remote services, or asset quality.

Generated/public outputs to check when relevant: `/sitemap.xml`, `/robots.txt`,
`/rss.xml`, `/opengraph-image`, `public/images/generated/`, `public/models/opt/`.
See `technical-stack.md` for the full release checklist.
