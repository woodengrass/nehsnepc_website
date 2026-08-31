# Tools

## Scope and Routes

The tools area contains a server-rendered catalogue and one interactive exposure calculator.

| Route/file | Responsibility |
| --- | --- |
| `app/tools/page.tsx` | `/tools` catalogue, metadata, responsive cards |
| `lib/tools.ts` | Typed catalogue data and availability contract |
| `app/tools/exposure-calculator/page.tsx` | Calculator route metadata and client component |
| `components/tools/ExposureCalculator.tsx` | React-rendered shell and dynamic engine lifecycle |
| `@/exposure/exposure_calculator` | Exposure calculator engine module dynamically loaded by the client shell |

Both routes appear in `app/sitemap.ts`. Legacy `/portfolio` URLs redirect to `/tools` through `vercel.json`.

## Catalogue Data Model

`lib/tools.ts` exports `TOOLS`, whose items contain `id`, `title`, `description`, `image`, `imageAlt`, and optional `href`. The presence of `href` is the complete availability switch:

- with `href`, `app/tools/page.tsx` wraps the card in a Next `Link` and displays `開啟 / Open`;
- without `href`, it renders a non-interactive `div` and displays `建置中 / In progress`.

The current catalogue contains only the available exposure calculator. To publish a new tool, add its route first, then add `href`, sitemap coverage, meaningful `imageAlt`, and a valid public image path.

The layout is three columns above 980px, two columns to 768px, and one column at 767px and below. The catalogue header begins `0.5rem` below `--header-height` on both desktop and mobile. Images are native WebP `<img>` elements with lazy loading and async decoding. Hover shifts filtering and crop, but all required information and the available route remain visible without hover.

## Current Engine Availability

`exposure/exposure_calculator.js` is present and supplies the dynamically imported calculator engine. The React shell and engine share a fixed DOM ID contract; update both together when changing calculator controls.

## Exposure Calculator Architecture

`components/tools/ExposureCalculator.tsx` is a client component that renders stable containers and attempts to dynamically import `@/exposure/exposure_calculator` in `useEffect`. Its expected module exports `initExposureCalculator()`, whose returned cleanup function is invoked on unmount. The last observed engine used a module-level `AbortController`; verify that contract when restoring it.

The shell is React-rendered, but `#cameraControls`, `#ndList`, and `#flashList` are rebuilt with `innerHTML`. Parent-level delegated listeners survive those rebuilds. IDs queried by the engine are an internal API: changing one requires synchronized changes in both the TSX shell and JavaScript module.

The import currently has no rejection handler or user-visible fallback. Because the module is missing, this is also a compile-time build failure rather than only a runtime failure.

## Engine Contract

## State and Persistence

The engine keeps local mutable state rather than React state. Initial camera and baseline values are ISO 100, 1/125 second, and f/5.6. It tracks camera locks, target EV locking, ND filters, and flashes. Nothing is persisted to a URL, local storage, cookie, or backend; reload restores defaults.

Supported camera presets:

- ISO 25 through ISO 102400;
- aperture f/1.0 through f/45;
- shutter 1 second through 1/32000, plus direct long-exposure input above one second;
- visible target range -8 to +8 EV in 0.1 increments;
- ND2 through ND1024, representing one through ten stops.

Direct editable values accept ISO text, `f/` aperture forms, shutter fractions, and second suffixes. Positive values outside preset arrays can be accepted; subsequent slider movement snaps from the nearest preset. Invalid direct input is restored or ignored without an announced validation message.

## Exposure Mathematics

Ambient exposure is calculated as:

```text
log2(ISO / 100)
+ log2(shutter seconds)
- 2 * log2(aperture)
- total ND stops
```

Flash exposure omits shutter speed:

```text
log2(ISO / 100)
- 2 * log2(aperture)
- total ND stops
```

Guide-number power estimation uses:

```text
adjusted GN = GN * sqrt(ISO / 100)
required power stops =
  2 * log2((aperture * distance) / adjusted GN)
  + total ND stops
```

When target locking is active, compensation changes the first eligible unlocked parameter in this fixed order: shutter, aperture, ISO, ND. The parameter that triggered the change is excluded. Discrete camera values are searched for minimum target error. ND compensation changes only the first attached ND filter, rounds to a whole stop, and does nothing if no ND exists. It does not solve combinations across multiple parameters.

## Baseline, ND, and Flash Behavior

`保持目標` captures the current ambient result and enables compensation. The baseline button copies current camera values, recalculates baseline exposure including current ND, resets target to zero, and updates flash baselines. It does not clear filters, flashes, or lock states.

Multiple ND filters can be added and their stops sum. Flash entries support custom and guide-number estimate modes. A new flash starts at -2 stops (`1/4`), GN 60, and 2 meters. Flash power is clamped between -9 and 0 stops. Confirming custom power or accepting an estimate establishes a new flash baseline.

## Events and Rendering

- Camera slider `input` updates the value and compensates or moves the target.
- Lock `change` updates camera or ND lock state.
- Direct values commit on Enter or focus loss.
- Target `input` changes the target and runs compensation.
- ND add/range/delete operations recalculate or compensate.
- Flash add, field input, mode selection, estimate, confirm, and delete mutate local flash state.
- Full renders rebuild generated markup; lighter refreshes update labels during slider interaction.

Because generated HTML includes state values, never introduce untrusted text without escaping. Flash names are currently local user input and must remain safely encoded if generation logic changes.

## Responsive and Accessibility Behavior

The main calculator is capped at 1180px. Its two-column calculator/accessory layout becomes one column at 900px. At 560px, the header and control grids compress, flash controls wrap, and camera locks move to a second row.

Implemented accessibility includes native ranges, checkboxes, number inputs and buttons, an explicit target label, generated camera slider labels, keyboard-editable displayed values, and an `aria-live="polite"` summary. The accessories panel is an appropriately labelled `aside`.

Known limitations:

- generated ND ranges lack explicit accessible names;
- several flash fields depend on nearby visual labels rather than `for`/`id` pairs;
- invalid input has no visible or announced error;
- dynamic import failure has no fallback UI;
- `innerHTML` makes React ownership and DOM ownership easy to mix accidentally.

## Modification Workflow

When adding a tool:

1. Create the App Router page and metadata.
2. Add or update `lib/tools.ts`.
3. Add the public route to `app/sitemap.ts`.
4. Verify unavailable entries are not interactive.
5. Test catalogue grids at desktop, tablet, and mobile widths.

When changing the calculator:

1. Restore or replace `@/exposure/exposure_calculator` and make `npm run build` pass.
2. Preserve or synchronously rename all shell IDs.
3. Verify every preset and formula against expected photographic stops.
4. Test direct ISO, aperture, fraction, seconds, invalid, and out-of-preset input.
5. Test target locking with each lock combination and all parameters locked.
6. Test ND compensation with zero, one, and multiple filters.
7. Test custom and GN flash modes after ISO, aperture, and ND changes.
8. Verify baseline semantics and route remount cleanup.
9. Test at 900px and 560px, keyboard-only, and reduced motion.
10. Run `npm run build`.
11. Update this document if data contracts, formulas, events, limits, or lifecycle changed.
