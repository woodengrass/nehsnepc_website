# Technical Stack and Operations

## Runtime and Package Model

The repository is a private ESM npm package. The installed stack centers on:

| Technology | Manifest/resolved role |
| --- | --- |
| Next.js | `16.3.3`, App Router and production server |
| React / React DOM | `^19.2.0` (lockfile resolves current 19.2.x) |
| TypeScript | `^5.7.0`, strict and no-emit |
| Tailwind CSS | `^4.3.3` through `@tailwindcss/postcss` |
| MDX | `next-mdx-remote` 6, gray-matter, remark-gfm, rehype slug/autolinks |
| Validation | Zod 4 |
| Motion/3D | GSAP 3, Three.js 0.183, model-viewer 4.3 |
| Assets | Sharp 0.35, glTF Transform 4.4, draco3dgltf |

Next.js and Sharp require Node.js `>=20.9.0`. Use a current Node 20 LTS or newer. `package-lock.json` is npm lockfile v3; use `npm ci` for reproducible installs and `npm install` only when intentionally changing dependencies.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next development server |
| `npm run build` | Production build and Next/TypeScript validation |
| `npm run start` | Serve a completed Next production build |
| `npm run images:build` | Generate committed AVIF/WebP variants with Sharp |
| `npm run models:build` | Transform source GLBs into deployable outputs |

There are no configured lint, formatter, unit, integration, end-to-end, or standalone type-check scripts. The production build is the only automated repository quality gate. Browser interaction and external-service behavior require manual testing.

## Next.js Architecture

The site uses App Router with Server Components by default. Client components are isolated around browser behavior: shared navigation, About controller, Contact, exposure calculator, reading progress, and model preview. Dynamic route `params` are Promises in this Next version and must be awaited. Before changing framework APIs, read the relevant installed guide under `node_modules/next/dist/docs/`.

`next.config.ts` allows the current Wi-Fi host `192.168.68.61` through `allowedDevOrigins` so physical devices can load Next development client chunks. Update this value if the computer's DHCP address changes. There is no `output: 'export'`, custom image loader, remote pattern, rewrite, header, React Compiler, webpack, or Turbopack customization. Routes are statically prerendered where possible, but deployment is a normal Next application rather than a pure `out/` export.

## TypeScript and Module Configuration

`tsconfig.json` enables strict mode, `noEmit`, `moduleResolution: bundler`, ES modules, React JSX, DOM libraries, incremental builds, JSON modules, isolated modules, JavaScript allowance, and skipped library checks. `@/*` maps to the repository root. The project includes `.ts`/`.tsx` source and generated Next route types. `next-env.d.ts` is generated and must not be manually edited.

The package sets `type: module`, so JavaScript scripts and libraries use ESM syntax. Browser-only JavaScript such as `lib/archive_scene.js` must not execute during server rendering. The exposure calculator is a route-scoped client component backed by the pure `lib/exposure/exposure.ts` module; it needs no dynamic import.

## Styling

`postcss.config.mjs` enables `@tailwindcss/postcss`. `app/globals.css` imports Tailwind 4 and defines runtime tokens/base behavior. Much presentation lives in utility classes; the About experience uses `app/styles/about.css`. There is no separate Tailwind config file.

See `frontend.md` for design tokens, fonts, breakpoints, and global body state.

## Route Overview

| Route | Source and behavior |
| --- | --- |
| `/` | Server-rendered home identity/index |
| `/about` | Client-enhanced focus and optional Three.js story |
| `/contact` | Client accordions, clipboard, and lazy Tally modal |
| `/tools` | Server catalogue from `lib/tools.ts` |
| `/tools/exposure-calculator` | Client calculator (controlled React + pure exposure module) |
| `/licensing` | Static licensing and attribution page |
| `/tutorial` | Filesystem article index |
| `/tutorial/category/[category]` | Three static category routes |
| `/tutorial/[slug]` | Non-draft static params and server MDX rendering |
| `/sitemap.xml` | Metadata sitemap |
| `/robots.txt` | Metadata robots policy |
| `/rss.xml` | Force-static RSS route |
| `/opengraph-image` | Generated branded image |

## Environment Contract

The only application-specific environment variable is:

```text
NEXT_PUBLIC_SITE_URL=https://nehsnepc.com
```

It is optional and falls back to `https://nehsnepc.com`. It controls canonical URLs, metadata base, JSON-LD, sitemap, robots sitemap location, RSS links, and absolute structured-data assets. It is public and must never contain a secret. Set it per Vercel environment when generated URLs should point elsewhere. `NODE_ENV` controls draft visibility.

No checked-in environment files or `.env.example` exist.

## Content Build

`lib/content.ts` reads `content/articles` synchronously from `process.cwd()`. Content must exist in the build context and every content change requires a rebuild. Non-draft article/category paths are enumerated at build time. Invalid frontmatter is skipped with a warning; MDX compilation errors may fail the build. The system is not a runtime CMS.

Detailed schema and publication behavior are in `posts.md`.

