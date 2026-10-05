# Technical Stack and Operations

## Runtime and Package Model

The repository is a private ESM npm package. The installed stack centers on:

| Technology | Exact version in `package.json` |
| --- | --- |
| Next.js | `16.3.3` (pinned), App Router and production server |
| React / React DOM | `^19.2.8` (19.2 line) |
| TypeScript | `^7.0.2`, strict and no-emit |
| Tailwind CSS | `^4.3.3` through `@tailwindcss/postcss` |
| Keystatic editor | `@keystatic/core` `0.6.9` (pinned), `@keystatic/next` `5.0.5` (pinned) |
| MDX | `next-mdx-remote` 6, `@mdx-js/mdx` `3.1.1` (pinned), gray-matter, remark-gfm, rehype slug/autolinks; transitive `@markdoc/markdoc` `0.4.0` (via Keystatic, lockfile-resolved) |
| Validation | Zod 4 |
| Motion/3D | GSAP 3, Three.js 0.183, model-viewer 4.3 |
| Assets | Sharp 0.35, glTF Transform 4.4, draco3dgltf |
| Test runners | `@playwright/test` `1.63.0` (pinned), `tsx` `4.23.15` (pinned) |

Next.js and Sharp require Node.js `>=20.9.0`. Use a current Node 20 LTS or newer. `pnpm-lock.yaml` is the tracked lockfile (`packageManager` `pnpm@10.15.1`); use `pnpm install --frozen-lockfile` for reproducible installs and `pnpm install` only when intentionally changing dependencies. The Keystatic pair is intentionally pinned (no caret): editor storage, image-field, and OAuth behavior is version-sensitive (see ADR-0003).

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next development server through the unified launcher: pre-generates article images, then watches `assets/articles/` (debounced, serialized, node:fs only) while Next runs. GitHub-mode admin (no local writes). |
| `npm run admin:dev` | Same launcher with `--admin`: sets `NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE=1`, binds Next to `127.0.0.1` only, and uses Keystatic local storage. Loopback loop only — never in production/preview. |
| `npm run content:validate` | Fail-fast article contract check (`tsx scripts/validate_articles.ts`). See `posts.md`. |
| `npm run images:articles` | Editor-managed article image generator only (`scripts/optimize_article_images.js`). |
| `npm run images:build` | Full image generation: committed families (`scripts/optimize_images.js`) then article derivatives (`scripts/optimize_article_images.js`). |
| `npm run prebuild` | `content:validate` then `images:articles`. Runs automatically before every `npm run build`. |
| `pnpm test:content` | Content quality gate: `content:validate` plus the contract spec (`playwright test tests/content/contract.spec.ts`). |
| `pnpm test:admin` | Admin browser gate, composed of `test:admin:guards` (static guard spec `tests/keystatic/github-guards.spec.ts`), `test:admin:local` (loopback compat harness via `playwright.local.config.ts`), and the orchestrator `tsx scripts/test_admin_workflow.ts` (save/publish semantics plus production smoke via `playwright.production.config.ts`): loopback CRUD, draft absence plus publication inclusion across article route/index/category/sitemap/RSS, auth negatives, desktop `1440x1000` plus mobile `390x844` plus keyboard flow, and public-bundle isolation. |
| `npm run build` | Production build and Next/TypeScript validation. Remains the sole release gate. |
| `npm run start` | Serve a completed Next production build. |
| `npm run models:build` | Transform source GLBs into deployable outputs. |

There are no configured lint, formatter, or standalone type-check scripts. The production build is the release gate; `content:validate`/`test:content`/`test:admin` are narrow content and admin gates that cover only what the build cannot prove (see ADR-0005). Browser interaction and external-service behavior require manual testing.

## Next.js Architecture

The site uses App Router with Server Components by default. Client components are isolated around browser behavior: shared navigation, About controller, Contact, exposure calculator, reading progress, and model preview. Dynamic route `params` are Promises in this Next version and must be awaited. Before changing framework APIs, read the relevant installed guide under `node_modules/next/dist/docs/`.

