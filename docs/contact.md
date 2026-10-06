# Contact

Implementation source of truth is the code at `app/contact/page.tsx`, `components/contact/ContactPage.tsx`, `components/contact/ShootRequestModal.tsx`, `components/contact/ShootRequestForm.tsx`, `components/contact/ShootRequestCaptcha.tsx`, `lib/contact/request.ts`, and `lib/contact/config.ts`. Field lists, verbatim notices, payload keys, status copy, timers, modal focus handling, and captcha props live there and are not repeated here. This document records only decisions, external contracts, the runbook a maintainer cannot derive from code, and history.

## Decisions

There is no first-party form endpoint or server action. The browser posts directly to Web3Forms. That choice removes a backend to operate, and it means the provider owns acceptance, quota, retention, and deliverability after submit.

The access key ships to the browser by design through the `NEXT_PUBLIC_` prefix. It is a routing identifier, not a secret. Keep real keys out of chat, files, and evidence.

Aborting the local wait does not retract a provider-side acceptance, so the timeout copy tells visitors the result is unconfirmed and to check before resending. There is no automatic retry. Every resend needs an explicit submit with a fresh captcha token.

A blank or invalid key resolves to an unavailable form with an email fallback instead of failing the build, so the site stays green before the provider key exists.

No storage promise, no deletion SLA, and no delivery SLA are claimed anywhere in the form. Submissions travel to Web3Forms and onward to the notification mailbox. Dashboard history, mailbox retention, and provider backups are governed by the provider and the mailbox owner, not by this codebase.

The modal focus handling is best effort only. Key events inside the cross-origin hCaptcha frame do not reach the parent document, so no full focus trap is claimed.

## External Contracts

| Purpose | Value |
| --- | --- |
| Email | `contact@nehsnepc.com` |
| Request submission | `https://api.web3forms.com/submit` (direct browser POST, JSON) |
| Captcha provider | hCaptcha, sitekey `50b2fe65-b00b-4b9e-ad62-3ba471098be2` |
| Privacy policy link | `https://web3forms.com/privacy` |
| Instagram | `https://instagram.com/nehs_nepc` |

## Runbook

Status: provider readiness is **VERIFIED at form-settings level** per `.omo/evidence/contact-web3forms/task-8-provider-readiness.md` (2026-10-06, supersedes `task-8-blocked.md` retained as history). hCaptcha selection is screenshot-verified; hCaptcha saved plus enforced and recipient `contact@nehsnepc.com` are owner-confirmed; retention is N/A-by-design (no storage promise, no deletion SLA). No mail delivery tested and no delivery SLA claimed. The owner tested the live form end to end OK on 2026-10-06.

Key generation: the site owner creates the form in the Web3Forms dashboard under the adult account, with notification destination `contact@nehsnepc.com`, and copies the public access key.

hCaptcha requirement: the dashboard form must have hCaptcha enabled and enforced (per the provider spam-protection docs, Settings then Spam and Security then Captcha Protection). An unenforced dashboard would accept submissions without checking the token the site sends.

Retention target: 30 days is the target dashboard history window, matching the provider pricing page. That page describes a visible history window, not a deletion guarantee, so never promise deletion at 30 days. Evidence of the actual dashboard setting is required before stating any retention claim. Mailbox retention is separate from dashboard retention.

Deploying the key: `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` is inlined at build time, so set it in the Vercel production environment and redeploy. A blank value keeps the safe fallback; there is no separate readiness flag.

Quota: the Free plan allows 250 submissions per month with warning emails near 90% and 100%, then a hard stop until the next month. Over quota, submissions are rejected and the form shows its rate-limit or general error copy with the email alternative. There is no paid overage on Free.

Domain allowlist: Free has no domain restriction feature. Restrict-to-domain is a Pro feature, so do not claim allowlist protection on the current plan.

Deliverability troubleshooting: API `success: true` means the provider accepted the payload, not that mail arrived. If mail does not arrive, check the spam folder for the notification address, confirm the dashboard destination is exactly `contact@nehsnepc.com`, and resubmit once with a fresh captcha after the timeout ambiguity clears. For repeated failures, fall back to direct email.

There is no guaranteed email SLA. Provider outages, quota stops, spam filtering, and mailbox issues can all delay or drop notifications without any first-party UI beyond the local status copies.

## History: Tally (Retired and Decommissioned)

The previous request form was a Tally embed (`https://tally.so/embed/NpRGgl?alignLeft=1&hideTitle=1`) in `components/contact/TallyModal.tsx`. That file has been removed and replaced by the first-party `ShootRequestModal`, `ShootRequestForm`, and `ShootRequestCaptcha`. Tally owned its own fields, validation, storage, submission feedback, and availability; none of that applies anymore.

Decommissioned 2026-10-06: following successful production verification of the Web3Forms replacement (owner tested the live form end to end OK), the legacy Tally form `NpRGgl` is now decommissioned. The owner handles the Tally-dashboard side (export/delete) themselves. Rollback to Tally is no longer available.

Stored Tally responses were never migrated into this codebase, and no migration should be assumed. The owner exported and deleted stored responses on the Tally side. The form ID `NpRGgl` is retained here only as a historical record so a maintainer can identify which legacy form was replaced. Do not treat any Tally-era paragraph above as current behavior.

## Known Limitations

API acceptance is not mail delivery. Submission, captcha, quota, and deliverability behavior outside this codebase surfaces only through local status copy plus the email channel. See the runbook for the retention target and its evidence rule.

## Change Rule

Update this document only for decision-affecting changes: contact channels, provider or captcha plan changes, quota or retention policy changes, runbook path changes, or Tally-history corrections. Field, copy, payload, timer, or focus-handling edits need no doc update.
