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

The page contains a fixed camera section, responsive hero image, image wash/vignette, hidden archive canvas, focus HUD and microprism canvas, desktop intro, separate visual mobile entry, flash layer, two semantic DOM station articles, and a light-paper afterword. The afterword photo frame is labelled `NEHS` and `JOIN THE CLUB`. The canvases are decorative/inaccessible; the DOM station content is intended to carry semantics and fallback content. The hero receives high fetch priority because it is the visual entry layer; its split-focus copies use the same AVIF/WebP responsive sources to reuse the selected image resource. The afterword image uses browser lazy loading because it is below the initial viewport.

Current content is centralized in `lib/about_content.ts`. The ten current local source images in the ignored `temp/` directory are emitted as `about-satellite-01-640` through `about-satellite-10-640` generated WebP and AVIF files. The first station uses the portrait photograph `about-satellite-01-640` as its smaller main image, while the second station uses the horizontal `wan-san-yip...` photograph (`about-satellite-10-640`) as its larger main image. Satellite frame dimensions are assigned to match each source orientation instead of forcing every photograph into one ratio, each source is used once across the two stations, and all photo-card borders use a thin frame. The focus still uses the generated hero family and the final afterword uses the generated logo. `ABOUT_TUNNEL_PHOTOS` selects the focus and two station main images. Before scene loading, the browser probes the first selected generated AVIF image; supported browsers use AVIF textures, individual AVIF failures retry WebP, and a failed probe uses WebP for every scene texture.

## Initial Focus Interaction

The server-rendered `.obscura` initially lacks `.is-unlocked`, so CSS immediately locks the root viewport and fixes the body before hydration. This prevents the first mobile swipe from reaching fallback sections before client input listeners exist. On mount, `AboutExperience` validates required DOM nodes, adds `is-focus-locked` to the document root and body, scrolls to the top, schedules the location request after load during browser idle time, starts the microprism renderer, installs listeners, and sets focus to 8. CSS locks the root viewport, fixes the body at `100dvh`, disables overflow, and sets `touch-action: none`; locking both layers prevents iOS Safari from exposing later sections through a body-only overflow lock. The focus camera also uses `dvh` before archive 3D begins, keeping its focus information above changing browser chrome.

The target is `FOCUS_POINT = 62`. Before unlock:

- wheel delta changes focus at `deltaY * 0.04` and prevents scrolling;
- touch input uses Pointer Events on the full `.obscura` surface with pointer capture. Pointer movement changes focus at `delta * 0.18` and prevents scrolling; if the target is reached mid-gesture, that gesture remains prevented until pointer end so its remaining movement cannot immediately scroll into the story;
- ArrowDown, PageDown, Space, and ArrowUp adjust focus by keyboard;
- focus sensitivity slows near the synthetic two-meter point;
- crossing or nearing the target snaps exactly to it.

Focus value is clamped from 0 to 100. A synthetic distance is calculated from normalized focus; values near 97% display infinity. CSS properties `--focus`, `--focus-error`, and `--split-offset` drive image blur and split-prism visuals. Non-terminal pointer and wheel updates are coalesced to one animation frame; reaching within 0.8 of the target applies immediately so unlock remains responsive.

Unlock removes both root and body locks, adds `.is-unlocked`, changes prompt text, starts archive loading, and animates a white flash with GSAP. During this 0.55-second flash transition, desktop wheel events remain prevented so high-frequency wheel input cannot scroll the DOM fallback station into the flash. When the flash completes, wheel, keyboard, and unused pointer listeners are removed; an active touch pointer remains captured until it ends. Cleanup must remove all listeners, root/body state, animation contexts, queued frames, and scene resources even if initialization is interrupted.

## Microprism Canvas

The central focusing screen uses a two-dimensional canvas independent of Three.js. It cover-crops the hero image to a cached canvas, divides an annular region into 48 alternating facets, offsets them according to focus error, and draws separator lines. The crop cache is rebuilt after image load or resize; focus changes redraw only the facets. Pixel ratio is capped at 2. Rendering is queued at most once per animation frame. Unlock cancels pending prism work and releases both canvas buffers because the HUD is then hidden.

## Location Service

After the load event, the browser requests `https://ipwho.is/` during idle time, with a 1.5-second idle timeout fallback. A successful response formats latitude and longitude to two decimals; errors display `LOCATION UNAVAILABLE`. There is no consent gate, request timeout, caching, or `AbortController`. This is a third-party privacy and availability dependency and must be reviewed if location behavior changes.

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

