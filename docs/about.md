# About Experience

## Purpose and File Map

The `/about` route is an interactive camera-obscura narrative. It progressively enhances server-rendered content with a focus exercise, GSAP scroll control, and a dynamically imported Three.js archive. It must always retain a readable DOM fallback.

| File | Responsibility |
| --- | --- |
| `app/about/page.tsx` | Metadata and server-rendered visual/semantic layers |
| `lib/about_content.ts` | Focus copy, stations, actions, and image mapping |
| `components/about/AboutExperience.tsx` | Client controller for focus, canvas, input, GSAP, location, scene loading, and fallback |
| `lib/archive_scene.js` | Three.js renderer, camera path, stations, particles, fragments, exit projection, and disposal |
| `app/styles/about.css` | About layout, states, responsive rules, DOM fallback, and reduced motion |

The controller returns `null` and imperatively enhances known DOM IDs/classes from the server page. Those selectors form an internal contract; markup changes must be synchronized across TSX, CSS, and controller code.

## Rendered Layers

The page contains a fixed camera section, responsive hero image, image wash/vignette, hidden archive canvas, focus HUD and microprism canvas, desktop intro, separate visual mobile entry, flash layer, two semantic DOM station articles, and a light-paper afterword. The canvases are decorative/inaccessible; the DOM station content is intended to carry semantics and fallback content.

Current content is centralized in `lib/about_content.ts`. Numerous semantic image keys currently reuse only the generated hero and contact images. `ABOUT_TUNNEL_PHOTOS` selects the focus and two station main images.

## Initial Focus Interaction

On mount, `AboutExperience` validates required DOM nodes, adds `body.is-focus-locked`, scrolls to the top, starts the location request and microprism renderer, installs listeners, and sets focus to 8. CSS locks the body to `100svh`, disables overflow, and sets `touch-action: none`.

The target is `FOCUS_POINT = 62`. Before unlock:

- wheel delta changes focus at `deltaY * 0.04` and prevents scrolling;
- touch movement changes focus at `delta * 0.18` and prevents scrolling;
- ArrowDown, PageDown, Space, and ArrowUp adjust focus by keyboard;
- focus sensitivity slows near the synthetic two-meter point;
- crossing or nearing the target snaps exactly to it.

Focus value is clamped from 0 to 100. A synthetic distance is calculated from normalized focus; values near 97% display infinity. CSS properties `--focus`, `--focus-error`, and `--split-offset` drive image blur and split-prism visuals. Reaching within 0.8 of the target unlocks once.

Unlock removes the body lock, adds `.is-unlocked`, changes prompt text, starts archive loading, and animates a white flash with GSAP. During this 0.55-second flash transition, desktop wheel events remain prevented so high-frequency wheel input cannot scroll the DOM fallback station into the flash. Cleanup must remove all listeners, body state, animation contexts, queued frames, and scene resources even if initialization is interrupted.

## Microprism Canvas

The central focusing screen uses a two-dimensional canvas independent of Three.js. It cover-crops the hero image to a temporary canvas, divides an annular region into 48 alternating facets, offsets them according to focus error, and draws separator lines. Pixel ratio is capped at 2. Rendering is queued at most once per animation frame and repeats after image load, focus changes, and resize.

## Location Service

The browser automatically requests `https://ipwho.is/` on About mount. A successful response formats latitude and longitude to two decimals; errors display `LOCATION UNAVAILABLE`. There is no consent gate, timeout, caching, or `AbortController`. This is a third-party privacy and availability dependency and must be reviewed if location behavior changes.

The HUD ancestor is currently `aria-hidden="true"`, so the nested `aria-live` focus text is not effectively exposed to assistive technology.

## GSAP Story

GSAP and ScrollTrigger are statically imported into the About client bundle, not the shared layout. `gsap.matchMedia()` separates normal and reduced-motion behavior and is reverted during cleanup.

For normal motion, the story ScrollTrigger:

- pins `.obscura-story` from `top top`;
- ends after `+=540%`;
- scrubs progress;
- snaps near 0.325 and 0.855;
- activates/deactivates the scene on forward/reverse entry;
- sends progress to the archive scene.

A second scrubbed trigger maps the afterword's entrance into the Three.js exit transition. After the 3D class changes DOM height, `ScrollTrigger.refresh()` runs on the next frame.