`next.config.ts` allows the current Wi-Fi host `192.168.68.61` through `allowedDevOrigins` so physical devices can load Next development client chunks. Update this value if the computer's DHCP address changes. There is no `output: 'export'`, custom image loader, remote pattern, rewrite, header, React Compiler, webpack, or Turbopack customization. `experimental.optimizePackageImports` covers `three`, `gsap`, `@google/model-viewer` (`next.config.ts:6-10`). Routes are statically prerendered where possible, but deployment is a normal Next application rather than a pure `out/` export.

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
| `/tutorial/category/[category]` | Three static category routes: `basic`, `topic`, `news` |
| `/tutorial/[slug]` | Non-draft static params and server MDX rendering |
| `/sitemap.xml` | Metadata sitemap |
| `/robots.txt` | Metadata robots policy (disallows `/admin`) |
| `/rss.xml` | Force-static RSS route |
| `/opengraph-image` | Generated branded image |
| `/admin` | Static noindex Traditional Chinese gateway (`data-admin-root`) linking into `/keystatic`; no nav, sitemap, or canonical entry |
| `/keystatic` | Keystatic editor UI (OAuth-gated, noindex, preview-disabled; local loopback mode only via `admin:dev`) |
| `/api/keystatic/[...params]` | Lazy fail-closed Keystatic route handler (force-dynamic; never in the public bundle) |

## Environment Contract

`.env.example` is the checked-in template of placeholders only — never real secrets. Copy it to `.env.local` (gitignored via `.env*`, with `!.env.example` keeping the template) and fill values from the GitHub App plus Vercel project settings:

```bash
cp .env.example .env.local
```

| Variable | Visibility | Rule |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public | Optional canonical origin; falls back to `https://nehsnepc.com`. Controls canonical URLs, metadata base, JSON-LD, sitemap, robots sitemap location, RSS links, and absolute structured-data assets. Must never contain a secret. |
| `KEYSTATIC_GITHUB_CLIENT_ID` | Public identifier | GitHub App client id, minimum 8 characters. |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | Server-only | GitHub App client secret, minimum 20 characters. |
| `KEYSTATIC_SECRET` | Server-only | Keystatic session secret, minimum 32 characters (31 fails closed). Generate 32+ random bytes; rotate as below. |
| `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | Public (never a secret) | GitHub App slug from the App's settings page/URL (`github.com/settings/apps/<slug>`), minimum 8 characters (Keystatic requires non-empty). Required by the official `@keystatic/next@5.0.5` route handler + UI bundle (`slugEnvName`); missing/short fails closed with redacted 503. Public by design — it appears in install URLs. |
| `KEYSTATIC_GITHUB_REPO` | Pinned config | Must stay exactly `woodengrass/nehsnepc_website` (`EXPECTED_GITHUB_REPO`); any other value fails closed. Owner/name split vars (`KEYSTATIC_GITHUB_REPO_OWNER`/`KEYSTATIC_GITHUB_REPO_NAME`) are accepted as an equivalent input shape. |
| `KEYSTATIC_PRODUCTION_ORIGIN` | Server-only | Canonical production HTTPS origin, no trailing slash (www canonical, e.g. `https://www.nehsnepc.com`; the apex is accepted as an alias — a single leading `www.` is ignored on both sides before comparing, anything else 403s). API requests from any other origin get a redacted 403; safe wrong-host UI GETs redirect (308) to this literal origin — the request Host is never reflected. Register BOTH apex and www callback URLs in the GitHub App settings. |
| `NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE` | Dev-only flag | Set to `1` only for loopback `admin:dev` editing (`NODE_ENV=development` is also required). Never set in production or preview: ordinary dev, production, and preview always use GitHub mode. |
| `NODE_ENV` | Runtime | Controls draft visibility (`!== 'production'` includes drafts). |
| `VERCEL_ENV` | Platform | `preview` disables the admin UI and API entirely (see below). |

