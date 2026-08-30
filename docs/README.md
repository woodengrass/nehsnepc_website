# NEHS Photography Club Documentation

This directory is the maintained technical reference for the current application. It documents the code as it exists on `main`; it is not a migration plan or a description of the retired Vite site.

## Documentation Map

| Area | Document | Primary source files |
| --- | --- | --- |
| Shared UI and visual system | [Frontend Architecture](./frontend.md) | `app/layout.tsx`, `app/globals.css`, `components/SiteNav.tsx`, `components/home/Hero.tsx` |
| Tool catalogue and exposure calculator | [Tools](./tools.md) | `app/tools/**`, `components/tools/**`, `lib/tools.ts` |
| Contact channels and request form | [Contact](./contact.md) | `app/contact/page.tsx`, `components/contact/ContactPage.tsx` |
| Camera-obscura and archive experience | [About](./about.md) | `app/about/page.tsx`, `components/about/AboutExperience.tsx`, `lib/archive_scene.js` |
| MDX articles and publication surfaces | [Posts](./posts.md) | `content/articles/**`, `app/tutorial/**`, `lib/content.ts`, `components/mdx/**` |
| Embedded GLB preview and optimization | [3D Model Preview](./model-preview.md) | `components/mdx/Model3D.tsx`, `scripts/optimize_models.js`, `public/models/**` |
| Runtime, builds, assets, SEO, and deployment | [Technical Stack](./technical-stack.md) | `package.json`, configuration files, `scripts/**`, SEO metadata routes |

## System Summary

The site is a Next.js 16 App Router application written in TypeScript and React 19. Routes are Server Components unless a browser-only interaction requires a client boundary. Articles are repository-owned MDX files read at build/render time. Heavy browser runtimes are isolated: Three.js is dynamically imported by the About experience, the Google model viewer is imported only near an embedded model, and the exposure engine is imported only on its tool route.

The production target is Vercel. The application statically prerenders routes where Next.js can do so, but `next.config.ts` does not set `output: 'export'`; this is not a pure `out/` static export.

## Core Commands

```bash
npm ci
npm run dev
npm run build
npm run start
npm run images:build
npm run models:build
```

Node.js `20.9.0` or newer is required by the installed Next.js and Sharp versions. No independent lint, test, formatter, or type-check command is configured. `npm run build` is the repository-wide automated validation command.

Current build blocker: `components/tools/ExposureCalculator.tsx` imports `@/exposure/exposure_calculator`, but no matching module exists in the working tree. Restore or replace that engine before expecting `npm run build` to pass.

Asset optimization is not part of `npm run build`. Run the corresponding asset command before building whenever source images or GLB files change.

## Documentation Maintenance Contract

Documentation is part of the implementation. A change is incomplete if its behavior, public contract, operational workflow, or known limitations differ from these documents.

Update the relevant document in the same change when modifying:

- routes, shared layout, navigation, typography, tokens, responsive behavior, motion, accessibility, or image conventions;
- tool metadata, tool routes, exposure formulas, controls, parsing, compensation, or calculator lifecycle;
- contact channels, clipboard behavior, accordions, modal focus behavior, Tally configuration, or contact imagery;
- About content, focus controls, GSAP sequencing, Three.js scene behavior, fallbacks, external geolocation, or WebGL performance;
- article schema, categories, draft rules, MDX components, article routes, metadata, RSS, sitemap, or authoring workflow;
- `Model3D` props, loading/error behavior, model-viewer integration, source/output paths, or GLB optimization;
- dependencies, commands, environment variables, configuration, asset pipelines, SEO, redirects, deployment, or runtime requirements.

When a change crosses areas, update every affected document. Do not preserve obsolete documentation as a compatibility layer. Describe the current behavior, and label intended future behavior explicitly if it must be recorded.

## Verification Baseline

Before deployment, run `npm run build` and manually inspect the affected route at desktop and mobile widths. Interactive changes additionally require keyboard testing and `prefers-reduced-motion` testing. Changes involving WebGL or embedded models require a real browser because the production build does not validate GPU behavior, touch gestures, remote services, or asset quality.

Generated/public outputs that should be checked when relevant:

- `/sitemap.xml`
- `/robots.txt`
- `/rss.xml`
- `/opengraph-image`
- `public/images/generated/`
- `public/models/opt/`