## Image Pipeline

`scripts/optimize_images.js` uses Sharp and writes `public/images/generated/`. Current fixed sets are:

| Set/source | Widths | AVIF/WebP quality |
| --- | --- | --- |
| Hero, `assets/sources/hero-1.jpg` | 640, 1280, 1920, 2560 | 50 / 72 |
| Contact, `assets/sources/contact-bg.jpg` | 480, 800, 1200, 1600 | 50 / 74 |
| Logo, `assets/sources/logo.png` | 96, 192, 384 | configured in script |
| Exposure calculator, `assets/sources/exposure-calculator.png` | 640, 960, 1280 | 52 / 76 |

Resizing uses `withoutEnlargement`; AVIF effort is 5 and WebP effort is 6. The script also processes the ten versioned `assets/satellites/*.jpg` files into `about-satellite-01-640` through `about-satellite-10-640` for the About satellite and main cards. Satellite sources `06`–`10` are Unsplash works (see `LICENSING.md`); sources live under `assets/` so a fresh clone can regenerate every variant, and generated derivatives inherit their source license. The script creates the output directory but does not delete stale files. New article images are not auto-discovered; extend the script or process them separately. Article covers render through the `TutorialCover` component (`components/articles/TutorialCover.tsx`), which builds AVIF/WebP `srcset` from the same generated families when the cover points at them and falls back to a plain lazy `<img>` otherwise.

## Model Pipeline

`scripts/optimize_models.js` reads direct GLBs from `public/models/src/` and writes same-name files to `public/models/opt/`. It deduplicates/prunes/resamples and converts textures to WebP capped at 2048px. The current script registers Draco dependencies and marks `KHRDracoMeshCompression` required but does not call the `draco()` transform; do not claim verified geometry compression without inspecting/fixing output. See `model-preview.md`.

Neither asset pipeline is invoked by `npm run build`. Generated outputs must be produced and deployed separately.

## SEO and Discovery

`lib/seo.tsx` centralizes site URL, Organization/WebSite/Article/Breadcrumb JSON-LD, and rendering. `app/sitemap.ts` covers public static routes, categories, and non-draft articles. `app/robots.ts` allows all crawling and points to the sitemap. `app/rss.xml/route.ts` generates an escaped Traditional Chinese RSS 2.0 feed. The Latin-only OG image is generated with `next/og` at 1200 by 630.

Page routes provide metadata and canonical URLs except that the current dynamic category metadata does not explicitly include a canonical. Article routes provide Open Graph article fields and structured data.

## External Browser Services

| Service | Use | Failure/privacy implication |
| --- | --- | --- |
| Google Fonts | Global Noto Serif TC stylesheet/font slices | Typography changes or falls back if blocked; third-party request |
| Tally | Contact request iframe loaded on first open | Tally owns form data, validation, and availability |
| `ipwho.is` | Automatic About IP-coordinate lookup | Third-party request; fallback text on failure |
| Instagram | Contact/About links and Organization JSON-LD | External navigation |

No first-party API, database, authentication, analytics, or form backend is present.

## Deployment

Vercel is the intended platform. `vercel.json` contains only permanent migration redirects, including legacy `.html`, `/portfolio`, `/articles/*`, and `/pages/*.html` paths. Preserve redirects unless legacy URLs are intentionally retired. Vercel infers framework/build settings; no region, runtime, build command, output, or header configuration is declared.

Local production validation:

```bash
npm ci
npm run build
npm run start
```

Then inspect core routes, all article/category routes, sitemap, robots, RSS, Open Graph image, and affected redirects. Pure static/CDN hosting would require an explicit static-export design and compatibility review.

## Performance Boundaries

- Keep root layout and home server-rendered where possible.
- Do not import GSAP, Three.js, or model-viewer into shared layout/navigation.
- Keep About Three.js and model-viewer dynamically gated.
- Optimize image/model source assets before production.
- Treat native image `sizes`, intrinsic dimensions, loading, and decoding as application responsibilities.
- Manually profile About and multiple model embeds on mobile GPUs.

## Known Operational Gaps

- no CI, tests, lint, formatter, explicit typecheck script, or asset-path validation;
- no checked-in Node version file or environment example;
- no automated image/model size or existence budget;
- external fonts, form, and geolocation dependencies;
- no security headers/CSP in Next or Vercel config;
- `.gitignore` does not cover all common IDE/build artifacts;
- generated asset scripts do not remove stale output.

## Change and Release Checklist

- Update this document when versions, scripts, framework configuration, runtime requirements, environment variables, external services, assets, SEO, redirects, or deployment behavior change.
- Update the feature document for any user-facing behavior changed at the same time.
- Read installed Next documentation before using/changing a Next API.
- Run required asset pipelines before `npm run build`.
- Review build warnings, especially skipped frontmatter.
- Test desktop/mobile, keyboard, reduced motion, slow network, and relevant browser/WebGL paths.
- Verify canonical hostname and discovery endpoints in the target environment.
