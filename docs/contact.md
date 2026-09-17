# Contact

## Architecture

`app/contact/page.tsx` is a thin Server Component that exports title, description, and canonical `/contact`, then renders the client component in `components/contact/ContactPage.tsx`. The client component owns accordions, clipboard interaction, and modal open state. The dialog itself lives in `components/contact/TallyModal.tsx`, loaded via `next/dynamic` (`ssr: false`) only after first open; it owns focus trap, Escape handling, `body.has-modal`, and the Tally iframe. There is no first-party form endpoint or server action.

Current external contracts:

| Purpose | Value |
| --- | --- |
| Email | `contact@nehsnepc.com` |
| Request form | `https://tally.so/embed/NpRGgl?alignLeft=1&hideTitle=1` |
| Instagram | `https://instagram.com/nehs_nepc` |

These values are constants in `ContactPage.tsx`, not environment variables.

## Layout

Desktop uses a viewport-height editorial split: roughly 58% content and 42% photography, narrowing to 64/36 between 768px and 980px. The left side is a vertical flex column with reduced top padding; channel rows use `mt-auto` to remain near the bottom without needing an inner scroll area. The header label is `NEHS NEPC / CONTACT`. The right side is an unlabeled decorative full-height photograph.

At 767px and below, content becomes document-height, begins `0.5rem` below `--header-height`, the image moves below it at 58svh, row touch targets increase, secondary English labels are hidden, and the modal becomes almost full-screen. The photograph uses AVIF and WebP variants at 480, 800, 1200, and 1600 pixels. Its parent is `aria-hidden` and the image has `alt=""`. Its `sizes="(max-width: 767px) 88vw, 40vw"` matches the desktop (~40vw) and mobile (~88vw) rendering.

## State Model

`openItem` permits either the contact accordion, social accordion, or neither. Only one accordion opens at a time. `modalOpen` mounts/unmounts the dynamic `TallyModal`, so the Tally iframe and dialog code load only on demand and unmount on close. `emailLabel` temporarily changes to `copied` after successful clipboard access.

Panel refs are used to measure `scrollHeight`. An effect writes explicit `max-height` to the open body and clears closed bodies. Buttons and panels synchronize `aria-expanded`, `aria-controls`, IDs, and `aria-hidden`.

Closed panel descendants remain mounted and are not made `inert` or removed from tab order. Any new links or controls inside an accordion must be checked for keyboard reachability while collapsed.

## Email Copy

The email button calls `navigator.clipboard.writeText`. Success changes its visible label for 1.8 seconds; failure navigates to a `mailto:` URL. The timeout is not retained or cleared on unmount, and the status is not an explicit live region. Clipboard access normally requires a secure context, making the mail client fallback important.

When changing the address, update the constant once and test copy success, permission failure, and the generated `mailto:` destination.

## Tally Modal

Opening the request row sets `modalOpen`, which mounts the dynamic `TallyModal` chunk; the first open creates the iframe. The dialog unmounts on close, so reopening reloads the form fresh.

The dialog has `role="dialog"`, `aria-modal="true"`, and an accessible Chinese label. On open, focus moves to the close button and `body.has-modal` prevents background scrolling. Escape, backdrop click, and the close button close it. A document keydown listener wraps Tab and Shift+Tab across focusable elements found inside the modal box. Closing returns focus to the request trigger.

Cleanup removes the keydown listener and `body.has-modal`. Preserve this cleanup during any modal refactor.

The iframe has a title but no `sandbox`, `referrerPolicy`, explicit loading policy, load state, error state, or local submission handling. Tally owns fields, validation, storage, submission feedback, and availability. If a Content Security Policy is introduced, it must permit the required Tally frame source.

## Motion and Accessibility

Accordion and modal transitions use `motion-reduce:transition-none`, supplemented by the global reduced-motion reset. Essential controls are native buttons or links and do not depend on hover.

Implemented behavior:

- `aria-expanded` and `aria-controls` for accordion buttons;
- `aria-haspopup="dialog"` on the request trigger;
- modal focus entry, wrapping, Escape close, and focus return;
- body scroll lock cleanup;
- iframe title;
- non-interactive decorative image semantics.

Known limitations:

- collapsed panel controls may remain tabbable;
- copied state is visual only;
- copy-reset timeout is not cleaned up;
- the modal focusable query is manual and must be maintained if controls change;
- iframe loading/submission errors have no first-party fallback;
- third-party privacy and retention policy live outside this codebase.

## Change Checklist

- Keep channel IDs, refs, `aria-controls`, panel IDs, and measured bodies synchronized.
- Re-test panel height after copy, font, and responsive changes.
- Test Tab/Shift+Tab, Escape, backdrop, close button, and trigger focus return.
- Verify `body.has-modal` is removed on every close, route transition, and remount.
- Test first Tally open (dynamic chunk load) and reopen (fresh remount).
- Review Tally privacy, iframe policy, and failure behavior when changing the form.
- Run `npm run images:build` after replacing `assets/sources/contact-bg.jpg`.
- Check AVIF/WebP variants and mobile `sizes`.
- Test at desktop and 767px mobile width with reduced motion.
- Run `npm run build` and update this document with any changed contract.
