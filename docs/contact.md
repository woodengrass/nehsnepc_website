# Contact

## Architecture

`app/contact/page.tsx` is a thin Server Component that exports title, description, and canonical `/contact`, then renders the client component in `components/contact/ContactPage.tsx`. The client component owns accordions, clipboard interaction, modal open state, dismissal state, challenge state, and the cancel bridge. There is no first-party form endpoint or server action. The browser posts directly to Web3Forms.

| Piece | File | Ownership |
| --- | --- | --- |
| Modal chrome and dismissal | `components/contact/ShootRequestModal.tsx` | Dialog box, `shoot-request-dialog` ID, focus entry, parent-document keyboard handling, background isolation, `body.has-modal`, discard confirmation |
| Request form and submission | `components/contact/ShootRequestForm.tsx` | Ten fields, validation, 20s abort, payload, status copy, missing-key fallback, privacy copy |
| Captcha widget | `components/contact/ShootRequestCaptcha.tsx` | Lazy hCaptcha load, verify/expire/error lifecycle, explicit retry |
| Pure contract | `lib/contact/request.ts` | Field order, required split, verbatim notices, endpoint constants, validator, payload builder, typed submit helper |
| Public config | `lib/contact/config.ts` | `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` normalization, fixed hCaptcha sitekey, availability gate |

Both `ShootRequestModal` and `ShootRequestForm` load through `next/dynamic` with `ssr: false` and mount only while `modalOpen` is true. Closing unmounts both, so reopening starts a fresh form. The trigger keeps `shootTriggerRef` and declares `aria-haspopup="dialog"`, `aria-controls="shoot-request-dialog"`, and `aria-expanded`.

Current external contracts:

| Purpose | Value |
| --- | --- |
| Email | `contact@nehsnepc.com` |
| Request submission | `https://api.web3forms.com/submit` (direct browser POST, JSON) |
| Captcha provider | hCaptcha, sitekey `50b2fe65-b00b-4b9e-ad62-3ba471098be2` |
| Privacy policy link | `https://web3forms.com/privacy` |
| Instagram | `https://instagram.com/nehs_nepc` |

Email and Instagram are constants in `ContactPage.tsx`. The endpoint, subject, and sender name are constants in `lib/contact/request.ts`. The access key is the only contact environment variable (see Runbook). None of the other values use environment variables.

## Layout

Desktop uses a viewport-height editorial split: roughly 58% content and 42% photography, narrowing to 64/36 between 768px and 980px. The left side is a vertical flex column with reduced top padding; channel rows use `mt-auto` to remain near the bottom without needing an inner scroll area. The header label is `NEHS NEPC / CONTACT`. The right side is an unlabeled decorative full-height photograph.

At 767px and below, content becomes document-height, begins `0.5rem` below `--header-height`, the image moves below it at 58svh, row touch targets increase, secondary English labels are hidden, and the modal becomes almost full-screen. The photograph uses AVIF and WebP variants at 480, 800, 1200, and 1600 pixels. Its parent is `aria-hidden` and the image has `alt=""`. Its `sizes="(max-width: 767px) 88vw, 40vw"` matches the desktop (~40vw) and mobile (~88vw) rendering.

## State Model

`openItem` permits either the contact accordion, social accordion, or neither. Only one accordion opens at a time. `modalOpen` mounts/unmounts the dynamic modal and form, so the dialog code, form code, and captcha code load only on demand and unmount on close. `dismissalState` (`pristine`, `dirty`, `submitting`, `accepted`) flows from the form to the modal through `ContactPage` state. `challengeOpen` flows the same way and suspends parent Escape/Tab handling while the provider challenge is open. `cancelPendingRef` bridges the form cancel function to `ShootRequestModal.onCancelPending` through `onCancelPendingChange`. `emailLabel` temporarily changes to `copied` after successful clipboard access.

Panel refs are used to measure `scrollHeight`. An effect writes explicit `max-height` to the open body and clears closed bodies. Buttons and panels synchronize `aria-expanded`, `aria-controls`, IDs, `aria-hidden`, and `inert` from the same `openItem` state.

Closed panel descendants remain mounted, but their body has both `aria-hidden={true}` and `inert={true}`. The native `inert` attribute prevents Tab, Shift+Tab, and programmatic focus from entering the invisible email button or Instagram link, including while the panel is collapsing. Opening a panel clears both attributes so its controls are reachable again. This does not change the existing max-height/opacity transitions or layout measurement: the height effect still runs only when `openItem` changes, not on resize or font load.

## Email Copy

