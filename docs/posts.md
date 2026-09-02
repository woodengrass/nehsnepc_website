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

Invalid frontmatter logs `[content] Skipping <file>: invalid frontmatter` and silently removes the article rather than failing the build. MDX compilation errors can still fail rendering/building.

## Categories

`CATEGORIES` in `lib/content.ts` is the source of truth:

| ID | Label | Purpose |
| --- | --- | --- |
| `tutorial` | 攝影教學 | 各類教學文章，覆蓋不同程度。 |
| `news` | 社團動態 | 活動記錄、招新資訊與作品回顧。 |
| `showcase` | 3D 展示 | Interactive model or spatial demonstrations |

Changing this array affects schema validation, static category params, labels, filters, sitemap entries, and descriptions. Update all related documentation and manually inspect each generated category route.

## Drafts, Sorting, and Queries

Draft inclusion defaults to `NODE_ENV !== 'production'`. Development lists and article lookup include drafts; production excludes them. `generateStaticParams`, sitemap, and RSS explicitly call `getAllArticles(false)`, so drafts are never emitted there. There is no publication scheduling; future-dated non-drafts publish immediately.

Articles sort descending by lexicographic date. ISO dates work correctly; arbitrary strings do not. Equal dates have no explicit tie-breaker. Adjacent navigation crosses categories and can include drafts in development. `getRelatedArticles` prioritizes same-category articles but is currently unused by the UI.

Reading time counts CJK characters at 400/minute and Latin tokens at 220/minute, rounds, and enforces a one-minute minimum. It scans raw MDX, so code, JSX attributes, and URLs can affect the estimate.

## Routes and Rendering

`/tutorial` and category pages render editorial card grids. The first result receives a wider desktop treatment. Grid columns change from three to two to one. Cover images are native lazy/async `<img>` elements without generated `srcset`, explicit dimensions, or Next Image processing. Missing covers render an `NEPC` placeholder.

`/tutorial/category/[category]` statically generates the three known category IDs and 404s unknown IDs. Its category-specific metadata currently lacks an explicit canonical. `params` is a Promise and must be awaited under Next 16 conventions.

`/tutorial/[slug]` statically enumerates non-draft slugs, retrieves the article, 404s missing/production drafts, emits article and breadcrumb JSON-LD, renders metadata/lead image/body, and links globally newer/older articles. It does not set `dynamicParams = false`. The optional cover is rendered without a decorative `Lead image / 001` label.

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

## Dates and Metadata

`formatDate` appends midnight UTC and formats with `Intl.DateTimeFormat('zh-TW')`, avoiding local rollover. Invalid accepted dates can still cause format errors or invalid RSS dates.

Article metadata includes title, description, author, tag keywords, canonical URL, Open Graph article type, published/modified timestamps, authors/tags, and optional cover. Article JSON-LD includes publisher, language, dates, canonical page, category ID, comma-joined tags, and optional image. Breadcrumb JSON-LD contains Home, Tutorial, and the article.

`JsonLd` serializes repository-controlled data with `JSON.stringify` into `dangerouslySetInnerHTML`. If frontmatter ever becomes untrusted, `<`/`</script>` escaping must be added.

## Sitemap, RSS, and Robots

`app/sitemap.ts` emits static pages, all categories, and all non-draft articles. Article `lastModified` uses `updated ?? date`.

`app/rss.xml/route.ts` is `force-static` and emits RSS 2.0 with escaped title, description, and category label. It includes canonical link/GUID and publication date, but not full MDX, updated date, author, images, or all tags. `app/robots.ts` allows crawling and points to the sitemap; it does not protect drafts.

## Authoring Workflow

1. Copy `content/articles/example.mdx` to `content/articles/<url-safe-slug>.mdx` and replace its sample content.
2. Add valid frontmatter using an ISO date and supported category.
3. Use standard Markdown/GFM and only registered MDX components. The template demonstrates headings, blockquotes, `Callout`, `Figure`, tables, and `Model3D` usage.
4. Put referenced assets under `public/`; generated article families require explicit additions to the image optimization script.
5. Keep `draft: true` while developing, then remove/set false to publish.
6. Run `npm run build`.
7. Verify the index, category, detail route, mobile cards/body, heading anchors, image alternatives, metadata, `/sitemap.xml`, and `/rss.xml`.

The normal build does not run image or model optimization. Run `npm run images:build` or `npm run models:build` first when their source assets change.

## Accessibility and Security Checklist

- Require useful `coverAlt`, `Figure.alt`, and `Model3D.alt` even where schema does not enforce them.
- Keep meaningful media distinct from decorative placeholders.
- Add accessible labels/current state when modifying category filters.
- Ensure wide GFM tables remain usable on mobile; current article styling has no dedicated overflow wrapper.
- Do not render untrusted MDX or frontmatter through the current pipeline.
- Preserve `noopener noreferrer` on external browsing contexts.
- Test article keyboard flow, heading links, captions, code blocks, tables, and model fallback.

## Change Checklist

- Update this file for schema, category, draft, date, route, card/detail, plugin, component, metadata, RSS, sitemap, or authoring changes.
- Keep route metadata and public discovery surfaces synchronized.
- Verify production draft exclusion separately from development visibility.
- Run `npm run build` and inspect warnings for skipped content.
