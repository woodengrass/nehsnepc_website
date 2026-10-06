# Posts and MDX Content

Implementation source of truth is the code at `content/articles/`, `app/tutorial/`, `lib/content.ts`, `lib/content-contract.ts`, `lib/format.ts`, `components/mdx/`, `components/articles/TutorialCover.tsx`, `keystatic.config.ts`, and `scripts/validate_articles.ts`. Frontmatter fields, category values, query code, plugin lists, component props, validator groups, and image naming live there and are not repeated here. This document records only decisions, external contracts, history, and the runbook a maintainer cannot derive from code.

## Decisions

Articles are repository-owned files. Every content change requires a rebuild: non-draft routes are enumerated at build time, and public pages never read GitHub at runtime. The runtime reader keeps warn-skip as defense in depth, but `prebuild` runs the validator first so invalid content fails the build instead of vanishing silently.

Drafts are unpublished, never confidential. The repository is public, so every committed draft is world-readable on GitHub while five website surfaces (article route, index, category pages, sitemap, RSS) exclude it. Never write non-public information into any article, draft or not.

MDX is trusted executable source rendered without sanitization. Only repository writers may author content. Never grant write access to untrusted authors and never render untrusted Markdown through this pipeline without a new security design (see ADR-0003 revisit triggers).

Two draft defaults coexist by design: hand-written files default to published, while Keystatic new entries default to draft. Publishing means a pull request from a `preview/<github-username>` branch with squash self-merge after a green Vercel build. Renaming a slug is delete-plus-create with no redirect; the old URL 404s. Rollback is Git revert or redeploy of a prior Vercel deployment.

Article images are editor-managed: versioned sources under `assets/articles/` are tracked in Git, while generated derivatives plus the manifest are gitignored build artifacts regenerated at prebuild and dev time. The client-side branch preview at `/preview` is version-locked to the production MDX pipeline (see ADR-0006).

Articles release under CC BY-SA 4.0. The detail route carries the license notice and structured-data license together.

## External Contracts

GitHub branch protection and the Vercel build are the publication gate: `main` protection plus green-build self-merge is configured on the GitHub and Vercel side, not in this repo. Full steps live in [Technical Stack](./technical-stack.md). The `/admin` gateway page is the editor training surface.

## History

Legacy article media paths were fully migrated to managed `/images/generated/articles/<slug>/` paths; every legacy path now fails validation. The two earliest articles reuse club originals byte-identically (see `LICENSING.md`).

## Runbook

Two paths, same contract. Browser editor: open `/admin`, follow into `/keystatic` with repository write access, create the `preview/<github-username>` branch through the editor dialog, fill structured fields, write with GFM plus only the registered blocks, upload through image fields, save explicitly (typing never autosaves), keep draft while developing, then pull request and self-merge after green build. Hand editing: copy the example article to a URL-safe slug, use valid frontmatter and registered components only, place sources under `assets/articles/<slug>/`, then run validation, generate images, set draft false to publish, pull request, and verify index, category, detail, mobile, heading anchors, metadata, sitemap, and RSS.

## Change Rule

Update this document only for decision-affecting changes: content ownership, draft and trust policy, publication flow, validation philosophy, media sourcing model, or licensing. Schema values, category labels, plugin names, component props, validator rules, or naming patterns need no doc update.
