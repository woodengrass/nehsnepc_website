# ADR-0001: Commit pre-generated image variants

## Status

Accepted

## Date

2026-09-18

## Context

Vercel builds the production site directly from this GitHub repo. Responsive image variants (AVIF/WebP under `public/images/generated/`) could either be committed or generated during the Vercel build via `npm run images:build` (Sharp).

## Decision

Commit the generated variants. The Vercel build stays a plain `next build` with no native-module image step, no extra build minutes, and no dependency on Sharp working in the build image.

## Scope and Impact

- **Applies to:** asset pipeline (`scripts/optimize_images.js`), deployment (Vercel from GitHub), repo hygiene.
- **Does not apply to:** source images (`assets/sources/`, `assets/satellites/`), model pipeline.
- **Constraints introduced:** after changing sources under `assets/`, run `npm run images:build` and commit the regenerated output; never reference `assets/` from runtime code.
- **Implementation details:** see `docs/technical-stack.md` and the Commands section of `AGENTS.md`.

## Alternatives Considered

- **Generate during the Vercel build:** tempting (lean repo), rejected ??adds a Sharp native dependency and minutes to every build, plus a new failure mode in the deploy path.

## Consequences

The repo carries dozens of committed binary variants; builds are deterministic and independent of the image toolchain.

## Revisit Triggers

If the deploy pipeline stops building from this repo, or Vercel build minutes and native modules stop being a concern ??supersede with a new ADR.