The email button calls `navigator.clipboard.writeText`. Success changes its visible label for 1.8 seconds; failure navigates to a `mailto:` URL. `copyTimerRef` retains the latest reset timeout, which is cleared on unmount; repeated successful clicks can leave earlier reset timers pending because a new click does not cancel the previous timer. The status is not an explicit live region. Clipboard access normally requires a secure context, making the mail client fallback important.

When changing the address, update the constant once and test copy success, permission failure, and the generated `mailto:` destination.

## Request Fields

Ten public fields in fixed display order (`FIELD_ORDER` in `lib/contact/request.ts`). Seven are required; three are optional. Validation trims for checks and serialization but never mutates what the visitor sees.

| Key | Label | Input | Required |
| --- | --- | --- | --- |
| `applicant` | 申請單位/申請人 | text, `autocomplete="organization"` | Yes |
| `eventName` | 活動名稱 | text | Yes |
| `email` | Email | email, `autocomplete="email"` | Yes |
| `phone` | 電話號碼（非必填） | tel, `autocomplete="tel"` | No |
| `otherContact` | 其他聯絡方式（建議填寫以利快速溝通） | text | No |
| `eventDate` | 活動日期 | date | Yes |
| `startTime` | 活動時段 | time | Yes |
| `endTime` | 至 | time | Yes |
| `eventDetails` | 活動性質與詳情 | textarea, 5 rows | Yes |
| `notes` | 備註（非必填） | textarea, 3 rows | No |

Validation rules: required fields must be non-empty after trimming; email must match a basic shape check; date must be `YYYY-MM-DD` and a real calendar date (leap-year aware, no timezone conversion); times must be `HH:mm`. There is no past-date rejection, no end-before-start rejection (cross-midnight stays representable), and no phone length rules. A locally tripped hidden `botcheck` checkbox rejects without issuing any request. Field errors render under each field with `role="alert"`; a form-level error uses `role="alert"` and moves focus to the first invalid field or the result heading.

## Request Notices

The form shows this intro line, then four numbered notices copied verbatim from the original public form (`NOTICES_INTRO`, `NOTICES`):

Intro: 以下為接拍申請須知，請仔細閱讀後再申請，感謝理解

1. 申請期限：請於活動7天以前完成申請，我們會在活動五天前告知能否協拍
2. 接拍價格：我方會依據詳細情況提供報價，價格確認以雙方協商為準
3. 作品繳交：拍攝包含基本照片後製，視活動性質在活動前會告知繳交時間
4. 其他服務：若有特殊需求，例如縮短交稿期限、特殊後製、燈具準備等，需視情況另外討論

Do not paraphrase these strings in docs or code. If the club changes the policy, update the constants and this list together.

## Submission Contract

The form posts an explicit-key JSON payload to `https://api.web3forms.com/submit` with `Content-Type: application/json`. Only allowed keys are sent. Optional values are omitted when empty. `email` and `replyto` always carry the same trimmed address.

| Payload key | Source |
| --- | --- |
| `access_key` | `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` (public routing identifier, not a secret) |
| `subject` | `NEHS NEPC｜接拍申請` |
| `from_name` | `NEHS NEPC 接拍申請` |
| `email`, `replyto` | Trimmed visitor email, both identical |
| `h-captcha-response` | One-use captcha token, cleared after every settled attempt |
| `botcheck` | Hidden honeypot boolean, always present |
| `申請單位/申請人`, `活動名稱`, `活動日期`, `活動開始時間`, `活動結束時間`, `活動性質與詳情` | Trimmed required values |
| `電話號碼`, `其他聯絡方式`, `備註` | Trimmed, included only when non-empty |

Outcome mapping (`SubmitResult`): `accepted` only when the HTTP response is OK and the parsed body is an object with `success === true`. HTTP 429 maps to `rate-limited`. Other non-OK statuses map to `rejected`. Transport failure maps to `network`. Unparseable or wrongly shaped bodies map to `invalid-response`. Abort maps to `aborted`. Provider message strings are never trusted or rendered; the form always shows its own local Chinese copy.

## Form Status Copy

Exact strings from `ShootRequestForm.tsx` (`COPY` plus inline copies):

