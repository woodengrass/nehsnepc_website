# ADR-0002: Production build as the only automated quality gate

## Status

Accepted

## Date

2026-09-18

## Context

A standard Next.js project ships ESLint, a formatter, and at least smoke tests. This repo has none of those: no lint, formatter, unit, integration, end-to-end, or standalone type-check scripts. The production build (`next build`, including its TypeScript pass) is the only automated check; everything else is manual under the verification baseline in `docs/README.md`.

## Decision

Keep it that way. Do not introduce a lint/test toolchain; rely on `npm run build` plus the manual pre-deploy checklist (desktop and mobile inspection, keyboard, `prefers-reduced-motion`, real-browser WebGL/model checks where relevant).

## Scope and Impact

- **Applies to:** repo-wide workflow; every change must pass `npm run build` and the applicable manual checks before deploy.
- **Does not apply to:** ad-hoc local scripts under `scripts/`, which run manually and are not gated.
- **Constraints introduced:** no new quality-gate tooling without superseding this ADR; keep the verification baseline in `docs/README.md` accurate.
- **Implementation details:** see Verification Baseline in `docs/README.md` and Commands in `docs/technical-stack.md`.

## Alternatives Considered

- **Standard toolchain (ESLint + Prettier + Vitest + Playwright):** tempting (convention, safety net), rejected ??solo photography-club site; maintaining the harness would cost more than the bugs it would catch, and most regressions here are visual, which only human eyes catch.

## Consequences

Fast iteration with zero harness maintenance; the cost is discipline ??a skipped manual checklist is the only net, and visual/GPU behavior can only be verified by a person in a real browser.

## Revisit Triggers

The first regression that reaches production and would have been caught by lint or tests, or onboarding a second regular contributor ??supersede with a new ADR.