`keystatic.config.ts` reads `process.env` directly (no helper indirection) so Next.js/Turbopack can statically inline `NEXT_PUBLIC_*` into the admin browser bundle; indirect access would silently flip the admin UI into GitHub mode while the API stays local. The GitHub repo itself comes from the pinned `EXPECTED_GITHUB_REPO` constant (server-only repo env is unreadable in the browser bundle — the server gate still 503s on any env value ≠ pin).

## Keystatic GitHub Mode (Fail-Closed)

Storage selection (`lib/keystatic/storage.ts`): local mode only when **both** `NODE_ENV === 'development'` **and** `NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE === '1'`; every other environment uses GitHub mode. GitHub mode never falls back to local writes.

The API route (`app/api/keystatic/[...params]/route.ts`, `dynamic = 'force-dynamic'`) is a lazy bootstrap: every guard runs **before** the Keystatic config/handler is constructed, in fail-closed order, and neither failure path invokes the official handler:

1. Preview kill: `VERCEL_ENV === 'preview'` answers redacted `403 keystatic-preview-disabled` (the `/keystatic` UI renders a `data-keystatic-unavailable` notice instead).
2. Secrets: missing/short secrets answer redacted `503 keystatic-github-not-configured` naming only the missing names (never values).
3. Repo pin: any repo other than `woodengrass/nehsnepc_website` answers redacted `503 keystatic-github-repo-mismatch`.
4. Origin configured: an unset/non-HTTPS canonical origin answers redacted `503 keystatic-origin-not-configured`.
5. Origin equality: a request whose normalized origin (`Origin` header, then `Referer`, then request URL) is not equivalent to the canonical origin answers redacted `403 keystatic-origin-forbidden` naming only the env var — the request Host is never reflected. Equivalence ignores a single leading `www.` on either side (www canonical, apex accepted as alias); anything else still 403s.

The UI guard (`app/keystatic/layout.tsx`) mirrors this for safe methods only: preview renders the unavailable notice; a safe GET/HEAD arriving on a non-canonical host is redirected (308) to the literal configured origin. Layouts only serve GET/HEAD, so the redirect is inherently safe-method-only. Missing headers/env render the app so builds without secrets succeed. `permanentRedirect` throws and must stay outside any try/catch — only the `headers()` read is guarded.

Canonical callback: the GitHub OAuth App registers BOTH callback URLs — apex and www (`{apex}/api/keystatic/github/oauth/callback` and `{www}/api/keystatic/github/oauth/callback`; the path is fixed by the installed `@keystatic/core@0.6.9` route handler). The www origin stays canonical (`KEYSTATIC_PRODUCTION_ORIGIN`); the apex is accepted as an alias by the gate. Login at `/api/keystatic/github/login` under the same origins. No preview callback.

Public-bundle isolation: Keystatic imports live only in `app/keystatic/*` and `keystatic.config.ts` (loaded lazily by the API route). The root layout never imports Keystatic or admin client code and suppresses site chrome on admin surfaces with pure CSS (`body:has([data-admin-root])`); Keystatic internal classes are never targeted. The `test:admin` gate asserts this isolation holds.

## Content Build

`lib/content.ts` reads `content/articles` synchronously from `process.cwd()`. Content must exist in the build context and every content change requires a rebuild. Non-draft article/category paths are enumerated at build time. The runtime reader keeps warn-skip as defense-in-depth, but `prebuild` runs `content:validate` first, so invalid content fails the build instead of vanishing silently. The system is not a runtime CMS: public pages never read GitHub at runtime.

Detailed schema, editor defaults, validation groups, and authoring behavior are in `posts.md`.

## Image Pipeline

`scripts/optimize_images.js` uses Sharp and writes `public/images/generated/`. Current fixed sets are:

| Set/source | Widths | AVIF/WebP quality |
| --- | --- | --- |
| Hero, `assets/sources/hero-1.jpg` | 640, 1280, 1920, 2560 | 50 / 72 |
| Contact, `assets/sources/contact-bg.jpg` | 480, 800, 1200, 1600 | 50 / 74 |
| Logo, `assets/sources/logo.png` | 96, 192, 384 | 58 / 82 |
| Exposure calculator, `assets/sources/exposure-calculator.png` | 640, 960, 1280 | 52 / 76 |

