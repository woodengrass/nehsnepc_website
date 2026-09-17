# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Frontend Principles

This project is a photography club website.
The frontend must prioritize visual identity, usability, performance, and maintainability.

### Design Direction

- Visual direction: Commercial Swiss + Editorial Photography + Motion.
- The interface should be minimal, functional, distinctive, and artistic.
- Photography is the primary visual content; UI must not compete with photography.
- Use a strong grid, large typography, generous whitespace, and large color blocks.
- Prefer asymmetric compositions when they improve visual hierarchy.
- Avoid generic SaaS/dashboard aesthetics.
- Avoid excessive cards, pills, gradients, glassmorphism, shadows, and decorative UI.
- Do not add visual elements without a clear purpose.

### Color

Primary palette:

- Deep Navy — primary structural color.
- Dark Red — accent and visual anchor.
- Off-white — primary light surface/text color.
- Black/gray — secondary utility colors.

Color blocks are part of the layout, not decoration.

Dark red should be used deliberately and sparingly.
Do not distribute the accent color uniformly across the interface.

### Typography

- Typography is a major part of the visual identity.
- Prefer large editorial headings and clear information hierarchy.
- Do not use excessive font weights or font sizes.
- Keep body text highly readable.
- CJK typography must remain legible on mobile.
- Never sacrifice readability for visual effect.

### Layout

- Use a consistent grid system across pages.
- Preserve intentional whitespace.
- Do not fill empty space merely because it is available.
- Content may intentionally break the grid when this creates a stronger composition.
- Mobile layout is not a compressed desktop layout; it must be designed independently where necessary.

### Motion

Animation should communicate structure, hierarchy, or atmosphere.

Good uses:
- page transitions
- image reveals
- scroll-driven composition
- typography movement
- color-block transitions
- meaningful 3D interaction

Avoid:
- unnecessary hover animations
- constant floating elements
- excessive parallax
- animation on every component
- animation whose only purpose is to demonstrate that animation exists

Every major animation must consider `prefers-reduced-motion`.

### Photography

- Images are content, not decoration.
- Preserve intended cropping and composition.
- Do not automatically apply overlays, gradients, filters, or excessive effects.
- Image quality and loading performance must both be considered.
- Use responsive image variants whenever possible.

### Mobile

Mobile is a first-class experience.

- All major pages must be designed and tested for mobile.
- Touch interactions must not interfere with normal scrolling.
- Hover-only interactions cannot contain essential functionality.
- Large typography must remain readable rather than simply being scaled down.
- 3D and heavy animation must have a graceful fallback.

### Performance

- Keep the default page as light as possible.
- Heavy libraries must remain code-split.
- Prefer CSS and native browser capabilities over JavaScript when practical.
- Do not introduce a dependency for a trivial interaction.
- Do not load 3D, GSAP, or other heavy runtime code globally.
- Images and models must be optimized before production use.

### Components

Components should represent meaningful UI or behavior, not arbitrary fragments.

Prefer:

- `Hero`
- `SiteNav`
- `TutorialCard`
- `Figure`
- `Model3D`

Avoid creating components solely because a block contains a few elements.

Do not create abstractions until there is a demonstrated need for reuse.

### AI-assisted Development

AI may implement or modify frontend code, but it must follow the project's existing design system.

AI must NOT:
- invent a new visual language for an individual page;
- introduce generic SaaS UI patterns;
- add unnecessary dependencies;
- add animations without a design reason;
- replace existing components with a different architecture without justification;
- rewrite working code merely to make it look different.

When implementing a visual change, preserve:
1. layout system;
2. typography;
3. color system;
4. spacing;
5. responsive behavior;
6. performance constraints.

When requirements are ambiguous, prefer the simplest implementation consistent with the existing design.

### Maintainability

The final project must be understandable by another developer who did not create it.

- Document non-obvious architectural decisions.
- Keep content separate from presentation.
- Keep heavy client-side behavior isolated.
- Avoid hidden coupling between pages.
- Avoid magic values when they represent design-system tokens.
- Do not leave experimental implementations in production code.

The goal is not to minimize code.
The goal is to minimize unnecessary complexity.

## Commands

- `npm run dev` — Next.js dev server (Turbopack)
- `npm run build` — production Next.js build and TypeScript validation
- `npm run start` — serve production build
- `npm run images:build` — regenerate AVIF/WebP variants into `public/images/generated/` (requires `sharp`, sources in `assets/sources/` and `assets/satellites/`)
- `npm run models:build` — transform GLB models from `public/models/src/*.glb` to `public/models/opt/*.glb` (deduplication, pruning, resampling, and WebP textures via glTF Transform; inspect `scripts/optimize_models.js` before claiming Draco geometry compression)

