# Posts and MDX Content

## Content Architecture

Articles are repository-owned `.md` or `.mdx` files directly under `content/articles/`. The filename without extension is the route slug. `lib/content.ts` synchronously reads and validates files with `gray-matter` and Zod. The tutorial routes render list, category, and article pages through the App Router.

| Path | Responsibility |
| --- | --- |
| `lib/content.ts` | Categories, schema, parsing, draft filtering, sorting, reading time, related/adjacent queries |
| `lib/format.ts` | Traditional Chinese UTC date formatting |
| `app/tutorial/page.tsx` | Article index at `/tutorial` |
| `app/tutorial/category/[category]/page.tsx` | Static category pages |
| `app/tutorial/[slug]/page.tsx` | Metadata, JSON-LD, MDX rendering, and article navigation |
| `components/articles/ReadingProgress.tsx` | Client scroll progress indicator |
| `components/mdx/index.ts` | MDX component registry |

The tutorial index and category headers begin `0.5rem` below `--header-height` on both desktop and mobile. Category headers match the index layout, without a decorative numeric marker or category-index label; the active category uses the same text and red-bottom-rule treatment as ALL.
| `app/sitemap.ts` | Static/category/article URL entries |
| `app/rss.xml/route.ts` | Force-static RSS 2.0 feed |

## Frontmatter Contract

```yaml
---
title: 'Required non-empty title'
description: 'Required non-empty summary'
date: '2026-08-30'
updated: '2026-09-01'       # optional
category: tutorial          # tutorial | news | showcase
tags: ['exposure']          # optional, defaults to []
cover: '/images/example.webp' # optional
coverAlt: 'Description'     # optional
draft: false                # optional, defaults to false
author: 'NEHS Photography Club' # optional, defaults to NEHS 攝影社
---
```

`date` and `updated` accept strings or YAML Date values. Date objects normalize to `YYYY-MM-DD`, but arbitrary strings are not rejected as invalid dates. Cover existence and cover-alt pairing are not validated. Tags are not required to be unique/nonempty. Use ISO `YYYY-MM-DD` dates and URL-safe unique filenames to preserve sorting, formatting, RSS, and route generation.

Invalid frontmatter logs `[content] Skipping <file>: invalid frontmatter` and silently removes the article rather than failing the build. MDX compilation errors can still fail rendering/building. This loose runtime behavior is deliberate defense-in-depth only: the build-time validator in `scripts/validate_articles.ts` fails fast instead (see Validation below), and `npm run build` never ships invalid content because `prebuild` runs the validator first.

## Editor Defaults Versus Runtime Defaults

Two defaults coexist; do not conflate them:

- Runtime/file default (`lib/content.ts`, `lib/content-contract.ts`): `tags` defaults to `[]`, `draft` defaults to `false`, `author` defaults to `NEHS 攝影社`. A hand-written file that omits `draft` publishes on the next green build.
- Keystatic new-entry default (`keystatic.config.ts`): the editor creates entries with `draft: true` and `author: 'NEHS 攝影社'`. A browser-created article stays a draft until an editor explicitly clears the checkbox.

The strict validator accepts both `draft` values; only the website surfaces decide visibility.

## Categories

`CATEGORIES` in `lib/content.ts` is the source of truth:

| ID | Label | Purpose |
| --- | --- | --- |
| `tutorial` | 攝影教學 | 各類教學文章，覆蓋不同程度。 |
| `news` | 社團動態 | 活動記錄、招新資訊與作品回顧。 |
| `showcase` | 3D 展示 | Interactive model or spatial demonstrations |

Changing this array affects schema validation, static category params, labels, filters, sitemap entries, and descriptions. Update all related documentation and manually inspect each generated category route.

## Drafts, Sorting, and Queries

Draft inclusion defaults to `NODE_ENV !== 'production'`. Development lists and article lookup include drafts; production excludes them. Five website surfaces exclude drafts, each by an explicit `false` argument or production guard — never by convention:

1. Article route static params (`app/tutorial/[slug]/page.tsx` calls `getAllArticles(false)`).
2. Article lookup (`getArticle` returns null for drafts when `NODE_ENV === 'production'`; development renders them with a `/ DRAFT` marker).
3. Tutorial index (`app/tutorial/page.tsx`, development-only draft marker).
4. Category pages (`app/tutorial/category/[category]/page.tsx`, development-only draft marker).
5. Discovery feeds (`app/sitemap.ts` and `app/rss.xml/route.ts` both call `getAllArticles(false)`).

There is no publication scheduling; future-dated non-drafts publish immediately.

