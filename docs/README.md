# Documentation Index

Implementation source of truth is the code. These documents record decisions, history and rationale, and external contracts only. They do not mirror code facts: no field lists, verbatim copy strings, prop or state descriptions, file-by-file behavior, line references, or exhaustive command tables. If a maintainer can learn it in 2 minutes by reading the code, it belongs in the code, not here. For project overview, installation, quick start, and project structure, see the root [README.md](../README.md) ([中文版](../README.zh-TW.md)).

## Documentation Map

| Area | Document | Primary source files |
| --- | --- | --- |
| Shared UI and visual system | [Frontend Architecture](./frontend.md) | `app/layout.tsx`, `app/globals.css`, `components/SiteNav.tsx`, `components/SiteNavMenu.tsx`, `components/home/Hero.tsx` |
| Tool catalogue and exposure calculator | [Tools](./tools.md) | `app/tools/**`, `components/tools/**`, `lib/tools.ts`, `lib/exposure/**` |
| Contact channels and request form | [Contact](./contact.md) | `app/contact/page.tsx`, `components/contact/**`, `lib/contact/**` |
| Camera-obscura and archive experience | [About](./about.md) | `app/about/page.tsx`, `app/about/layout.tsx`, `components/about/AboutExperience.tsx`, `lib/archive_scene.js` |
| MDX articles and publication surfaces | [Posts](./posts.md) | `content/articles/**`, `app/tutorial/**`, `lib/content.ts`, `components/mdx/**`, `components/articles/TutorialCover.tsx` |
| Embedded GLB preview and optimization | [3D Model Preview](./model-preview.md) | `components/mdx/Model3D.tsx`, `scripts/optimize_models.js`, `public/models/**` |
| Runtime, builds, assets, SEO, and deployment | [Technical Stack](./technical-stack.md) | `package.json`, configuration files, `scripts/**`, SEO metadata routes |

## Maintenance Contract

A change is incomplete if its decisions, external contracts, operational runbooks, or known limitations differ from these documents. Code facts alone never require a doc update.

- Update the owning document **in the same change** as the code, but only for decision-affecting changes.
- When a change crosses areas, update every affected document.
- The map table above is the single source of ownership: when documents are added, renamed, removed, or their boundaries change, update it here.
- Describe current decisions and contracts. Do not preserve obsolete documentation as a compatibility layer; label future intent explicitly if it must be recorded.

## Verification Baseline

Before deployment, run `npm run build` and manually inspect the affected route at desktop and mobile widths. Interactive changes additionally require keyboard testing and `prefers-reduced-motion` testing. Changes involving WebGL or embedded models require a real browser. Contact behavior is additionally covered by `pnpm test:contact` (unit, then browser, then missing-key fallback). See [Technical Stack](./technical-stack.md) for the release sequence.