No lint, typecheck, test, or formatter is configured beyond `next build`'s TS check.

## Architecture

Next.js 16.3.3 (App Router, TypeScript, build-time prerendering where possible). The current application is on `main`. `next.config.ts` does not set `output: 'export'`, so do not describe it as a pure static export.

Per-page and per-module implementation details live in `docs/` — see `docs/README.md` for the ownership map. Do not duplicate them here; document current behavior in the owning document instead:

- routes and shared UI → `docs/frontend.md`
- tools and exposure calculator → `docs/tools.md`
- contact → `docs/contact.md`
- about experience → `docs/about.md`
- articles and publication → `docs/posts.md`
- 3D model preview → `docs/model-preview.md`
- dependencies, configuration, assets, SEO, deployment → `docs/technical-stack.md`

## Documentation Maintenance

The detailed project documentation lives in `docs/` and is part of the implementation:

- `docs/README.md` — documentation index and cross-project maintenance contract
- `docs/frontend.md` — shared frontend, home, navigation, visual system, responsive behavior, motion, images, and accessibility
- `docs/tools.md` — tools catalogue and exposure calculator
- `docs/contact.md` — contact channels, accordion, clipboard, modal, Tally, and imagery
- `docs/about.md` — focus interaction, GSAP story, Three.js archive, fallbacks, and location service
- `docs/posts.md` — article schema, categories, MDX, routes, drafts, SEO, sitemap, and RSS
- `docs/model-preview.md` — `Model3D`, model-viewer lifecycle, GLB assets, and optimization pipeline
- `docs/technical-stack.md` — dependencies, configuration, commands, assets, external services, SEO, and deployment

Documentation updates are mandatory in the same change as the implementation:

- Update `docs/frontend.md` for changes to the root layout, navigation, home, shared styles/tokens/fonts, breakpoints, photography conventions, accessibility baseline, or shared motion.
- Update `docs/tools.md` for changes to tool data/routes/status, exposure formulas, limits, parsing, controls, events, rendering, or lifecycle.
- Update `docs/contact.md` for changes to contact channels, accordion behavior, clipboard, modal/focus management, Tally configuration, or contact imagery.
- Update `docs/about.md` for changes to About content, focus input/math, GSAP timing, Three.js scene, fallbacks, projection, geolocation, cleanup, or performance behavior.
- Update `docs/posts.md` for changes to article frontmatter, categories, drafts, reading time, tutorial routes/UI, MDX plugins/components, metadata, JSON-LD, sitemap, RSS, or authoring workflow.
- Update `docs/model-preview.md` for changes to `Model3D` props/states, model-viewer loading or accessibility, model directories, optimizer transforms, or model budgets/workflow.
- Update `docs/technical-stack.md` for changes to dependencies, commands, Node requirements, environment variables, Next/TypeScript/Tailwind configuration, asset pipelines, external services, redirects, SEO infrastructure, or deployment.
- Update `docs/README.md` when documents are added, renamed, removed, or their ownership boundaries change.

If a change affects multiple areas, update every relevant document. Document current code, not planned behavior or historical assumptions. A feature change is not complete until its documentation and verification checklist are accurate.

## Deployment

Vercel. `vercel.json` only holds legacy redirects (`/pages/about.html` → `/about`, etc.). No rewrites/cleanUrls needed — Next file routing matches the old clean URLs.

## Gotchas

- `params` in Next 16 pages is a Promise — always `await params`.
- Noto Serif TC is not self-hosted; the root layout loads it through a Google Fonts stylesheet at runtime.
- Heavy libraries (Three.js, GSAP, model-viewer) must stay isolated from shared components/layout. Do not state exact bundle sizes without measuring the current production build.
- The About page locks scrolling (`body.is-focus-locked`) until focus is reached; check `prefers-reduced-motion` if it loads stuck.
- `AboutExperience` calls `ScrollTrigger.refresh()` on the next frame after the archive scene changes DOM height; `AboutExperience` cleans up via `gsap.matchMedia().revert()` for React StrictMode double-mount.
- `components/tools/ExposureCalculator.tsx` is a controlled React client component backed by pure functions in `lib/exposure/exposure.ts`; keep state in the component and math in the module, with no direct DOM mutation.