Keystatic editing semantics: the editor works on `preview/<github-username>` branches created through its native branch dialog (scoped to `preview/` by `branchPrefix`; the username itself stays a convention the editor types). A save commits to the preview branch; typing alone does not write the content file (no autosave-on-keystroke). New entries default to `draft: true`. Publishing means opening a pull request against `main` and self-merging with squash after a green Vercel build — `main` is branch-protected with no required approvals, and merged head branches auto-delete. Full GitHub steps live in the branch protection runbook (`technical-stack.md` deployment section). The repository is public, so every committed draft is publicly readable on GitHub even while website routes exclude it — drafts are unpublished, never confidential. Concurrent edits to the same file can conflict; later saves win and conflicts are resolved in Git. Rollback is by Git revert of the commit or by redeploying a previous successful Vercel deployment. Renaming a slug is delete-plus-create with no automatic redirect (the old URL 404s).

The articles collection sets the supported `previewUrl: '/tutorial/{slug}'` (current published route for editor navigation). In-editor component previews use the existing `EditorFigurePreview` via the Figure `block()` `ContentView`; public pages never read GitHub at runtime. The one deliberate exception is the client-side branch preview at `/preview?slug=X&branch=preview/yyy` (noindex, off sitemap/nav/robots-allow, version-locked to the production MDX pipeline) — see ADR-0006; deep documentation stays with that ADR and its consistency spec.

Articles sort descending by lexicographic date. ISO dates work correctly; arbitrary strings do not. Equal dates have no explicit tie-breaker. Adjacent navigation crosses categories and can include drafts in development. `getRelatedArticles` prioritizes same-category articles but is currently unused by the UI.

Reading time counts CJK characters at 400/minute and Latin tokens at 220/minute, rounds, and enforces a one-minute minimum. It scans raw MDX, so code, JSX attributes, and URLs can affect the estimate.

## Routes and Rendering

`/tutorial` and category pages render editorial card grids. The first result receives a wider desktop treatment. Grid columns change from three to two to one. Cover images render through the `TutorialCover` component (`components/articles/TutorialCover.tsx`): covers pointing at generated families get AVIF/WebP `srcset` with card-appropriate `sizes` (lazy/async, alt falls back to the title); other paths keep the previous plain lazy `<img>`. Missing covers render an `NEPC` placeholder.

`/tutorial/category/[category]` statically generates the three known category IDs and 404s unknown IDs. Its category-specific metadata currently lacks an explicit canonical. `params` is a Promise and must be awaited under Next 16 conventions.

`/tutorial/[slug]` statically enumerates non-draft slugs, retrieves the article, 404s missing/production drafts, emits article and breadcrumb JSON-LD, renders metadata/lead image (eager `TutorialCover`)/body, and links globally newer/older articles. It does not set `dynamicParams = false`. The optional cover is rendered without a decorative `Lead image / 001` label.

The detail page displays category, draft marker, title, description, published date, reading time, author, optional cover, MDX body, and adjacency. Tags, `updated`, related articles, table of contents, and author biography are not displayed in the body UI even though some feed/metadata surfaces consume them.

## MDX Pipeline

`next-mdx-remote/rsc` renders trusted repository content with:

- `remark-gfm` for GitHub-flavored Markdown;
- `rehype-slug` for heading IDs;
- `rehype-autolink-headings` with `behavior: 'wrap'` for self-linked headings.

There is no syntax highlighter, table of contents generator, or sanitization plugin. MDX is executable trusted source and must not be opened to untrusted authors without a security design.

Registered components:

### Figure

```mdx
<Figure
  src="/images/generated/contact-800.webp"
  alt="Required meaningful description"
  caption="Optional caption"
  width={800}
  height={600}
/>
```

`Figure` renders semantic figure/caption markup and a lazy, async native image. `src` and `alt` are required; dimensions are optional but should be supplied to reduce layout shift.

### Callout

```mdx
<Callout type="warning" title="Optional title">
  Content can contain Markdown and MDX.
</Callout>
```

`type` is `note`, `tip`, or `warning`, defaulting to `note`. It renders an `aside`; warning uses red while note/tip use blue.

### MDXLink

Ordinary Markdown links map to `MDXLink`. `http`, `https`, and `mailto` are treated as external and receive `_blank` plus `noopener noreferrer`; all others use Next `Link`. `tel`, protocol-relative, and other schemes are not classified as external. Explicit MDX props are spread late and can override target/rel, so content remains trusted.

### Model3D

`Model3D` embeds a lazy GLB viewer. Its complete API, pipeline, and limitations are documented in [3D Model Preview](./model-preview.md).

### Editor GFM Limits

