# ADR-0006: Client-side article preview renderer (`/preview`)

## Status

Accepted

## Date

2026-10-01

## Involved

NEHS Photography Club site maintainers, trusted article editors

## Context

The branch-preview workflow (preview branches, `preview/<username>` convention)
lets editors commit drafts without touching `main`, but Vercel only renders a
branch after a full production build. Editors need a zero-wait way to see a
committed article as it will read — without adding a server render endpoint,
auth/session machinery, or a second CMS pipeline. The repository is public and
article content is public by design (see ADR-0003 consequences), so the
preview can be public-readable with no login.

## Decision

Ship a pure client-side `/preview` page (`app/preview/*`, `lib/preview/*`)
that fetches committed MDX from the public GitHub contents API
(`woodengrass/nehsnepc_website`, `content/articles/<slug>.mdx`, any branch,
default `main`, unauthenticated), parses frontmatter in the browser, compiles
the body with `@mdx-js/mdx` `evaluate`, and renders the full article layout
with site styles. This is an explicit second-renderer exception with the
following locks:

- **Version-locked to production.** The browser pipeline uses the exact same
  pinned dependencies as `app/tutorial/[slug]/page.tsx` — no second version
  set:

  | Package | Pinned version | Production user | Preview user |
  | --- | --- | --- | --- |
  | `@mdx-js/mdx` | 3.1.1 | transitive via `next-mdx-remote` | `evaluate` in `lib/preview/pipeline.ts` |
  | `remark-gfm` | 4.0.1 | `remarkPlugins: [remarkGfm]` | same |
  | `rehype-slug` | 6.0.0 | `rehypePlugins` first | same |
  | `rehype-autolink-headings` | 7.1.0 | `[rehypeAutolinkHeadings, { behavior: 'wrap' }]` | same |
  | `zod` | 4.6.5 | frontmatter schema | frontmatter schema |
  | `@google/model-viewer` | ^4.3.1 | lazy `Model3D` embed | same `Model3D` component reused |

  `gray-matter` is deliberately NOT reused: its entry requires `node:fs`,
  which cannot ship in a browser chunk. Frontmatter parsing is a minimal
  YAML-subset parser (`lib/preview/frontmatter.ts`) covering exactly the
  shapes the Keystatic schema emits; exotic constructs degrade to visible
  warnings. No new dependencies were added for the preview.

- **Same component map, client-safe twins.** `Callout` is reused as-is,
  `MDXLink` is reused (internal links stay `next/link`), and `Model3D` is
  reused with its production lazy `model-viewer` load. `Figure` and
  `TutorialCover` are server-only (`node:fs` manifest read), so the preview
  ships twins (`PreviewFigure`, cover branch in `PreviewRenderer`) with
  identical class names and identical srcset math, fed by
  `fetch('/images/generated/articles.manifest.json')` instead of `node:fs`.

- **Read-only, noindex, off every surface.** Route metadata is
  `index: false, follow: false`; `robots.ts` disallows `/preview`; the route
  is absent from sitemap, RSS, and navigation by construction (nothing links
  to it). No server render endpoint exists; nothing is written anywhere.

- **Route-isolated bundle.** `app/preview/page.tsx` is a thin shell that
  loads `PreviewClient` via `next/dynamic` with `ssr: false`, and the MDX
  compiler is split one level deeper (`PreviewRenderer`). The   compiler chunk (110 kB minified, route-only, measured in the production
  build: `0gt96eb4s27q9.js`, reachable only through the
  `PreviewLoader → PreviewClient → PreviewRenderer` dynamic-import chain
  rooted at `/preview`; no public route manifest references it) never enters public bundles; the consistency spec
  asserts no public route imports preview code and no `node:*` import exists
  in the preview chunk.

- **Drift-tested.** `tests/preview/consistency.spec.ts` fails on drift: it
  asserts the pipeline constants match `package.json` pins and installed
  versions, the plugin configuration matches production source, committed
  articles parse identically server-side vs client-side, structure
  (headings order, component count/order, image srcs, links) matches, every
  committed article compiles in the browser pipeline, and bundle isolation
  holds.

## Scope and Impact

- **Applies to:** branch preview reading (`/preview?slug=X&branch=preview/yyy`),
  including drafts on any branch.
- **Does not apply to:** public article rendering (unchanged
  `next-mdx-remote/rsc` path), the editor (`/admin`, `/keystatic`), branch
  protection, or the image/model pipelines.

## Honest limitations (documented, in UI and here)

- **Saved commits only.** Unsaved Keystatic keystrokes never appear; the
  preview UI states this on every load.
- **New-upload images 404 pre-generation.** A managed path absent from the
  manifest renders an explicit dashed placeholder ("圖片衍生檔尚未產生"),
  never a silent gap; it resolves after merge plus a successful build.
- **SEO/JSON-LD not previewed.** No `JsonLd`, no OpenGraph, no adjacent-
  article navigation — the preview is a reading check, not a metadata check.
- **Frontmatter validation display.** Problems that would fail the
  production build render as a visible warning box; the preview still shows
  the article with safe fallbacks.

## Alternatives Considered

- **Server render endpoint for branches:** rejected. It adds a runtime GitHub
  dependency and cache/auth surface to production for a read-only need the
  browser can serve from the public API.
- **Scraping Keystatic DOM or undocumented internals:** rejected. Fragile,
  version-coupled, and unnecessary — committed MDX plus the public API is
  the documented contract.
- **Reusing `gray-matter` in the browser:** rejected. Its entry requires
  `node:fs`; polyfilling node core into a route chunk to reuse a string
  splitter is cost without benefit.

## Consequences

Editors get instant branch previews with zero server cost and zero public-
bundle impact. The price is a second renderer the team must keep locked:
any plugin, version, component-prop, or layout change to the production
article path must be mirrored in `app/preview/*` until the consistency spec
goes red — the spec, not memory, enforces this.

## Revisit Triggers

Supersede with a new ADR if the production article pipeline changes shape
(e.g. new MDX components, new remark/rehype plugins), if previews need
unsaved keystrokes or authenticated private content, or if the browser MDX
compile cost stops being route-acceptable.
