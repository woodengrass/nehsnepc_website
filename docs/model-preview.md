# 3D Model Preview

## Scope

This document covers GLB preview embedded in MDX articles through `components/mdx/Model3D.tsx`, its `@google/model-viewer` runtime, TypeScript custom-element declaration, and the source-to-optimized model pipeline. The unrelated Three.js About archive is documented in `about.md`.

## File Map

| Path | Responsibility |
| --- | --- |
| `components/mdx/Model3D.tsx` | Lazy client viewer, poster, states, interaction hint, caption |
| `components/mdx/index.ts` | Registers `Model3D` for MDX |
| `types/model-viewer.d.ts` | React JSX declaration for `<model-viewer>` attributes |
| `scripts/optimize_models.js` | glTF Transform, WebP texture processing, output generation |
| `public/models/src/*.glb` | Author/source files |
| `public/models/opt/*.glb` | Deployable output referenced by MDX |

The current source and output example is `DamagedHelmet.glb`. Published usage appears in `content/articles/3d-model-pipeline.mdx`; `darkroom-3d-tour.mdx` is a development-only draft usage.

## MDX API

```mdx
<Model3D
  src="/models/opt/DamagedHelmet.glb"
  alt="Required description of the model"
  poster="/images/generated/hero-1280.webp"
  caption="Optional visible caption"
  aspect="16 / 9"
  autoRotate={false}
  exposure={1.1}
  interactionPrompt="DRAG TO ROTATE / 拖曳旋轉"
/>
```

| Prop | Required/default | Behavior |
| --- | --- | --- |
| `src` | required | Passed to the custom element; convention is `/models/opt/<file>.glb` |
| `alt` | required | Accessible model description |
| `poster` | optional | Separate decorative image overlay until load; not the viewer's `poster` attribute |
| `caption` | optional | Semantic `figcaption` |
| `aspect` | `4 / 3` | Inline frame aspect ratio |
| `autoRotate` | `false` | Adds `auto-rotate` when true |
| `exposure` | `1` | Stringified model-viewer exposure |
| `interactionPrompt` | bilingual default | Bottom-right loading/interaction hint |

No current article supplies poster, custom aspect, auto-rotation, exposure, or prompt overrides.

## Loading Lifecycle

Initial state does not render `<model-viewer>` or import its runtime. An IntersectionObserver watches the frame with `rootMargin: 250px 0px`. On first intersection it sets `shouldLoad`, disconnects, renders the custom element, and dynamically imports `@google/model-viewer`. The custom element additionally uses `loading="lazy"`.

The runtime import relies on module side effects to register the custom element. Import rejection sets the common failure state. Element `load` removes poster/hint; element `error` displays `3D 預覽無法載入`. Pointer-down marks the frame as interacted and fades any element with `.model-hint`.

Known lifecycle defects to preserve awareness of during changes:

- the callback ref adds anonymous `load` and `error` listeners without removing them, so rerenders/reattachment can accumulate listeners;
- the error label also uses `.model-hint`, so prior interaction can make the error transparent;
- failure has no retry, download, static fallback, diagnostics, or live announcement;
- multiple viewers can each hold WebGL/GPU resources, with no explicit disposal API in this component.

## Viewer Configuration

The custom element receives `camera-controls`, neutral environment lighting, shadow intensity 1, configurable exposure, and optional auto-rotate. Both frame CSS and the element set `touch-action: pan-y`, preserving vertical scrolling while permitting viewer interaction. The component does not specify camera orbit/limits, field of view, reveal mode, rotation speed, or viewer-native poster behavior.

`types/model-viewer.d.ts` only makes the custom element legal in strict TSX and lists accepted attributes. It does not validate at runtime.

## Poster and Accessibility

The optional poster is an absolutely positioned native image with empty alt text because the model's required `alt` carries meaning. It remains present when runtime/model loading fails. Captions use semantic figure markup.

Current limitations:

- hint and error status are not live regions;
- there are no explicit keyboard instructions or static/download alternatives;
- `autoRotate` does not check `prefers-reduced-motion`;
- model-viewer/browser support determines actual keyboard operation;
- arbitrary model URLs are accepted, including external origins with CORS/privacy implications.

Always provide a meaningful model `alt`; provide a useful poster/fallback strategy for production exhibits; do not enable continuous rotation without reduced-motion behavior.

## Asset Pipeline

Add source files directly to `public/models/src/` and run:

```bash
npm run models:build
```

The ESM script creates `public/models/opt/`, processes direct `.glb` children (not recursively), preserves filenames, and reports source/output sizes. It registers glTF Transform extensions and Draco encoder/decoder dependencies, then applies:

```text
dedup()
prune()
resample()
textureCompress(target WebP, max 2048 x 2048, Sharp encoder)
```

It then creates `KHRDracoMeshCompression` and marks it required before writing output.

Important current discrepancy: the script does not call glTF Transform's `draco()` transform. Registering dependencies and marking the extension required is not by itself evidence that geometry was compressed. Validate generated files before claiming Draco compression, and add the explicit transform if compression is required. The script also reports but does not enforce file size, triangle count, texture memory, or the article's stated 2 MB goal.

If no source GLBs exist, the command exits successfully. It overwrites same-name outputs but does not remove stale outputs whose sources were deleted. `npm run build` does not invoke this pipeline.

## Production Workflow

1. Place an authored GLB in `public/models/src/`.
2. Check model provenance/licensing and simplify excessive geometry/textures before repository ingestion.
3. Run `npm run models:build`.
4. Verify the optimized output exists and inspect its actual extensions, geometry, textures, animation, and size.
5. Add a same-origin `/models/opt/...` MDX reference with useful `alt`, caption, and preferably a poster.
6. Test delayed loading, success, failure, touch scrolling, camera interaction, and narrow layout.
7. Run `npm run build` after generating assets.

## Performance and Security

The runtime stays out of shared bundles and begins loading only near a model. There are no responsive model variants or automated asset budgets. Complex/malformed GLBs can consume substantial browser CPU, memory, and GPU resources. Multiple instances multiply that cost.

Models in `public/` are publicly retrievable and have no access control. External `src` or poster values introduce CORS, tracking, reliability, and CSP concerns. Repository MDX is trusted; the component does not sanitize URLs or props.

## Test and Change Checklist

- Keep `Model3D` registered in `components/mdx/index.ts`.
- Verify no runtime/model request occurs before the 250px observer margin.
- Verify import failure and model error remain visible after pointer interaction.
- Test poster removal, caption, custom aspect, exposure, and explicit auto-rotate.
- Test touch scrolling and model rotation on iOS/Android.
- Test keyboard use, reduced motion, WebGL disabled, slow/offline network, and multiple instances.
- Check event-listener cleanup when changing refs/lifecycle.
- Inspect optimized files for actual Draco extension/compression and visual texture quality.
- Remove stale `public/models/opt/` files deliberately when sources are removed.
- Update this document for component props, states, model-viewer configuration, directories, transforms, budgets, or workflow changes.