The Keystatic MDX field (`keystatic.config.ts` `content` field `options`) enables exactly: bold, italic, strikethrough, code, headings 2–4 (H1 is reserved for the title field), blockquote, ordered and unordered lists, tables, links, dividers, code blocks, and images (uploaded into `assets/articles/` with the same Figure naming). Anything outside this set must be plain Markdown or one of the three blocks above; the editor cannot insert raw HTML, custom JSX, or unregistered components.

## Validation (Fail-Fast)

`npm run content:validate` (`tsx scripts/validate_articles.ts`, also the first half of `prebuild`) enforces the strict contract in `lib/content-contract.ts` and exits 1 with `slug:line: rule` messages on any failure. Groups:

1. Enumeration: `content/articles/*.{md,mdx}` must be non-empty; slugs must be URL-safe (`SLUG_RE`: lowercase alphanumerics joined by `-`/`_`); duplicate slugs across `.md`/`.mdx` fail.
2. Frontmatter: strict Zod schema — non-empty title/description, ISO `YYYY-MM-DD` real calendar dates (rejects shape errors and rollovers such as `2026-02-30`; quoted YAML dates recommended), category allowlist, trimmed unique non-empty tags, cover/coverAlt pairing (both absent or both non-empty; alt at least 4 characters).
3. Filesystem/media: covers and Figure `src` must live under `/images/generated/articles/<slug>/` with an image extension, backed by a versioned source under the mirrored `assets/articles/<slug>/` path (source existence is required; generated-derivative existence is not, because `prebuild` validates before generating). `Model3D` `src` must be an existing `/models/opt/*.glb`; `Model3D` `poster` must be an existing text path under `/images/generated/`. There is no legacy exception: migration is complete and every legacy path fails.
4. Body scan: Figure requires `src`, meaningful `alt`, and paired positive-integer `width`/`height`; `Model3D` requires `src` and meaningful `alt`; raw `<img>` (especially external) fails; unknown MDX components fail; the body must compile under `@mdx-js/mdx`.
5. Cross-surface parity: `getAllArticles`, sitemap, RSS, and `formatDate` must agree on the same article set and dates.

## Article Images (Editor-Managed)

Sources are tracked versioned originals under `assets/articles/<entry-slug>/`; generated derivatives under `public/images/generated/articles/` plus the manifest `public/images/generated/articles.manifest.json` are gitignored build artifacts regenerated at prebuild/dev time (see `technical-stack.md`).

- Cover: the top-level `cover` image field writes `cover.<ext>` under the entry slug directory and serializes `/images/generated/articles/<slug>/cover.jpg` (field-key forcing; `transformFilename` is a documented no-op there by Keystatic design).
- Figure: images uploaded inside the MDX editor use the uuid-collision-safe `figureTransformFilename` (`<uuid>-<sanitized-basename><ext>`) and serialize `/images/generated/articles/<slug>/<uuid>-<base>.jpg`.
- `Model3D.poster` stays a plain text path (no upload); point it at a committed `/images/generated/` family image or a managed article derivative.
- Budget and types: 8 MiB per source (`ARTICLE_IMAGE_MAX_BYTES`, enforced pre-Sharp with a warning skip); input allowlist `.jpg/.jpeg/.png/.webp/.avif` only — SVG, RAW, TIFF, PSD, HEIC, video, and GLB uploads are rejected with a warning. Symlinks are never followed; traversal escapes are skipped.
- Alt text is required everywhere it matters: cover/coverAlt pairing, Figure `alt`, `Model3D` `alt` (minimum 4 meaningful characters each, enforced by the validator).
- Generation: `scripts/optimize_article_images.js` mirrors each source 1:1 to a fallback at the exact serialized path plus non-upscaled 640/1280/1920 AVIF/WebP derivatives (hero Sharp params verbatim), records measured widths in the atomic manifest, and skips unchanged sources (mtime + size). `TutorialCover` and `Figure` derive `srcset` from the manifest — no hardcoded width table, so new slugs are responsive by construction. Orphan pruning is opt-in (`--prune`, default off).
- Prebuild (`content:validate` then `images:articles`) runs before every `npm run build`; the dev launcher (`npm run dev`, `npm run admin:dev`) generates once at startup and watches `assets/articles/` (debounced, serialized, node:fs only).

The two shipped articles (`example`, `exposure_and_brightness`) are fully migrated: covers and Figures point at managed paths and their versioned sources are SHA-256 byte-identical to the club originals `assets/sources/hero-1.jpg` and `assets/sources/contact-bg.jpg` (see `LICENSING.md`).

## Trust Model