Resizing uses `withoutEnlargement`; AVIF effort is 5 and WebP effort is 6. The script also processes the ten versioned `assets/satellites/*.jpg` files into `about-satellite-01-640` through `about-satellite-10-640` for the About satellite and main cards. Satellite sources `06`–`10` are Unsplash works (see `LICENSING.md`); sources live under `assets/` so a fresh clone can regenerate every variant, and generated derivatives inherit their source license. The script creates the output directory but does not delete stale files. New article images are not handled here — they belong to the article pipeline below. Article covers render through the `TutorialCover` component (`components/articles/TutorialCover.tsx`), which builds AVIF/WebP `srcset` from the same generated families when the cover points at them and falls back to a plain lazy `<img>` otherwise.

## Article Image Pipeline (Editor-Managed)

`scripts/optimize_article_images.js` (ADR-0004) owns editor-managed article images only and never reads or writes the families above:

- Discovers versioned sources under `assets/articles/` recursively; mirrors each source 1:1 to a fallback at the exact serialized path (`public/images/generated/articles/<slug>/…`) plus non-upscaled 640/1280/1920 AVIF/WebP derivatives beside it, using the hero Sharp params verbatim (AVIF q50 effort5, WebP q72 effort6). The fallback is capped at 1920 wide but always emitted, even for sub-640 sources.
- Records measured widths in the atomic manifest `public/images/generated/articles.manifest.json`, from which `TutorialCover` and `Figure` derive srcsets. Skips unchanged sources (mtime + size) so warm restarts stay instant. Exit 1 only on Sharp/parse/write failure; traversal escapes, symlinks, unsupported types, 0-byte files, and over-8-MiB files are warnings (exit 0). Orphan pruning is opt-in via `--prune` (default off).
- Article sources are tracked in Git; article outputs and the manifest are gitignored build artifacts (`.gitignore`), regenerated by `prebuild` and by the dev launcher's startup generation plus `assets/articles/` watcher.

Neither the non-article pipeline nor model optimization is invoked by `npm run build`. `prebuild` (validator plus article images) runs automatically; run `npm run images:build` or `npm run models:build` separately when those sources change, and commit the non-article outputs (ADR-0001 still owns them).

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

The only first-party API is the Keystatic route handler (`/api/keystatic/[...params]`, lazy fail-closed as documented above). There is no other first-party database, analytics, or form backend; Tally owns contact form data.

## Deployment

Vercel is the intended platform, Git-triggered: every push to `main` (including Keystatic browser saves, which are ordinary Git commits) rebuilds, and a failed build leaves the prior production deployment serving — publish intent (`draft: false` merged to `main` through a pull request) takes effect only after a green build. `vercel.json` contains only permanent migration redirects, including legacy `.html`, `/portfolio`, `/articles/*`, and `/pages/*.html` paths. Preserve redirects unless legacy URLs are intentionally retired. Vercel infers framework/build settings; no region, runtime, build command, output, or header configuration is declared. There is no Deploy Hook: rebuilds come from Git pushes only.

### Branch protection runbook (MANUAL — GitHub side, code is ready, switch is not flipped)

Current state: `main` is UNPROTECTED — direct-to-`main` saves are still technically possible. The code side is done (`branchPrefix: 'preview/'` in the Keystatic GitHub storage config, ADR-0003 amendment). Protection does NOT exist until a human flips it in GitHub settings. Do every step below as a repository admin:

1. Open the repository on GitHub → Settings → Branches → Add classic branch protection rule. Branch name pattern: `main`.
2. Tick **Require a pull request before merging**. Leave required approvals at zero — do NOT enable or require approvals; authors self-merge their own article PRs.
3. Suggest squash: repository Settings → General → Pull Requests → tick **Allow squash merging** and keep it the default merge method, so each preview branch lands as one commit. Tick **Automatically delete head branches** so merged `preview/*` branches disappear without extra automation.
4. Bypass list for typo fixes: back in the protection rule, add the designated admins under **Allow specified actors to bypass required pull requests**. Only bypass-listed admins may push `main` directly, and only for small typo fixes.
5. Editor convention (no setting enforces the name — the prefix only scopes creation): editors create `preview/<github-username>` branches through Keystatic's native branch dialog, save there, then open a pull request against `main`.

