# ADR-0005: Add narrow content and admin quality gates

## Status

Accepted

**Supersedes:** [ADR-0002](0002-production-build-only-quality-gate.md) — narrow, adds content-contract + admin browser checks only. npm run build remains the release gate.

## Date

2026-09-30

## Involved

NEHS Photography Club site maintainers, trusted article editors

## Context

ADR-0002 keeps `npm run build` as the only automated check. The Git-backed editor adds behavior a build cannot prove: invalid frontmatter is currently warned then silently skipped, and browser auth, editor CRUD, draft publication, and discovery-surface inclusion are invisible to TypeScript. The club needs proof that bad content fails loudly and the admin cannot silently lose or publish it.

## Decision

Add `pnpm test:content` (run with `tsx`: Zod plus `@mdx-js/mdx` compilation, failing fast instead of the current `[content] Skipping` warning) and `pnpm test:admin` (`@playwright/test@1.63.0` loopback CRUD, draft absence and publication inclusion across article route, index, category, sitemap, and RSS, auth negatives, desktop `1440x1000` plus mobile `390x844` plus keyboard flow, and public-bundle isolation). `npm run build` stays the sole release gate; the new checks cover only content and admin behavior.

## Scope and Impact

- **Applies to:** article content contract and admin browser behavior only.
- **Does not apply to:** repo-wide lint, formatting, unit-test rollout, or any other route. No new gate may block release except `npm run build`.
- **Constraints:** new tooling must stay scoped to what the build cannot prove; keep the verification baseline in `docs/README.md` accurate.

## Alternatives Considered

- **Build-only QA:** rejected. A green build cannot prove browser auth behavior, editor round-trips, draft exclusion, or discovery-surface inclusion, so silent skips and broken logins would reach review undetected.
- **Full ESLint, Prettier, and Vitest rollout:** rejected per the ADR-0002 cost rationale. Maintaining a repo-wide harness still costs more than the bugs it would catch on this small site, and most regressions here stay visual.

## Consequences

Invalid articles fail with path-specific errors instead of vanishing silently, and editor regressions get caught before release. The cost is two small harnesses to maintain plus Playwright install time in CI and local runs.

## Revisit Triggers

Supersede with a new ADR if the harness costs more than it catches, if the first production regression proves a broader lint rollout is needed, or if a second regular contributor onboards.