MDX is trusted executable source rendered without sanitization: only GitHub identities with repository write access may author content, and there is no sandbox, no role narrower than repo write, and no required-approvals gate — merging a `preview/*` pull request (self-merge allowed) plus a green build publishes. Never grant write access to untrusted authors, and never render untrusted Markdown through this pipeline without a new security design (see ADR-0003 revisit triggers).

## Dates and Metadata

`formatDate` appends midnight UTC and formats with `Intl.DateTimeFormat('zh-TW')`, avoiding local rollover. Invalid accepted dates can still cause format errors or invalid RSS dates.

Article metadata includes title, description, author, tag keywords, canonical URL, Open Graph article type, published/modified timestamps, authors/tags, and optional cover. Article JSON-LD includes publisher, language, dates, canonical page, category ID, comma-joined tags, and optional image. Breadcrumb JSON-LD contains Home, Tutorial, and the article.

`JsonLd` serializes repository-controlled data with `JSON.stringify` into `dangerouslySetInnerHTML`. If frontmatter ever becomes untrusted, `<`/`</script>` escaping must be added.

## Sitemap, RSS, and Robots

`app/sitemap.ts` emits static pages, all categories, and all non-draft articles. Article `lastModified` uses `updated ?? date`.

`app/rss.xml/route.ts` is `force-static` and emits RSS 2.0 with escaped title, description, and category label. It includes canonical link/GUID and publication date, but not full MDX, updated date, author, images, or all tags. `app/robots.ts` allows crawling and points to the sitemap; it does not protect drafts.

## Authoring Workflow

Two paths, same contract:

**A. Browser editor (preferred for non-developers).** Open `/admin`, read the eight guide blocks and the public-draft aside, follow the link into `/keystatic`, and sign in with a GitHub account that holds repository write access. Create or open an `Articles` entry and fill the structured fields (title, description, ISO date, optional updated date, category, tags, cover plus coverAlt, draft checkbox, author default `NEHS 攝影社`). Write the body with GFM plus only the `Figure`, `Callout`, and `Model3D` blocks (see Editor GFM Limits). Upload images through the image fields — files land versioned under `assets/articles/<slug>/`. Keep `draft: true` while developing. Save explicitly (typing never autosaves); the save commits to the current `preview/<github-username>` branch, so create that branch through the editor's branch dialog before editing.

**B. Hand editing.** Copy `content/articles/example.mdx` to `content/articles/<url-safe-slug>.mdx` and replace its sample content. Add valid frontmatter using an ISO date and supported category. Use standard Markdown/GFM and only registered MDX components. Place source images under `assets/articles/<slug>/` using the same naming (`cover.<ext>`, `<uuid>-<base>.<ext>`), and reference the `/images/generated/articles/<slug>/` paths.

Then, for both paths:

1. Run `npm run content:validate` (fail-fast; fix every `slug:line: rule` error).
2. Run `npm run images:articles` (or rely on `prebuild`/dev-watcher) so serialized paths resolve.
3. Set `draft: false` to publish, then open a pull request from the preview branch and self-merge with squash after a green Vercel build (no approvals required; heads auto-delete).
4. Run `npm run build`.
5. Verify the index, category, detail route, mobile cards/body, heading anchors, image alternatives, metadata, `/sitemap.xml`, and `/rss.xml`. The `/admin` gateway documents preview-branch creation, save-versus-release, public-draft visibility, rollback, slug-rename, and concurrency handling.

The normal build does not run the non-article image or model optimization. Run `npm run images:build` or `npm run models:build` first when those source assets change.

## Article License

Articles are released under CC BY-SA 4.0. The detail route renders a license
notice in the article footer and carries `license` in Article JSON-LD. Keep
both when changing the article footer or structured data.

## Accessibility and Security Checklist

- Require useful `coverAlt`, `Figure.alt`, and `Model3D.alt` even where schema does not enforce them.
- Keep meaningful media distinct from decorative placeholders.
- Add accessible labels/current state when modifying category filters.
- Ensure wide GFM tables remain usable on mobile; current article styling has no dedicated overflow wrapper.
- Do not render untrusted MDX or frontmatter through the current pipeline.
- Preserve `noopener noreferrer` on external browsing contexts.
- Test article keyboard flow, heading links, captions, code blocks, tables, and model fallback.

## Change Checklist

- Update this file for schema, editor defaults, category, draft, date, route, card/detail, plugin, component, GFM option, validation rule, media path/budget, trust, metadata, RSS, sitemap, or authoring changes.
- Keep route metadata and public discovery surfaces synchronized.
- Verify production draft exclusion separately from development visibility.
- Run `npm run content:validate` before `npm run build` and inspect errors for skipped content.