A second scrubbed trigger maps the `.obscura-exit` entrance into the Three.js exit transition. The 3D camera, story, exit runway, and fixed afterword use `lvh`, treating browser chrome as an overlay rather than resizing the scene. Its range is the exit section's measured height minus the measured exit-stage height, so progress reaches one at the real end of the available exit scroll without depending on dynamic browser viewport values. The exit section provides a black runway only; while archive 3D is active, the afterword uses fixed viewport positioning and remains hidden until `projectAfterword()` adds `.is-projecting`. This prevents the real page from appearing at the bottom before the projected exit page reaches it. After the 3D class changes DOM height, `ScrollTrigger.refresh()` runs on the next frame.

For reduced motion, the component immediately sets focus to the target, does not create pinned timelines, does not import the Three.js scene, and displays ordinary full-height DOM panels. This is the primary low-motion and non-WebGL path.

## Three.js Archive

`lib/archive_scene.js` is imported only after unlock or meaningful story progress. A cached promise prevents duplicate initialization. Success adds `.is-archive-3d`, synchronizes existing progress, and refreshes ScrollTrigger. Import, texture, renderer, or WebGL failures call the DOM fallback.

Renderer configuration:

- opaque WebGL renderer with `high-performance` preference;
- desktop antialiasing, disabled on mobile;
- pixel ratio capped at 1.5 desktop and 1.2 mobile;
- field of view 46 desktop and 55 mobile;
- dark exponential fog and sRGB output.

The scene contains an entry portal, two station groups, canvas-text labels, photo cards, a tunnel gallery, dust, wireframe fragments, and an invisible page plane used to project the real DOM afterword. Station and tunnel photo frames are sized to each source image's aspect ratio and render the complete image without crop; the frame dimensions are intentionally smaller than the original layout. Story progress follows camera stops through smooth interpolation and a damped spring. Desktop pointer movement contributes damped parallax.

Mobile is classified once at initialization with `(max-width: 767px)`. It remains a WebGL experience when motion is allowed, but loads only its focus, station-main, and final textures; it does not request satellite textures because it renders no satellite photos. It also uses lower particle/fragment/photo counts, lower pixel ratio, no antialiasing, and no pointer parallax. Crossing the breakpoint after scene creation does not rebuild the complexity profile.

The render loop pauses when the document is hidden, the scene leaves the observed viewport, the scene has completed its hidden post-unlock warm-up, or the DOM afterword has completely taken over at the exit. Entering the story resumes rendering; reverse exit scroll also resumes it before the projected afterword needs to animate again. Pause requests are idempotent, so repeated scroll updates do not reset the animation delta. ResizeObserver updates renderer size, camera aspect, portal crop, and exit geometry; portal crops are deferred while the portal is invisible and refreshed when it returns. Frame delta is capped after inactivity.

## Exit Projection

Near the exit, the camera turns around a corner and fragments gather toward a page-shaped plane. Exit scroll progress is a target value; the scene follows it with a damped velocity curve and snaps only once a terminal target is sufficiently close, preserving the gathering's inertial feel without delaying the settled DOM handoff. Its projected screen corners are sent to `AboutExperience`, which translates, independently scales, and fades the real fixed `.obscura-afterword` DOM element relative to its large viewport rect. The afterword is hidden while 3D is active until projection begins, then becomes visible through `.is-projecting`. Canvas fade-out also follows the scene's actual exit progress rather than the scroll target. At projection completion, `.is-exit-settled` clears the temporary transform and changes the final page to `dvh` so its important content tracks browser chrome; the preceding 3D exit remains `lvh`. On mobile, the final image frame is centered without its outer border or auxiliary image labels, and the red header block sits beside `NEHS` instead of the `HSINCHU` rail text. Pointer interaction is enabled only at near-complete projection. The WebGL plane itself remains invisible; it is geometric reference data.

## Fallback and Cleanup

Without `.is-archive-3d`, station articles and the exit page are normal, relative DOM sections. On scene failure or `webglcontextlost`, the controller destroys the scene and restores fallback classes; CSS removes the 3D runway height and fixed positioning. The exit runway is provided by `.obscura-exit` only for the 3D path, while reduced motion switches the stage back to normal flow. No context restoration is attempted.

The scene's `destroy()` cancels animation, disconnects intersection/resize observers, removes visibility and pointer listeners, traverses and disposes geometry/material/texture resources, and disposes the renderer. The React controller destroys it on normal `pagehide` and cleanup, but preserves it when `pagehide.persisted` indicates a bfcache entry. It also removes input, resize, pagehide, and context-loss listeners, cancels microprism work, reverts GSAP media, and removes the focus body lock.

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