For reduced motion, the component immediately sets focus to the target, does not create pinned timelines, does not import the Three.js scene, and displays ordinary full-height DOM panels. This is the primary low-motion and non-WebGL path.

## Three.js Archive

`lib/archive_scene.js` is imported only after unlock or meaningful story progress. A cached promise prevents duplicate initialization. Success adds `.is-archive-3d`, synchronizes existing progress, and refreshes ScrollTrigger. Import, texture, renderer, or WebGL failures call the DOM fallback.

Renderer configuration:

- opaque WebGL renderer with `high-performance` preference;
- desktop antialiasing, disabled on mobile;
- pixel ratio capped at 1.5 desktop and 1.2 mobile;
- field of view 46 desktop and 55 mobile;
- dark exponential fog and sRGB output.

The scene contains an entry portal, two station groups, canvas-text labels, photo cards, a tunnel gallery, dust, wireframe fragments, and an invisible page plane used to project the real DOM afterword. Story progress follows camera stops through smooth interpolation and a damped spring. Desktop pointer movement contributes damped parallax.

Mobile is classified once at initialization with `(max-width: 767px)`. It remains a WebGL experience when motion is allowed, but uses no satellite photos, lower particle/fragment/photo counts, lower pixel ratio, no antialiasing, and no pointer parallax. Crossing the breakpoint after scene creation does not rebuild the complexity profile.

The render loop pauses when the document is hidden or the scene leaves the observed viewport. ResizeObserver updates renderer size, camera aspect, portal crop, and exit geometry. Frame delta is capped after inactivity.

## Exit Projection

Near the exit, the camera turns around a corner and fragments gather toward a page-shaped plane. Its projected screen corners are sent to `AboutExperience`, which translates, independently scales, and fades the real `.obscura-afterword` DOM element. Pointer interaction is enabled only at near-complete projection. The WebGL plane itself remains invisible; it is geometric reference data.

## Fallback and Cleanup

Without `.is-archive-3d`, station articles are normal, relative, full-viewport DOM sections. On scene failure or `webglcontextlost`, the controller destroys the scene and restores fallback classes. No context restoration is attempted.

The scene's `destroy()` cancels animation, disconnects intersection/resize observers, removes visibility and pointer listeners, traverses and disposes geometry/material/texture resources, and disposes the renderer. The React controller additionally removes input, resize, unload, and context-loss listeners, cancels microprism work, reverts GSAP media, and removes the focus body lock.

## Accessibility Constraints

Positive behavior includes keyboard focus adjustment, semantic server sections, reduced-motion bypass, WebGL fallback, decorative canvas semantics, and normal links in the final afterword.

Important current limitations:

- normal scroll and touch are intentionally blocked until focus completion;
- the focus adjustment is not represented as a semantic range input;
- the visual HUD and its live region are under `aria-hidden`;
- mobile entry copy is duplicated visually and hidden from assistive technology;
- after successful 3D initialization, `.obscura-panel` uses `display: none`, so canvas-rendered station text has no equivalent semantic content in the accessibility tree;
- visitor location is requested automatically;
- unusual keyboard controls such as PageUp, Home, and End are not handled during lock.

Any redesign must preserve a complete semantic narrative independent of canvas output.

## Performance Rules

- Never import Three.js into the root layout or shared navigation.
- Keep archive loading behind focus/reduced-motion gates.
- Keep mobile scene counts lower and test GPU memory with unique image growth.
- Deduplicate texture URLs and dispose all resources.
- Keep observers and document visibility pausing intact.
- Test reverse scrolling and Strict Mode remounts, not only forward entry.

## Change Checklist

- Update `lib/about_content.ts` for copy and image mappings; keep keys valid.
- Keep station data synchronized with scene layout assumptions.
- Test text texture wrapping and DOM fallback on desktop and mobile.
- Test fast wheel and trackpad input during the unlock flash, touch, keyboard, snapping, and guaranteed body unlock.
- Test reduced motion before testing WebGL.
- Test scene import failure, texture failure, WebGL context loss, resize, tab hiding, and route exit.
- Recheck ScrollTrigger pin length and snap points after story changes.
- Verify afterword projection forward and backward.
- Review `ipwho.is` privacy/failure behavior.
- Run `npm run images:build` when changing source image families.
- Run `npm run build` and update this document for changed focus, story, scene, fallback, or performance behavior.