| State | Copy |
| --- | --- |
| Submitting | 送出中… (button shows 送出中…, status line shows 送出中…) |
| Accepted | 申請已送出，我們會依申請須知與你聯絡。送出不代表已確認接拍。 |
| General error | 目前無法完成送出，填寫內容仍保留。請稍後再試，或改用 Email 聯絡。 |
| Rate limited | 送出過於頻繁，請稍後再試，或改用 Email 聯絡。 |
| Timeout/ambiguous | 尚未確認送出結果，請先確認是否已送出，或改用 Email 聯絡，避免重複申請。 |
| Missing captcha | 請先完成人機驗證，再送出申請。 |
| Validation | 請檢查必填欄位與格式後再送出。 |
| Missing key | 表單暫時無法使用，請改用 Email 聯絡。 (plus a `mailto:contact@nehsnepc.com` link) |
| Captcha loading | 人機驗證載入中，仍可繼續填寫資料。 |
| Captcha service failure | 驗證服務無法載入，請稍後重試，或改用 Email 聯絡。 (plus a 重試人機驗證 button) |
| Captcha expired | 驗證已過期，請重新完成人機驗證。 |

Accepted view offers `Close / 關閉` and 再填一份 (fresh form, focus returns to the applicant field). Error text is preserved across failures and resets only after acceptance or a fresh form. Concurrent submits are blocked by a sync ref; the submit button disables while submitting and the fieldset disables with it.

## Timeout and Retry

`REQUEST_TIMEOUT_MS` is 20 seconds. The form starts a timer on submit, aborts the controller on expiry, and settles locally even if an injected transport ignores the signal. Late results can never win: the finish path checks mount state, close state, and attempt identity first.

Aborting stops only the local wait. It does not retract a provider-side acceptance, so the timeout copy tells visitors the result is unconfirmed and to check before resending. There is no automatic retry. Every resend needs an explicit submit with a fresh captcha token, because each settled attempt resets the widget and clears the token.

## Discard Confirmation and Fresh Reopen

The modal derives close behavior from `dismissalState`:

| State | Close, backdrop, or Escape |
| --- | --- |
| `pristine`, `accepted` | Closes immediately |
| `dirty` | Shows confirmation: 尚未送出的內容將不會保留。 Buttons: 繼續填寫 (stay, focus returns to Close) and 確認關閉 (close) |
| `submitting` | Shows confirmation: 停止等待不代表已取消送出。 Same two buttons; confirming close aborts the local wait |

The confirmation renders in a labelled section (`aria-label="確認關閉表單"`) above an `inert` form. Closing unmounts modal and form, so reopening always starts fresh. No draft is stored anywhere.

## ShootRequest Modal

Opening the request row sets `modalOpen`, which mounts the dynamic modal and form chunks. The dialog unmounts on close, so reopening reloads the form fresh.

The dialog wrapper has `id="shoot-request-dialog"`, `role="dialog"`, `aria-modal="true"`, and `aria-labelledby="shoot-request-dialog-title"`. The visible title reads `02 / SHOOT REQUEST / 接拍申請`. On open, focus moves to the visible `Close / 關閉` button (`aria-label="關閉表單"`) and `body.has-modal` prevents background scrolling. The backdrop is a native button with `tabIndex={-1}` and `aria-label="關閉表單"` so it stays clickable without adding a redundant Tab stop. Closing calls `closeModal` in `ContactPage.tsx` and returns focus through `shootTriggerRef` to the request trigger.

The document keydown listener provides best-effort Tab/Shift+Tab boundary wrapping only for events observed in the parent document. Its selector covers buttons, iframes, non-hidden inputs, selects, textareas, links, and explicit tab stops, excluding disabled elements, `tabindex="-1"`, `inert` or `hidden` subtrees, and zero-rect or invisible elements. While `challengeOpen` is true, Tab wrapping and Escape are both suspended so the provider challenge keeps its own keys.

**This is not a full focus trap.** Key events inside the cross-origin hCaptcha iframe do not bubble to the parent document. Escape while the challenge is open does not close the modal through this listener, and challenge Tab navigation is not guaranteed to stay in the modal. The site never intercepts provider frame events.

Background isolation: on mount, the modal marks sibling branches along the dialog ancestor path `inert`, saving each prior value and restoring it on cleanup. Branches that already contain a trusted captcha frame (HTTPS plus `hcaptcha.com` or `*.hcaptcha.com`) are descended into instead of being marked, and a `MutationObserver` releases modal-owned `inert` flags if a late trusted challenge appears inside an isolated branch. Newly portalled body siblings stay untouched; the modal never applies `inert` to provider portals. Cleanup removes the keydown listener, disconnects the observer, cancels any pending submission wait, restores saved `inert` values, releases `body.has-modal` (restoring a pre-existing lock if one was present), and returns focus to the trigger.

Fallback: if Escape does nothing inside the challenge, click/tap the always-visible `Close / 關閉` button or the exposed backdrop. Escape works again once focus is on a parent-document control. If Web3Forms or hCaptcha is unreachable, close the dialog and use the existing email channel.

