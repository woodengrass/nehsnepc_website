# Technical Stack and Operations

Implementation source of truth is the code and config at `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `.env.example`, `keystatic.config.ts`, `lib/keystatic/storage.ts`, `app/api/keystatic/[...params]/route.ts`, `app/keystatic/layout.tsx`, `scripts/`, `app/sitemap.ts`, `app/robots.ts`, `app/rss.xml/route.ts`, and `vercel.json`. Exact versions, command flags, route tables, validation rules, pipeline parameters, and metadata code live there and are not repeated here. This document records only decisions, external contracts, history, and runbooks a maintainer cannot derive from code.

## Decisions

Server Components are the default; client components exist only around browser behavior. Before changing framework APIs, read the installed guide under `node_modules/next/dist/docs/`. Deployment is a normal Next application, not a pure static export.

The production build is the sole release gate. There are no lint, formatter, or standalone typecheck scripts. Content and admin gates cover only what the build cannot prove (see ADR-0005). Browser interaction and external-service behavior require manual testing.

Keystatic GitHub mode is fail-closed by design: preview disables the surface entirely, missing or short secrets answer redacted 503 naming names only, wrong repo answers mismatch, and non-canonical origins answer redacted 403 or safe redirect without reflecting the request host. The browser bundle reads `process.env` directly with no helper indirection so public values inline correctly. Keystatic code must never enter public bundles; the `test:admin` gate asserts that isolation.

Content is not a runtime CMS: articles are read synchronously at build time and every content change requires a rebuild. Public pages never read GitHub at runtime.

Non-article image outputs are committed; article derivatives plus the manifest are gitignored build artifacts. Neither the non-article pipeline nor model optimization runs inside `npm run build`. Release sequence: `pnpm install --frozen-lockfile`, `npm run content:validate`, `pnpm test:content`, `pnpm test:admin`, `npm run build`.

## External Contracts

Third-party browser services: Google Fonts (runtime typography dependency), Web3Forms plus hCaptcha (contact submission and challenge; provider owns acceptance, quota, retention, deliverability), `ipwho.is` (automatic About lookup), Instagram (external links). The only first-party API is the Keystatic route handler. There is no other first-party database, analytics, or form backend.

Historical note: the previous contact form was a Tally embed (form `NpRGgl`). Tally is decommissioned as of 2026-10-06 following successful production verification of the Web3Forms replacement; rollback is no longer available. Stored Tally responses were never migrated. The ID is recorded here only so a maintainer can identify the legacy form. Full retirement record lives in [Contact](./contact.md).

Node.js `>=20.9.0` is required. The tracked lockfile with the pinned package manager is the reproducible-install contract.

## Environment and Deploy Runbook

`.env.example` holds placeholders only, never real secrets. Copy it to `.env.local` (gitignored) and fill values from the GitHub App plus Vercel project settings. The contact key (`NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY`) is a public routing identifier inlined at build time: set it in the Vercel production environment and redeploy; blank keeps the safe email fallback. Never set `NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE` on Vercel. Never commit real keys.

Vercel is Git-triggered: every push to `main` rebuilds, and a failed build leaves the prior deployment serving. Publish intent takes effect only after a green build. `vercel.json` holds only permanent migration redirects; preserve them unless legacy URLs are intentionally retired. There is no Deploy Hook: rebuilds come from Git pushes only.

Branch protection is a MANUAL GitHub-side switch (code side ready, switch not flipped by code): protect `main`, require pull requests with zero required approvals for self-merge, squash as default with head auto-delete, and bypass list for designated admins for typo fixes only. Editors work on `preview/<github-username>` branches created through the editor dialog. Confirm live: direct push rejected for non-bypass accounts, self-merge works, heads auto-delete, preview deployments appear, bypass still works for listed admins.

GitHub App creation is MANUAL and done once: create a GitHub App (or run the guided flow from `/keystatic`), register BOTH apex and www OAuth callback URLs under the fixed handler path, copy client ID, secret, and public App slug into local and Vercel env, and verify live login lists the articles collection. Record the result in evidence, never mark green without performing it.

Normal dev uses GitHub mode with no local writes. Loopback admin is `127.0.0.1` only, never beyond loopback, never in production or preview.

Secret rotation: set new values in Vercel production env first, then local copies, redeploy, and re-verify login. Rotation invalidates existing sessions; editors sign in again. Old secrets are deleted, never logged.

Onboarding is repository write access plus `/admin` training (preview branches, save-commits-to-branch, squash self-merge, draft defaults, public-draft disclosure). Offboarding is revoking write access; committed content remains in Git history by design.

Recovery: revert the Keystatic commit or redeploy the prior green Vercel deployment. The `/admin` page shows no commit or deployment status by design; use GitHub and the Vercel dashboard.

Public drafts are world-readable on GitHub by design. Never write non-public information into any article.

## Known Operational Gaps

No CI, lint, formatter, explicit typecheck script, or asset-path validation. No checked-in Node version file. No automated image or model budgets outside the article validator. External font, form, and geolocation dependencies. No security headers or CSP in Next or Vercel config. Incomplete IDE and build artifact ignores. Non-article pipelines do not remove stale output. The Vercel project dashboard URL is not recorded in the repo.

## Change Rule

Update this document only for decision-affecting changes: dependencies with version-sensitive behavior, build and gate philosophy, environment contract, external services, redirects, deployment model, or runbook steps. Version bumps without behavior change, flag details, table values, or code-mirroring edits need no doc update.