MANUAL checklist (human confirms, never mark green without doing it):

- [ ] Protection rule on `main` is live: a direct push to `main` from a non-bypass account is rejected.
- [ ] Self-merge works with zero required approvals: an editor can open and squash-merge their own `preview/*` PR.
- [ ] Auto-delete confirmed: a merged head branch disappears from the branch list.
- [ ] Vercel branch-preview confirmation: pushing a `preview/*` branch produces a Vercel preview deployment, so editors get a pre-publish preview build before merging.
- [ ] Bypass check: a designated admin can still push a typo fix directly; a non-listed editor cannot.

Vercel production environment variables (all six required in production; preview gets none of the admin surface regardless):

- `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET` (the 8/20/32-char minima are enforced at runtime);
- `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` (public App slug, 8-char minimum enforced at runtime);
- `KEYSTATIC_GITHUB_REPO=woodengrass/nehsnepc_website`;
- `KEYSTATIC_PRODUCTION_ORIGIN` set to the exact registered production HTTPS origin, no trailing slash;
- `NEXT_PUBLIC_SITE_URL` when generated URLs should point at the production host;
- never set `NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE` on Vercel.

Local production validation:

```bash
pnpm install --frozen-lockfile
npm run content:validate
npm run build
npm run start
```

Then inspect core routes, all article/category routes, sitemap, robots, RSS, Open Graph image, and affected redirects. Pure static/CDN hosting would require an explicit static-export design and compatibility review.

## Admin Runbooks

### GitHub App creation (MANUAL — GitHub side, done once)

Create a **GitHub App** (NOT a classic OAuth App) — Keystatic GitHub mode uses
the guided **"Create GitHub App"** flow launched from `/keystatic` itself, or
the App can be created manually:

1. As an organization owner, create a GitHub App (GitHub → Settings → Developer settings → GitHub Apps → New GitHub App), or run Keystatic's guided "Create GitHub App" flow from `/keystatic` (it registers the App for you). Homepage URL is the production origin.
2. Register BOTH callback URLs in the App's settings page (apex + www): `{apex}/api/keystatic/github/oauth/callback` and `{www}/api/keystatic/github/oauth/callback` (the path is fixed by the installed `@keystatic/core@0.6.9` route handler; the www origin stays canonical in `KEYSTATIC_PRODUCTION_ORIGIN`, the apex is accepted as an alias).
3. Copy the client ID and generate a client secret into `.env.local` (local rehearsal) and the Vercel production env (real deployment). Copy the App slug (from the App's settings page/URL, `github.com/settings/apps/<slug>`) into `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` in both places too — it is public, never a secret. Never commit any of these files/values beyond the placeholder template.
4. Verify live (MANUAL): open `/admin`, enter `/keystatic`, complete GitHub login, and confirm the `Articles` collection lists `content/articles/*`. Record the result in the task evidence file — never mark it green without performing it.

### Manual pre-launch checklist (MANUAL — all GitHub/Vercel side)

- App installed/authorized for the pinned repository with the expected callback.
- Collaborators who edit hold repository **write** access (Keystatic GitHub mode authorizes repo writers only; there is no narrower role).
- Editors create `preview/<github-username>` branches through Keystatic's native branch dialog (scoped to `preview/` by `branchPrefix`); nothing lands on `main` except through a self-merged pull request (squash, auto-delete heads). No approvals are required.
- `main` is branch-protected (MANUAL step — see the branch protection runbook above; until the rule is live, direct writes are still technically possible). Only bypass-listed admins may push `main` directly, for typo fixes only.
- Vercel production env holds all six values above; preview deployments show the admin-unavailable notice.

### Normal dev versus loopback admin

- Normal dev (`npm run dev`): GitHub mode, full article image pre-generation plus watch, no local writes. Use for all website work.
- Loopback admin (`npm run admin:dev`): local Keystatic storage on `127.0.0.1` only (`NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE=1` plus `NODE_ENV=development`). Use for editor rehearsal and the Playwright gates. Never expose this mode beyond loopback, and never set the flag in production or preview.

### Secret rotation

1. Generate a new `KEYSTATIC_SECRET` (32+ random bytes) and, if rotating OAuth credentials, a new GitHub client secret.
2. Set the new values in the Vercel production env first, then replace `.env.local` copies.
3. Redeploy production and confirm `/keystatic` login still completes (MANUAL live check).
4. Existing Keystatic sessions invalidate on `KEYSTATIC_SECRET` rotation; editors sign in again. Old secrets are deleted, never logged.

### Onboarding / offboarding

- Onboarding: grant the editor repository write access, point them at `/admin` (guide blocks plus public-draft aside are the training surface), and confirm they understand preview-branch creation, save-commits-to-branch, PR self-merge with squash, draft-defaults, and public-draft disclosure.
- Offboarding: revoke repository write access. That single action removes editor access — there is no separate CMS account to delete. Previously committed content remains in Git history by design.

### Recovery

- Bad article save: `git revert` the Keystatic commit (each save is one ordinary commit), then let Vercel rebuild; or redeploy the previous successful Vercel deployment. The `/admin` page shows no commit or deployment status by design — use GitHub and the Vercel dashboard.
- Bad deploy: redeploy the prior green Vercel deployment; production keeps serving it until a new build succeeds.
- Lost secrets: reissue from the GitHub App plus a fresh `KEYSTATIC_SECRET`, update Vercel env, redeploy, and re-verify login (MANUAL).

### Public-draft disclosure

The repository is public: every committed draft is world-readable on GitHub (file view, history, search) even while all five website surfaces exclude it. Drafts are unpublished, never confidential — never write non-public information into any article, draft or not. The `/admin` gateway carries this warning in a guide block and a red aside; ADR-0003 records it as a permanent consequence.

### Public-bundle isolation

Keystatic code must never enter public bundles: only `app/keystatic/*` and the lazily imported `keystatic.config.ts` touch `@keystatic/*`; the root layout stays a secret-free Server Component; admin chrome suppression is pure CSS. The `test:admin` gate asserts isolation holds. If a future change imports Keystatic (or any heavy editor runtime) into shared layout, navigation, or a public route, the gate fails and the change must be reworked, not documented around.

## Performance Boundaries

- Keep root layout and home server-rendered where possible.
- Do not import GSAP, Three.js, or model-viewer into shared layout/navigation.
- Keep About Three.js and model-viewer dynamically gated.
- Optimize image/model source assets before production.
- Treat native image `sizes`, intrinsic dimensions, loading, and decoding as application responsibilities.
- Manually profile About and multiple model embeds on mobile GPUs.

## Known Operational Gaps

- no CI, lint, formatter, explicit typecheck script, or asset-path validation;
- no checked-in Node version file;
- no automated image/model size or existence budget outside the article validator;
- external fonts, form, and geolocation dependencies;
- no security headers/CSP in Next or Vercel config;
- `.gitignore` does not cover all common IDE/build artifacts;
- non-article generated asset scripts do not remove stale output;
- Vercel project dashboard URL is not recorded in the repo (`/admin` links the generic dashboard with a replace-when-known comment) — MANUAL item for the maintainer.

## Change and Release Checklist

- Update this document when versions, scripts, framework configuration, runtime requirements, environment variables, external services, assets, SEO, redirects, or deployment behavior change.
- Update the feature document for any user-facing behavior changed at the same time.
- Read installed Next documentation before using/changing a Next API.
- Run `npm run content:validate` and required asset pipelines before `npm run build`.
- Review build warnings and validator errors, especially frontmatter and media paths.
- Test desktop/mobile, keyboard, reduced motion, slow network, and relevant browser/WebGL paths.
- Verify canonical hostname and discovery endpoints in the target environment.
- Release sequence: `pnpm install --frozen-lockfile`, `npm run content:validate`, `pnpm test:content`, `pnpm test:admin`, `npm run build`.
