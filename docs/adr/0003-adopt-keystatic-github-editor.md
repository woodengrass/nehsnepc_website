# ADR-0003: Adopt Keystatic GitHub mode as the article editor

## Status

Accepted (amended 2026-10-01 — see Amendment below; original decision text preserved with supersession notes, never silently rewritten)

## Date

2026-09-30

## Involved

NEHS Photography Club site maintainers, trusted article editors

## Amendment 2026-10-01: protected `main` plus preview-branch workflow

WHAT changed: the direct-to-`main` save workflow (struck through below, kept readable for history) is replaced by a protected-`main` plus preview-branch workflow. Editors create a `preview/<github-username>` branch through Keystatic's native CreateBranchDialog (present in the pinned `@keystatic/core@0.6.9` bundle), save there, preview before publishing, then open a pull request and self-merge with squash; head branches auto-delete on merge. The GitHub storage config carries `branchPrefix: 'preview/'` (`lib/keystatic/storage.ts` `githubStorage()` helper) so the branch dialog is scoped to the `preview/` namespace. Branch naming stays a convention: the prefix only scopes creation, the editor still types their own username. Designated admins sit on the GitHub branch-protection bypass list so typo fixes can still land directly.

WHY: user decision 2026-10-01. Two forces: pre-publish preview (every save used to be one commit away from production; now nothing reaches `main` without a PR plus a green Vercel build) and no-accident-publish (branch protection makes direct writes to `main` fail closed instead of relying on editors remembering the branch selector).

WHAT is reversible: the protection itself is a GitHub setting, not code. Removing the branch-protection rule restores direct-to-`main` saves with zero code changes; removing `branchPrefix` from the storage helper restores unscoped branch creation. The exact GitHub steps live in the runbook (`docs/technical-stack.md` deployment section), including the current-state warning that protection does NOT exist until a human flips it in GitHub settings.

One decision per file is kept: this amends only the save/publish branch workflow of the same CMS decision. The client-side `/preview` renderer is a separate decision in its own ADR (plan lane B).

## Context

Articles are repository-owned MDX files with Zod-validated frontmatter, rendered through `lib/content.ts` and `next-mdx-remote/rsc`. There is no CMS, no auth, and no mutation API. Editors currently commit MDX by hand. The club wants a Traditional-Chinese browser editor with GitHub login, structured frontmatter fields, and MDX editing for the existing Figure, Callout, and Model3D blocks, without adding a database or a custom auth backend.

## Decision

Adopt Keystatic GitHub mode (`@keystatic/core@0.6.9` with `@keystatic/next@5.0.5`) for `woodengrass/nehsnepc_website`. Local filesystem mode is selected only when `NODE_ENV=development` and `NEXT_PUBLIC_KEYSTATIC_LOCAL_MODE=1` are both set; every other environment uses GitHub mode. Writes are restricted to GitHub identities with repository write access, because MDX is trusted executable source and is not safe for untrusted authors. ~~`main` is a documented convention only: this Keystatic version exposes a branch selector that cannot be removed or locked, so editors must select `main` for the intended direct workflow.~~ A save commits to the selected branch. New entries default to `draft: true`. ~~Setting `draft: false` on `main` plus a successful Vercel build publishes the article.~~ Publishing now means: save to `preview/<github-username>`, open a pull request, self-merge with squash after a green build. Keep `lib/content.ts` and the `next-mdx-remote/rsc` rendering pipeline unchanged. Model only `Figure`, `Callout`, and `Model3D` in the editor schema.

> Supersession note 2026-10-01: the struck-through sentences above described the original direct-to-`main` workflow. They are superseded by the Amendment (protected `main`, PR self-merge, squash) and kept here for decision history only.

## Scope and Impact

- **Applies to:** article authoring (`content/articles/*`), the `/admin` gateway and `/keystatic` editor routes, GitHub App authentication, draft and publish semantics.
- **Does not apply to:** public article rendering, the image derivative pipeline (see ADR-0004), automated quality gates (see ADR-0005), non-article site design.
- **Constraints:** every editor must hold repository write access; ~~editors must select `main` by convention~~ editors work on `preview/<github-username>` branches and merge through self-merged pull requests (`main` is branch-protected; designated admins on the bypass list may push typo fixes directly); new entries stay drafts until explicitly published; public rendering stays filesystem based.

## Alternatives Considered

- **Decap, Tina, or a bespoke editor:** rejected. Decap lacks the typed MDX-component fit for Figure, Callout, and Model3D. Tina needs a backend the club does not want to run. A bespoke OAuth client plus rich-text editor multiplies auth, concurrency, and security surface for a small trusted team.
- **Database, runtime GitHub reads, or Deploy Hook:** rejected. Each duplicates Git as the content database, breaks the static-first rendering path, or adds a persistent backend with no corresponding need. Vercel already rebuilds from Git pushes.
- ~~**Custom branch enforcement or PR workflow:** rejected for now. This Keystatic version does not support locking the branch selector, so enforcement would need custom UI or a different CMS. Deferred until moderation or concurrency control is actually requested.~~ **Adopted 2026-10-01 (see Amendment):** the PR workflow is now enforced by GitHub branch protection plus the `preview/` branch prefix, using Keystatic's native CreateBranchDialog — no custom UI, no CMS change.

## Consequences

Trusted editors get a structured browser workflow and every save stays an ordinary Git commit with full history. The cost is honest and permanent: every committed draft is publicly readable on GitHub despite exclusion from `/tutorial`, category pages, slug routes, sitemap, and RSS. Drafts are unpublished, never confidential. A failed Vercel build leaves the prior production deployment serving, so publish intent (`draft: false` on `main`) only takes effect after a green build.

## Revisit Triggers

Supersede with a new ADR if Keystatic is abandoned or becomes incompatible with the supported Next.js version, if untrusted authors or genuinely secret drafts are required, or if roles, scheduling, or collaboration needs outgrow repository write access.
