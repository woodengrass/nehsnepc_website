# Tools

Implementation source of truth is the code at `app/tools/page.tsx`, `app/tools/exposure-calculator/page.tsx`, `lib/tools.ts`, `components/tools/ExposureCalculator.tsx`, and `lib/exposure/exposure.ts`. Catalogue fields, preset lists, formulas, compensation order, event wiring, and responsive numbers live there and are not repeated here. This document records only decisions, history, and the checks a maintainer cannot derive from code.

## Decisions

Calculator math lives as pure framework-free functions in `lib/exposure/exposure.ts`, and all calculator state lives in the controlled React component. The engine never touches the DOM, so it stays importable during server rendering and testable in isolation. Keep that split: state in the TSX file, math in the exposure module, no direct DOM mutation.

Nothing persists to URL, storage, cookie, or backend. Reload restores defaults. That is deliberate: the calculator is a scratch tool, not a session.

Free-text fields commit on Enter or blur and silently ignore invalid input with no announced validation message. Cross-midnight time ranges stay representable: there is no end-before-start rejection. ND compensation adjusts only the first attached filter and does not solve combinations.

The catalogue status union is load-bearing: available entries link out, coming-soon entries render non-interactive. Sitemap coverage follows the same split.

## History

The legacy `lib/exposure/exposure_calculator.js` DOM engine was deleted along with its element-ID contract. Remaining element IDs exist only for label association.

## Runbook

When adding a tool: create the route first, add the catalogue entry with sitemap coverage and meaningful image alternatives, and verify unavailable entries stay non-interactive across desktop, tablet, and mobile widths.

When changing the calculator: verify presets and formulas against expected photographic stops, exercise direct input (valid, invalid, out-of-preset), target locking under every lock combination including all-locked, ND compensation with zero, one, and multiple filters, both flash modes after ISO, aperture, and ND changes, and baseline semantics with route remount cleanup. Test at desktop and mobile widths plus 320px and 390px with mouse, touch, keyboard-only navigation, and reduced motion, and confirm no document-level horizontal overflow.

## Change Rule

Update this document only for decision-affecting changes: catalogue contract, math ownership, persistence policy, validation philosophy, or compensation strategy. Formula tweaks, preset additions, control wiring, or layout numbers need no doc update.
