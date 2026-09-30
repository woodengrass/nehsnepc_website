# ADR-0004: Generate editor-managed article image derivatives at build time

## Status

Accepted

**Supersedes:** [ADR-0001](0001-commit-generated-image-variants.md) — partial, editor-managed article images only. All other families remain under ADR-0001.

## Date

2026-09-30

## Involved

NEHS Photography Club site maintainers, trusted article editors

## Context

ADR-0001 commits pre-generated AVIF/WebP variants and keeps Sharp out of the Vercel build. That works for hand-maintained hero, contact, logo, exposure, and satellite families. A production Keystatic save cannot run the local Sharp-and-commit workflow, so editor-uploaded article images need a zero-touch path that still preserves type, size, and alt-text discipline.

## Decision

Version editor sources under `assets/articles/<slug>/` (`cover.<ext>` for covers, UUID-prefixed names via the proven `transformFilename` for Figures) and generate AVIF, WebP, and fallback derivatives under `public/images/generated/articles/` during prebuild. Emit 640, 1280, and 1920 widths with no upscaling, write the measured-width manifest atomically, and derive `srcset` from it. Generated article outputs are gitignored build artifacts. Enforce the 8 MiB source limit plus type, traversal, and alt-text validation at the repository and build layer. Retain committed variants and `images:build` behavior for every other family.

## Scope and Impact

- **Applies to:** editor-managed article images only (`assets/articles/` sources, `public/images/generated/articles/` outputs, the article prebuild step).
- **Does not apply to:** hero, contact, logo, exposure, and satellite families, which stay committed per ADR-0001; model pipeline; public article rendering.
- **Constraints:** article sources are versioned while article derivatives are not; Figure filenames must stay collision-safe; alt text stays mandatory.

## Alternatives Considered

- **Extend the ADR-0001 workflow to articles:** rejected. A production editor save has no local checkout to run Sharp in and commit results from, so the workflow would block every browser save on manual tooling.
- **External DAM:** rejected. A hosted asset manager is overweight for a small article corpus and would split the Git-as-source-of-truth model the editor decision depends on.
- **RAW, GLB, video, or SVG uploads:** out of scope. These formats need library, viewer, or sanitizer work the club has not asked for, so the editor refuses them.

## Consequences

Browser saves stay zero-touch and article derivatives stay reproducible from versioned sources. The cost is build minutes and a new prebuild failure mode scoped to article images, plus a split policy the team must remember: article outputs regenerate, everything else stays committed.

## Revisit Triggers

Supersede with a new ADR if prebuild generation becomes too slow or non-deterministic, if a DAM becomes mandatory, or if Vercel build minutes cease to matter.