## Captcha

`ShootRequestCaptcha` isolates SDK loading from form state. The wrapper (`@hcaptcha/react-hcaptcha` `2.2.0` exact) loads lazily through a single dynamic import only when the configured form mounts. Props are fixed: `reCaptchaCompat={false}`, `theme="light"`, `size="compact"`, `languageOverride="zh-TW"`, `sentry={false}`, `cleanup={true}`. No extra script tags are injected and no Web3Forms client script is used.

Lifecycle: `onLoad`/`onReady` ends the loading state; `onVerify` stores the token; `onExpire`/`onChalExpired` invalidates it with the expiry copy; `onError` invalidates it with the service-error copy plus an explicit retry button that remounts the widget. A generation guard rejects callbacks from a previous widget after reset or close. The submit button stays actionable while the captcha loads so validation feedback appears, but no POST happens without a token. Field text stays editable until submitting.

## Missing Key Fallback

When `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` is blank, a placeholder, malformed, or all-zero, `getContactConfig()` resolves to `{ available: false }` and never throws, so builds stay green before the provider key exists. The form area shows 表單暫時無法使用，請改用 Email 聯絡。 plus a clickable `mailto:contact@nehsnepc.com` link. No captcha loads and no request is issued in this state.

The configured form's submit row contains only the red submit button, with no email link. The unavailable branch retains its mailto as its only contact path; configured-form errors still direct visitors to the Contact page's existing Email channel.

## Privacy

The form states, above the submit row: 送出後，資料將由 Web3Forms 處理並通知本社，僅用於接拍聯繫。請勿填寫敏感個人資料。 It links to Web3Forms 隱私權政策（另開視窗） at `https://web3forms.com/privacy` (`target="_blank"`, `rel="noopener noreferrer"`).

Privacy copy and the policy link share one compact, neutrally ruled footer note. Its secondary muted line retains: 關閉後，尚未送出的內容將不會保留。停止等待不代表已取消送出。 The policy link and submit button retain 48px minimum touch targets. The missing-token hint stays in the captcha fieldset; when the form alert repeats that exact hint, the hint becomes screen-reader-only while its ID remains available to the submit button's `aria-describedby`.

What is deliberately not claimed: no storage promise, no deletion SLA, no delivery SLA. Submissions travel to Web3Forms and onward to the notification mailbox. Dashboard history, mailbox retention, and provider backups are separate things governed by the provider and the mailbox owner, not by this codebase. See the runbook for the retention target and its evidence rule.

## Runbook (Code Ready, Live Ready Pending Production Key)

Status: the implementation is code-ready; provider readiness is **VERIFIED at form-settings level** per `.omo/evidence/contact-web3forms/task-8-provider-readiness.md` (2026-10-06, supersedes `task-8-blocked.md` retained as history). hCaptcha saved and enforced plus recipient `contact@nehsnepc.com` are owner-confirmed; retention is N/A-by-design (no storage promise, no deletion SLA); no mail delivery tested and no delivery SLA claimed. Live release is ready pending owner sets `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` in Vercel production plus redeploy. Do not describe the form as live until that deploy is done.

Key generation: the site owner creates the form in the Web3Forms dashboard under the adult account, with notification destination `contact@nehsnepc.com`, and copies the public access key. The key is a routing identifier, not a secret: it ships to the browser by design through the `NEXT_PUBLIC_` prefix. Keep real keys out of chat, files, and evidence.

hCaptcha requirement: the dashboard form must have hCaptcha enabled and enforced (per the provider spam-protection docs). The site sends `h-captcha-response` with every submission; an unenforced dashboard would accept the shape without checking it.

Retention target: 30 days is the target dashboard history window, matching the provider pricing page. That page describes a visible history window, not a deletion guarantee, so never promise deletion at 30 days. Evidence of the actual dashboard setting is required before stating any retention claim. Mailbox retention is separate from dashboard retention.

Deploying the key: `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` is inlined at build time, so set it in the Vercel production environment and redeploy. A blank value keeps the safe fallback above; there is no separate readiness flag.

Quota: the Free plan allows 250 submissions per month with warning emails near 90% and 100%, then a hard stop until the next month. Over quota, submissions are rejected and the form shows its rate-limit or general error copy with the email alternative. There is no paid overage on Free.

Domain allowlist: Free has no domain restriction feature. Restrict-to-domain is a Pro feature, so do not claim allowlist protection on the current plan.

Deliverability troubleshooting: API `success: true` means the provider accepted the payload, not that mail arrived. If mail does not arrive, check the spam folder for the notification address, confirm the dashboard destination is exactly `contact@nehsnepc.com`, confirm the `replyto` matches the visitor address in the payload, and resubmit once with a fresh captcha after the timeout ambiguity clears. For repeated failures, fall back to direct email.

There is no guaranteed email SLA. Provider outages, quota stops, spam filtering, and mailbox issues can all delay or drop notifications without any first-party UI beyond the copies listed above.

## History: Tally (Retired)

The previous request form was a Tally embed (`https://tally.so/embed/NpRGgl?alignLeft=1&hideTitle=1`) in `components/contact/TallyModal.tsx`. That file has been removed and replaced by the first-party `ShootRequestModal`, `ShootRequestForm`, and `ShootRequestCaptcha` described above. Tally owned its own fields, validation, storage, submission feedback, and availability; none of that applies anymore.

Operational note only: the old Tally form ID `NpRGgl` is retained here so a maintainer can find the legacy form if rollback is ever discussed. Stored Tally responses were not migrated into this codebase, and no migration should be assumed. Do not treat any Tally-era paragraph above as current behavior.

## Motion and Accessibility

Accordion and modal transitions use `motion-reduce:transition-none`, supplemented by the global reduced-motion reset. Essential controls are native buttons or links and do not depend on hover.

Implemented behavior:

- synchronized `aria-expanded`, `aria-controls`, panel IDs, `aria-hidden`, and collapsed-panel `inert`;
- `aria-haspopup="dialog"`, `aria-controls`, and `aria-expanded` on the request trigger;
- modal focus entry, parent-observed Tab boundary wrapping and Escape close (suspended while the provider challenge is open), native close/backdrop buttons, discard confirmation, and trigger focus return;
- background `inert` snapshot and restore with trusted captcha portal handling, plus `body.has-modal` scroll lock cleanup;
- dialog title and labelledby;
- non-interactive decorative image semantics.

Known limitations:

- parent-document handling cannot trap focus or receive Escape inside the cross-origin captcha challenge; use the visible close/backdrop controls instead;
- open panel heights are not automatically remeasured on resize or late font loading;
- copied state is visual only;
- repeated copy clicks can leave earlier reset timers pending; unmount cleanup clears only the latest retained timer;
- the modal focusable query is manual and must be maintained if controls change;
- submission, captcha, and quota errors surface only through the local status copies above; the email channel is the existing alternative;
- third-party privacy, retention, quota, and deliverability behavior live outside this codebase; API acceptance is not mail delivery.

## Change Checklist

- Keep channel IDs, refs, `aria-expanded`, `aria-controls`, panel IDs, measured bodies, `aria-hidden`, and `inert` synchronized from `openItem`.
- With both accordions closed, verify Tab/Shift+Tab skip the email button and Instagram link. Expand each panel, verify its control is reachable, then collapse or switch panels and verify hidden controls are skipped again, including during the collapse transition.
- Re-test panel height after copy, font, and responsive changes; preserve the current measurement behavior unless intentionally changing it.
- Test modal focus entry and parent-observed Tab/Shift+Tab wrapping. Test Escape with focus on the close button, backdrop dismissal, close-button activation, discard confirmation paths (dirty and submitting), and trigger focus return for every close path.
- Separately open the provider challenge and confirm parent Tab/Escape suspension; record the cross-origin limitation rather than claiming a full trap; confirm the visible `Close / 關閉` and exposed backdrop remain usable.
- Verify `body.has-modal` is removed on every close, route transition, and remount, and that saved background `inert` values are restored.
- Test first modal open (dynamic chunk load) and reopen (fresh remount, no retained text).
- Test all status copies: validation, missing captcha, accepted, general, rate-limited, timeout ambiguity, expiry, service failure with retry, and the missing-key fallback with `mailto:`.
- Test with the network stalled: the 20s timer must settle locally with the ambiguity copy, text retained, and no auto-retry.
- Test with the key blank: no captcha, no POST, fallback copy plus mailto; confirm the build still passes.
- Review Web3Forms privacy, quota, retention evidence, and hCaptcha enforcement when changing the form. Never promise deletion, allowlist, storage, SLA, or live readiness without task-8 evidence.
- Run `npm run images:build` after replacing `assets/sources/contact-bg.jpg`.
- Check AVIF/WebP variants and mobile `sizes`.
- Test at desktop and 767px mobile width with reduced motion.
- Run `npm run build`, `pnpm test:contact:unit`, and update this document with any changed contract.
